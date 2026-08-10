import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as paymentService from '../services/payment.service';
import * as balanceService from '../services/balance.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const balance = new Hono<AppEnv>();

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// GET /api/balance/pricing — currency + whether the gateway is live. Drives the
// wallet top-up dialog (charge display / demo-mode copy).
balance.get('/pricing', authMiddleware, (c) => {
  return c.json(success(paymentService.getPricing()), 200);
});

// GET /api/balance/me — current wallet balance (IDR).
balance.get('/me', authMiddleware, async (c) => {
  try {
    const result = await balanceService.getBalance(c.get('user').id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/balance/purchase — start a real (Midtrans) top-up. Returns a Snap
// redirect URL/token, or falls back to an immediate demo credit when the gateway
// is not configured (see payment.service). `amount` is IDR (whole rupiah).
balance.post('/purchase', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Number.isInteger(body.amount) || body.amount <= 0) {
    return c.json(error('amount must be a positive integer'), 400);
  }

  try {
    const result = await paymentService.createOrder(
      c.get('user').id,
      body.amount,
    );
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/balance/orders/:orderId — poll an order's status after returning from
// the Midtrans redirect (owner only).
balance.get('/orders/:orderId', authMiddleware, async (c) => {
  try {
    const result = await paymentService.getOrderStatus(
      c.get('user').id,
      c.req.param('orderId'),
    );
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/balance/midtrans/notification — Midtrans server-to-server webhook.
// Public by necessity; the SHA-512 signature is verified in the service. Credits
// the wallet exactly once on the first PAID transition.
balance.post('/midtrans/notification', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(error('Invalid notification body'), 400);
  }

  try {
    const result = await paymentService.handleNotification(body);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/balance/topup-demo — dummy top-up (no payment gateway). Kept for
// local dev / the MVP demo, and DISABLED in production (MIDTRANS_IS_PRODUCTION=
// true) so a live deployment can never mint free balance.
balance.post('/topup-demo', authMiddleware, async (c) => {
  if (!paymentService.isDemoBillingAllowed()) {
    return c.json(error('Demo top-up is disabled'), 403);
  }
  const body = await c.req.json().catch(() => null);
  if (!body || !Number.isInteger(body.amount) || body.amount <= 0) {
    return c.json(error('amount must be a positive integer'), 400);
  }

  try {
    const result = await balanceService.topupDemo(c.get('user').id, body.amount);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default balance;
