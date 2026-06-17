import type { MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import { error } from '../utils/response';

export type Role = 'USER' | 'MENTOR' | 'ADMIN';

/**
 * The authenticated principal attached to the request context by authMiddleware.
 */
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Shared Hono environment so handlers get a typed `c.get('user')`.
 */
export type AppEnv = {
  Variables: {
    user: AuthUser;
  };
};

/**
 * Verifies the `Authorization: Bearer <token>` header. On success attaches the
 * decoded principal to the context; otherwise responds 401.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return c.json(error('Unauthorized'), 401);
  }

  const token = header.slice('Bearer '.length).trim();

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  try {
    const payload = await verify(token, secret, 'HS256');
    c.set('user', {
      id: String(payload.sub),
      email: String(payload.email),
      role: payload.role as Role,
    });
  } catch {
    return c.json(error('Unauthorized'), 401);
  }

  await next();
};
