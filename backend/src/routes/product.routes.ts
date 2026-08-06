import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as productService from '../services/product.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

/**
 * Products — a sellable 1:1 wrapper around an assessment, exposing its three
 * tiers. Mounted at /api/products.
 *   GET  /api/products/by-assessment/:assessmentId       — public (PUBLISHED only)
 *   GET  /api/products/mine                              — mentor's products
 *   GET  /api/products/mine/by-assessment/:assessmentId  — mentor's product (any status)
 *   POST /api/products/by-assessment/:assessmentId       — mentor create/update (upsert)
 *   DELETE /api/products/by-assessment/:assessmentId     — mentor delete
 */
const product = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// --- Public ---------------------------------------------------------------

// Published product tiers for a landing page. 200 with null when there is none.
product.get('/by-assessment/:assessmentId', async (c) => {
  const id = c.req.param('assessmentId');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }
  try {
    const result = await productService.getPublicForAssessment(id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// --- Mentor / Admin -------------------------------------------------------

product.get('/mine', authMiddleware, requireRole('MENTOR', 'ADMIN'), async (c) => {
  try {
    const result = await productService.listForMentor(c.get('user').id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

product.get(
  '/mine/by-assessment/:assessmentId',
  authMiddleware,
  requireRole('MENTOR', 'ADMIN'),
  async (c) => {
    const id = c.req.param('assessmentId');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    try {
      const user = c.get('user');
      const result = await productService.getForAssessment(id, {
        id: user.id,
        role: user.role,
      });
      return c.json(success(result), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

product.post(
  '/by-assessment/:assessmentId',
  authMiddleware,
  requireRole('MENTOR', 'ADMIN'),
  async (c) => {
    const id = c.req.param('assessmentId');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json(error('Invalid request body'), 400);
    }
    try {
      const user = c.get('user');
      const result = await productService.upsertForAssessment(
        { id: user.id, role: user.role },
        id,
        {
          name: body.name,
          description: body.description,
          status: body.status,
          tiers: body.tiers,
        },
      );
      return c.json(success(result), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

product.delete(
  '/by-assessment/:assessmentId',
  authMiddleware,
  requireRole('MENTOR', 'ADMIN'),
  async (c) => {
    const id = c.req.param('assessmentId');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    try {
      const user = c.get('user');
      await productService.removeForAssessment({ id: user.id, role: user.role }, id);
      return c.json(success({ assessment_id: id }), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default product;
