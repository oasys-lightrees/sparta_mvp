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

// GET /api/admin/stats
admin.get('/stats', authMiddleware, requireRole('ADMIN'), async (c) => {
  try {
    const stats = await adminService.getStats();
    return c.json(success(stats), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default admin;
