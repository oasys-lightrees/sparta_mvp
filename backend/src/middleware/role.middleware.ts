import type { MiddlewareHandler } from 'hono';
import { error } from '../utils/response';
import type { AppEnv, Role } from './auth.middleware';

/**
 * Authorization guard. Must run AFTER authMiddleware (which attaches the user).
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * Example: app.use('/api/admin/*', authMiddleware, requireRole('ADMIN'))
 */
export const requireRole = (
  ...roles: Role[]
): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(error('Unauthorized'), 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(error('Forbidden'), 403);
    }

    await next();
  };
};
