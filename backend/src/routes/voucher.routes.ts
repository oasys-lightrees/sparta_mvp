import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as voucherService from '../services/voucher.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

/**
 * Company voucher system. Mounted at /api/vouchers.
 *   POST /api/vouchers/batches            — buy a batch (generate codes)
 *   GET  /api/vouchers/batches            — the buyer's batches + redeemed count
 *   GET  /api/vouchers/batches/:batchId   — batch detail: codes + analytics
 *   POST /api/vouchers/redeem             — redeem a code
 */
const voucher = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// Buy a voucher batch.
voucher.post('/batches', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.assessment_id !== 'string' || !UUID_REGEX.test(body.assessment_id)) {
    return c.json(error('A valid assessment_id is required'), 400);
  }
  if (typeof body.company_name !== 'string' || body.company_name.trim() === '') {
    return c.json(error('company_name is required'), 400);
  }
  if (!Number.isInteger(body.credits)) {
    return c.json(error('credits must be an integer'), 400);
  }

  try {
    const result = await voucherService.createBatch(c.get('user').id, {
      assessmentId: body.assessment_id,
      companyName: body.company_name,
      credits: body.credits,
    });
    return c.json(success(result), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// List the buyer's batches.
voucher.get('/batches', authMiddleware, async (c) => {
  try {
    const result = await voucherService.listBatches(c.get('user').id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// Batch detail (codes + analytics), owner only.
voucher.get('/batches/:batchId', authMiddleware, async (c) => {
  const id = c.req.param('batchId');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid batch id'), 400);
  }
  try {
    const result = await voucherService.getBatch(c.get('user').id, id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// Redeem a code.
voucher.post('/redeem', authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.code !== 'string' || body.code.trim() === '') {
    return c.json(error('A voucher code is required'), 400);
  }
  try {
    const result = await voucherService.redeem(c.get('user').id, body.code);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default voucher;
