import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const auth = new Hono<AppEnv>();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Maps a thrown HttpError to the error envelope; rethrows anything else so the
 * global onError handler returns a 500.
 */
const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// POST /api/auth/register (Public)
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || !isNonEmptyString(body.name)) {
    return c.json(error('Name is required'), 400);
  }
  if (!isNonEmptyString(body.email) || !EMAIL_REGEX.test(body.email)) {
    return c.json(error('A valid email is required'), 400);
  }
  if (
    !isNonEmptyString(body.password) ||
    body.password.length < MIN_PASSWORD_LENGTH
  ) {
    return c.json(
      error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
      400,
    );
  }

  try {
    const user = await authService.register({
      name: body.name,
      email: body.email,
      password: body.password,
    });
    return c.json(success(user), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/auth/login (Public)
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!isNonEmptyString(body?.email) || !isNonEmptyString(body?.password)) {
    return c.json(error('Email and password are required'), 400);
  }

  try {
    const result = await authService.login({
      email: body.email,
      password: body.password,
    });
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/auth/me (Authenticated)
auth.get('/me', authMiddleware, async (c) => {
  const { id } = c.get('user');

  try {
    const user = await authService.getUserById(id);
    return c.json(success(user), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default auth;
