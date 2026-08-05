import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { tokenOrders, transactions, users } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * Midtrans token-purchase integration. Backend-only — the server key never
 * reaches the browser. Uses the Snap REST API directly (no SDK), mirroring how
 * ai.service talks to OpenAI.
 *
 * Config (env only):
 *   MIDTRANS_SERVER_KEY   (required for real payments; absent -> demo fallback)
 *   MIDTRANS_CLIENT_KEY   (returned to the browser for the Snap widget)
 *   MIDTRANS_IS_PRODUCTION ('true' -> live endpoints; default sandbox)
 *   TOKEN_PRICE_IDR       (price of one token in IDR; default 1000)
 *
 * When MIDTRANS_SERVER_KEY is unset the platform degrades gracefully to the
 * demo top-up so local dev and the MVP demo keep working (same philosophy as
 * the AI/email features).
 */

const TIMEOUT_MS = 20_000;
const DEFAULT_TOKEN_PRICE_IDR = 1000;

export const isPaymentConfigured = (): boolean =>
  Boolean(process.env.MIDTRANS_SERVER_KEY);

const isProduction = (): boolean =>
  process.env.MIDTRANS_IS_PRODUCTION === 'true';

/**
 * Whether the no-gateway "demo credit" paths (immediate free tokens) are
 * allowed. Enabled for local dev and the demo, but DISABLED in production so a
 * live deployment can never mint free tokens — real purchases must go through
 * the payment gateway. Production is signalled by MIDTRANS_IS_PRODUCTION=true.
 */
export const isDemoBillingAllowed = (): boolean => !isProduction();

const snapBaseUrl = (): string =>
  isProduction()
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';

const tokenPriceIdr = (): number => {
  const raw = Number(process.env.TOKEN_PRICE_IDR);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : DEFAULT_TOKEN_PRICE_IDR;
};

export type CreateOrderResult =
  | { mode: 'demo'; balance: number }
  | {
      mode: 'midtrans';
      order_id: string;
      token: string;
      redirect_url: string;
      client_key: string;
      gross_amount: number;
    };

/**
 * Demo (no-gateway) top-up: credit the wallet immediately and record a
 * TOKEN_TOPUP transaction. Used directly by the legacy endpoint and as the
 * fallback when Midtrans is not configured.
 */
export const topupDemo = async (userId: string, amount: number) => {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ tokenBalance: sql`${users.tokenBalance} + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ balance: users.tokenBalance });

    if (!updated) {
      throw new HttpError(404, 'User not found');
    }

    await tx.insert(transactions).values({ userId, amount, type: 'TOKEN_TOPUP' });
    return { balance: updated.balance };
  });
};

/**
 * Start a token purchase. When Midtrans is configured, creates a PENDING order
 * and a Snap transaction, returning the redirect URL / token for the browser.
 * Otherwise falls back to an immediate demo credit.
 */
export const createTokenOrder = async (
  userId: string,
  tokenAmount: number,
): Promise<CreateOrderResult> => {
  if (!isPaymentConfigured()) {
    // No gateway: credit immediately for local/demo, but never in production —
    // otherwise a live deployment would hand out free tokens.
    if (!isDemoBillingAllowed()) {
      throw new HttpError(503, 'Payments are temporarily unavailable');
    }
    const { balance } = await topupDemo(userId, tokenAmount);
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

  const grossAmount = tokenAmount * tokenPriceIdr();
  const orderId = `LATO-TOKENS-${randomUUID()}`;

  await db.insert(tokenOrders).values({
    userId,
    orderId,
    tokenAmount,
    grossAmount,
  });

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
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        item_details: [
          {
            id: 'LATO_TOKENS',
            name: `${tokenAmount} LATO tokens`,
            price: tokenPriceIdr(),
            quantity: tokenAmount,
          },
        ],
        customer_details: {
          first_name: user.name ?? user.email.split('@')[0],
          email: user.email,
        },
        credit_card: { secure: true },
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
        .update(tokenOrders)
        .set({ status: 'FAILED' })
        .where(eq(tokenOrders.orderId, orderId));
      const detail = data?.error_messages?.join(', ') ?? `status ${res.status}`;
      throw new HttpError(502, `Payment gateway error (${detail})`);
    }

    return {
      mode: 'midtrans',
      order_id: orderId,
      token: data.token,
      redirect_url: data.redirect_url,
      client_key: process.env.MIDTRANS_CLIENT_KEY ?? '',
      gross_amount: grossAmount,
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

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        id: tokenOrders.id,
        userId: tokenOrders.userId,
        tokenAmount: tokenOrders.tokenAmount,
        status: tokenOrders.status,
      })
      .from(tokenOrders)
      .where(eq(tokenOrders.orderId, orderId))
      .limit(1);

    if (!order) {
      throw new HttpError(404, 'Order not found');
    }

    // Already settled or nothing actionable -> acknowledge without side effects.
    if (order.status === 'PAID' || next === null || next === order.status) {
      return { order_id: orderId, status: order.status };
    }

    await tx
      .update(tokenOrders)
      .set({ status: next })
      .where(eq(tokenOrders.id, order.id));

    // Credit the wallet only on the first PAID transition.
    if (next === 'PAID') {
      await tx
        .update(users)
        .set({ tokenBalance: sql`${users.tokenBalance} + ${order.tokenAmount}` })
        .where(eq(users.id, order.userId));

      await tx.insert(transactions).values({
        userId: order.userId,
        amount: order.tokenAmount,
        type: 'TOKEN_TOPUP',
      });
    }

    return { order_id: orderId, status: next };
  });
};

/**
 * Order status for the current user (used by the browser to confirm a purchase
 * after returning from the Midtrans redirect). 404 if it isn't the user's order.
 */
export const getOrderStatus = async (userId: string, orderId: string) => {
  const [order] = await db
    .select({
      orderId: tokenOrders.orderId,
      userId: tokenOrders.userId,
      tokenAmount: tokenOrders.tokenAmount,
      status: tokenOrders.status,
    })
    .from(tokenOrders)
    .where(eq(tokenOrders.orderId, orderId))
    .limit(1);

  if (!order || order.userId !== userId) {
    throw new HttpError(404, 'Order not found');
  }

  const [wallet] = await db
    .select({ balance: users.tokenBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    order_id: order.orderId,
    status: order.status,
    token_amount: order.tokenAmount,
    balance: wallet?.balance ?? 0,
  };
};
