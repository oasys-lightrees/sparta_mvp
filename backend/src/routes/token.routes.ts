import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as tokenService from '../services/token.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const token = new Hono<AppEnv>();

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// GET /api/tokens/me — current balance
token.get('/me', authMiddleware, async (c) => {
  try {
    const result = await tokenService.getBalance(c.get('user').id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/tokens/topup-demo — dummy top-up (no payment gateway)
token.post('/topup-demo', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Number.isInteger(body.amount) || body.amount <= 0) {
    return c.json(error('amount must be a positive integer'), 400);
  }

  try {
    const result = await tokenService.topupDemo(c.get('user').id, body.amount);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default token;
