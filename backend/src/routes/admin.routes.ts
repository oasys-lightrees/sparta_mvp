import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv, type Role } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as adminService from '../services/admin.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const admin = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES: Role[] = ['USER', 'MENTOR', 'ADMIN'];

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// GET /api/admin/users
admin.get('/users', authMiddleware, requireRole('ADMIN'), async (c) => {
  try {
    const list = await adminService.listUsers();
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /api/admin/users/:id/role
admin.patch(
  '/users/:id/role',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid user id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !ROLES.includes(body.role)) {
      return c.json(error('role must be one of USER, MENTOR, ADMIN'), 400);
    }

    try {
      const updated = await adminService.changeUserRole(id, body.role);
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// PATCH /api/admin/users/:id/balance — grant balance (IDR) to a user
admin.patch(
  '/users/:id/balance',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid user id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !Number.isInteger(body.amount) || body.amount <= 0) {
      return c.json(error('amount must be a positive integer'), 400);
    }

    try {
      const updated = await adminService.grantBalance(id, body.amount);
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// GET /api/admin/stats
admin.get('/stats', authMiddleware, requireRole('ADMIN'), async (c) => {
  try {
    const stats = await adminService.getStats();
    return c.json(success(stats), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/admin/analytics — chart data for the admin dashboard
admin.get('/analytics', authMiddleware, requireRole('ADMIN'), async (c) => {
  try {
    const analytics = await adminService.getAnalytics();
    return c.json(success(analytics), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/admin/assessments — all assessments (moderation view)
admin.get('/assessments', authMiddleware, requireRole('ADMIN'), async (c) => {
  try {
    const list = await adminService.listAllAssessments();
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /api/admin/assessments/:id — update status, price and/or platform fee
admin.patch(
  '/assessments/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(error('Invalid request body'), 400);
    }
    if (
      body.status !== undefined &&
      body.status !== 'DRAFT' &&
      body.status !== 'PUBLISHED'
    ) {
      return c.json(error('status must be DRAFT or PUBLISHED'), 400);
    }
    if (
      body.price !== undefined &&
      (!Number.isInteger(body.price) || body.price < 0)
    ) {
      return c.json(error('price must be a non-negative integer'), 400);
    }
    if (
      body.platform_fee_percent !== undefined &&
      (!Number.isInteger(body.platform_fee_percent) ||
        body.platform_fee_percent < 0 ||
        body.platform_fee_percent > 100)
    ) {
      return c.json(
        error('platform_fee_percent must be an integer between 0 and 100'),
        400,
      );
    }
    if (
      body.status === undefined &&
      body.price === undefined &&
      body.platform_fee_percent === undefined
    ) {
      return c.json(error('Nothing to update'), 400);
    }

    try {
      const updated = await adminService.updateAssessment(id, {
        status: body.status,
        price: body.price,
        platformFeePercent: body.platform_fee_percent,
      });
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// DELETE /api/admin/assessments/:id — delete any assessment
admin.delete(
  '/assessments/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    try {
      await adminService.deleteAssessment(id);
      return c.json(success({ id }), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default admin;
