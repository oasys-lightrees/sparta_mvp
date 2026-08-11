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

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

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

/**
 * Handle a Midtrans payment notification (webhook). Verifies the signature,
 * then transitions the order and, on the first PAID transition, credits the
 * user's wallet exactly once. Idempotent against duplicate deliveries.
 */
export const handleNotification = async (
  n: MidtransNotification,
): Promise<{ order_id: string; status: string }> => {
  if (!verifySignature(n)) {
    throw new HttpError(401, 'Invalid signature');
  }
  const orderId = asString(n.order_id);
  if (!orderId) {
    throw new HttpError(400, 'Missing order_id');
  }

  const next = resolveStatus(n);

  const currentStatus = async (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ): Promise<string> => {
    const [order] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.orderId, orderId))
      .limit(1);
    if (!order) throw new HttpError(404, 'Order not found');
    return order.status;
  };

  return db.transaction(async (tx) => {
    // Non-actionable status (pending / authorize / refund …) — acknowledge.
    if (next === null) {
      return { order_id: orderId, status: await currentStatus(tx) };
    }

    if (next === 'PAID') {
      // Atomically claim the PAID transition. The `status != 'PAID'` guard +
      // RETURNING means a duplicate/replayed webhook credits AT MOST ONCE: the
      // second delivery matches 0 rows and is a no-op.
      const claimed = await tx
        .update(orders)
        .set({ status: 'PAID' })
        .where(and(eq(orders.orderId, orderId), ne(orders.status, 'PAID')))
        .returning({
          userId: orders.userId,
          amount: orders.amount,
        });
      if (claimed.length === 0) {
        // Either no such order, or it was already PAID (already credited).
        return { order_id: orderId, status: await currentStatus(tx) };
      }
      const { userId, amount } = claimed[0];
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${amount}` })
        .where(eq(users.id, userId));
      await tx.insert(transactions).values({
        userId,
        amount,
        type: 'TOPUP',
      });
      return { order_id: orderId, status: 'PAID' };
    }

    // FAILED / EXPIRED — set the terminal status, but never override a PAID order
    // (a late fail/expire after settlement is ignored).
    const updated = await tx
      .update(orders)
      .set({ status: next })
      .where(and(eq(orders.orderId, orderId), ne(orders.status, 'PAID')))
      .returning({ status: orders.status });
    if (updated.length === 0) {
      return { order_id: orderId, status: await currentStatus(tx) };
    }
    return { order_id: orderId, status: updated[0].status };
  });
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

  const [wallet] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    order_id: order.orderId,
    status: order.status,
    amount: order.amount,
    balance: wallet?.balance ?? 0,
  };
};
