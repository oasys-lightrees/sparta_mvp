import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { orders, transactions, users } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * Midtrans balance top-up integration. Backend-only — the server key never
 * reaches the browser. Uses the Snap REST API directly (no SDK).
 *
 * The wallet holds IDR (whole rupiah) directly: there is no token/currency
 * conversion. The amount a user tops up is exactly the amount charged by
 * Midtrans and credited to their balance (1:1).
 *
 * Config (env only):
 *   MIDTRANS_SERVER_KEY    (required for real payments; absent -> demo fallback)
 *   MIDTRANS_CLIENT_KEY    (returned to the browser for the Snap widget)
 *   MIDTRANS_IS_PRODUCTION ('true' -> live endpoints; default sandbox)
 *
 * When MIDTRANS_SERVER_KEY is unset the platform degrades gracefully to the
 * demo top-up so local dev and the MVP demo keep working.
 */

const TIMEOUT_MS = 20_000;

export const isPaymentConfigured = (): boolean =>
  Boolean(process.env.MIDTRANS_SERVER_KEY);

const isProduction = (): boolean =>
  process.env.MIDTRANS_IS_PRODUCTION === 'true';

/**
 * Whether the no-gateway "demo credit" paths (immediate free balance) are
 * allowed. Enabled for local dev and the demo, but DISABLED in production so a
 * live deployment can never mint free balance — real top-ups must go through the
 * payment gateway. Production is signalled by MIDTRANS_IS_PRODUCTION=true.
 */
export const isDemoBillingAllowed = (): boolean => !isProduction();

const snapBaseUrl = (): string =>
  isProduction()
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';

// Core API (transaction status), a different host than the Snap endpoint.
const coreBaseUrl = (): string =>
  isProduction()
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';

// Origins the browser may be sent back to after payment (same allowlist as CORS).
const allowedOrigins = (): string[] =>
  (process.env.CORS_ORIGINS ?? 'https://lato.example.com,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Validate a caller-supplied post-payment return URL. Only http(s) URLs whose
 * origin is in the CORS allowlist are honored, so the finish redirect can never
 * point off-platform. Returns undefined (no override) otherwise.
 */
const resolveReturnUrl = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return allowedOrigins().includes(u.origin) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Public pricing info for the wallet UI: the currency and whether a real gateway
 * is configured (so the UI can show a charge vs. an instant demo credit).
 */
export const getPricing = () => ({
  currency: 'IDR',
  payment_configured: isPaymentConfigured(),
});

export type CreateOrderResult =
  | { mode: 'demo'; balance: number }
  | {
      mode: 'midtrans';
      order_id: string;
      token: string;
      redirect_url: string;
      client_key: string;
      amount: number;
    };

/**
 * Demo (no-gateway) top-up: credit the wallet immediately and record a TOPUP
 * transaction. Used directly by the legacy endpoint and as the fallback when
 * Midtrans is not configured. `amount` is IDR (whole rupiah).
 */
export const topupDemo = async (userId: string, amount: number) => {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ balance: users.balance });

    if (!updated) {
      throw new HttpError(404, 'User not found');
    }

    await tx.insert(transactions).values({ userId, amount, type: 'TOPUP' });
    return { balance: updated.balance };
  });
};

/**
 * Start a balance top-up. When Midtrans is configured, creates a PENDING order
 * and a Snap transaction, returning the redirect URL / token for the browser.
 * Otherwise falls back to an immediate demo credit. `amount` is IDR (whole
 * rupiah) — the amount charged and credited.
 */
export const createOrder = async (
  userId: string,
  amount: number,
  returnUrl?: string,
): Promise<CreateOrderResult> => {
  if (!isPaymentConfigured()) {
    // No gateway: credit immediately for local/demo, but never in production —
    // otherwise a live deployment would hand out free balance.
    if (!isDemoBillingAllowed()) {
      throw new HttpError(503, 'Payments are temporarily unavailable');
    }
    const { balance } = await topupDemo(userId, amount);
    return { mode: 'demo', balance };
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const orderId = `LATO-TOPUP-${randomUUID()}`;
  const finish = resolveReturnUrl(returnUrl);

  await db.insert(orders).values({ userId, orderId, amount });

  const serverKey = process.env.MIDTRANS_SERVER_KEY as string;
  const auth = Buffer.from(`${serverKey}:`).toString('base64');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${snapBaseUrl()}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        item_details: [
          {
            id: 'LATO_BALANCE',
            name: 'LATO balance top-up',
            price: amount,
            quantity: 1,
          },
        ],
        customer_details: {
          first_name: user.name ?? user.email.split('@')[0],
          email: user.email,
        },
        credit_card: { secure: true },
        // Return the browser to the page it started from (branded dashboard or
        // the platform wallet). Midtrans appends order_id to confirm on arrival.
        ...(finish ? { callbacks: { finish } } : {}),
      }),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => null)) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    } | null;

    if (!res.ok || !data?.token || !data?.redirect_url) {
      // Mark the order failed so it never lingers as PENDING.
      await db
        .update(orders)
        .set({ status: 'FAILED' })
        .where(eq(orders.orderId, orderId));
      const detail = data?.error_messages?.join(', ') ?? `status ${res.status}`;
      throw new HttpError(502, `Payment gateway error (${detail})`);
    }

    return {
      mode: 'midtrans',
      order_id: orderId,
      token: data.token,
      redirect_url: data.redirect_url,
      client_key: process.env.MIDTRANS_CLIENT_KEY ?? '',
      amount,
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HttpError(504, 'Payment gateway timed out');
    }
    throw new HttpError(502, 'Payment gateway request failed');
  } finally {
    clearTimeout(timer);
  }
};

// Midtrans notification payload (only the fields we rely on).
export type MidtransNotification = {
  order_id?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  signature_key?: unknown;
  transaction_status?: unknown;
  fraud_status?: unknown;
};

// Midtrans sends these fields as strings, but coerce numbers too so a payload
// that (unexpectedly) sends e.g. gross_amount as a number can't silently blank
// the signature input. Objects/null still stringify to '' (never a value).
const asString = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';

/**
 * Verify Midtrans' SHA-512 signature:
 *   sha512(order_id + status_code + gross_amount + server_key)
 * Guards the webhook, which is necessarily public (no auth header).
 */
const verifySignature = (n: MidtransNotification): boolean => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  const payload =
    asString(n.order_id) +
    asString(n.status_code) +
    asString(n.gross_amount) +
    serverKey;
  const expected = createHash('sha512').update(payload).digest('hex');
  return expected === asString(n.signature_key);
};

/**
 * Map Midtrans transaction_status/fraud_status to our order lifecycle.
 * Returns null for statuses we treat as "no change" (e.g. pending).
 */
const resolveStatus = (
  n: MidtransNotification,
): 'PAID' | 'FAILED' | 'EXPIRED' | null => {
  const status = asString(n.transaction_status);
  const fraud = asString(n.fraud_status);
  switch (status) {
    case 'capture':
      // Card flow: only an accepted capture counts as paid.
      return fraud === 'deny' ? 'FAILED' : 'PAID';
    case 'settlement':
      return 'PAID';
    case 'deny':
    case 'cancel':
      return 'FAILED';
    case 'expire':
      return 'EXPIRED';
    default:
      // 'pending', 'authorize', 'refund', etc. -> leave as-is.
      return null;
  }
};

/** The order's current stored status. Throws 404 if the order is gone. */
const readOrderStatus = async (orderId: string): Promise<string> => {
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.orderId, orderId))
    .limit(1);
  if (!order) throw new HttpError(404, 'Order not found');
  return order.status;
};

/**
 * Atomically claim the PAID transition and credit the wallet. The
 * `status != 'PAID'` guard + RETURNING means a replayed webhook OR a
 * return-redirect reconcile credits AT MOST ONCE — the loser matches 0 rows and
 * is a no-op. Returns 'PAID' when it credited, 'noop' when already paid/absent.
 */
const creditPaidOrder = async (orderId: string): Promise<'PAID' | 'noop'> =>
  db.transaction(async (tx) => {
    const claimed = await tx
      .update(orders)
      .set({ status: 'PAID' })
      .where(and(eq(orders.orderId, orderId), ne(orders.status, 'PAID')))
      .returning({ userId: orders.userId, amount: orders.amount });
    if (claimed.length === 0) return 'noop';
    const { userId, amount } = claimed[0];
    await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${amount}` })
      .where(eq(users.id, userId));
    await tx.insert(transactions).values({ userId, amount, type: 'TOPUP' });
    return 'PAID';
  });

/**
 * Apply a resolved Midtrans status to an order: credit on PAID, set the terminal
 * status on FAILED/EXPIRED (never overriding a PAID order), acknowledge on null.
 * Shared by the webhook and the return-redirect reconcile.
 */
const applyOrderStatus = async (
  orderId: string,
  next: 'PAID' | 'FAILED' | 'EXPIRED' | null,
): Promise<{ order_id: string; status: string }> => {
  if (next === null) {
    return { order_id: orderId, status: await readOrderStatus(orderId) };
  }
  if (next === 'PAID') {
    await creditPaidOrder(orderId);
    return { order_id: orderId, status: await readOrderStatus(orderId) };
  }
  const updated = await db
    .update(orders)
    .set({ status: next })
    .where(and(eq(orders.orderId, orderId), ne(orders.status, 'PAID')))
    .returning({ status: orders.status });
  if (updated.length === 0) {
    return { order_id: orderId, status: await readOrderStatus(orderId) };
  }
  return { order_id: orderId, status: updated[0].status };
};

/**
 * Query Midtrans' core API for one order's current transaction status. Used to
 * reconcile a PENDING order when the browser returns from the redirect but the
 * webhook hasn't arrived (common in the sandbox/simulator). Returns null on any
 * error so the caller degrades to the stored status.
 */
const fetchMidtransStatus = async (
  orderId: string,
): Promise<MidtransNotification | null> => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;
  const auth = Buffer.from(`${serverKey}:`).toString('base64');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${coreBaseUrl()}/${encodeURIComponent(orderId)}/status`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as MidtransNotification | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Handle a Midtrans payment notification (webhook). Verifies the signature,
 * then transitions the order and, on the first PAID transition, credits the
 * user's wallet exactly once. Idempotent against duplicate deliveries.
 */
export const handleNotification = async (
  n: MidtransNotification,
): Promise<{ order_id: string; status: string }> => {
  const orderId = asString(n.order_id);
  const txStatus = asString(n.transaction_status);
  const fraud = asString(n.fraud_status);
  if (!verifySignature(n)) {
    // The single most common cause of "webhook received but balance unchanged":
    // the MIDTRANS_SERVER_KEY on the server doesn't match the one that signed
    // the notification (wrong key, or sandbox key vs a production notification).
    console.warn(
      `[midtrans] signature mismatch order=${orderId} status=${txStatus} — check MIDTRANS_SERVER_KEY / MIDTRANS_IS_PRODUCTION match the account that sent it`,
    );
    throw new HttpError(401, 'Invalid signature');
  }
  if (!orderId) {
    throw new HttpError(400, 'Missing order_id');
  }
  const next = resolveStatus(n);
  console.info(
    `[midtrans] order=${orderId} transaction_status=${txStatus} fraud=${fraud} -> resolved=${next ?? 'no-change'}`,
  );
  return applyOrderStatus(orderId, next);
};

/**
 * Order status for the current user (used by the browser to confirm a top-up
 * after returning from the Midtrans redirect). 404 if it isn't the user's order.
 */
export const getOrderStatus = async (userId: string, orderId: string) => {
  const [order] = await db
    .select({
      orderId: orders.orderId,
      userId: orders.userId,
      amount: orders.amount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.orderId, orderId))
    .limit(1);

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'Order not found');
  }

  // Still pending on our side? The webhook may not have arrived (very common in
  // the sandbox/simulator, where Midtrans can't reach a local server). Ask
  // Midtrans directly and credit the wallet if it's actually paid — the same
  // idempotent PAID claim the webhook uses, so it can never double-credit.
  let status: string = order.status;
  if (status === 'PENDING' && isPaymentConfigured()) {
    const remote = await fetchMidtransStatus(orderId);
    if (remote) {
      const applied = await applyOrderStatus(orderId, resolveStatus(remote));
      status = applied.status;
    }
  }

  const [wallet] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    order_id: order.orderId,
    status,
    amount: order.amount,
    balance: wallet?.balance ?? 0,
  };
};
