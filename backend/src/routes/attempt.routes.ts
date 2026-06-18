import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as attemptService from '../services/attempt.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const attempt = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// GET /api/attempts/me — the current user's completed attempts (authenticated)
attempt.get('/me', authMiddleware, async (c) => {
  try {
    const list = await attemptService.listMine(c.get('user').id);
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/attempts/:id/report — owner-only report access (authenticated)
attempt.get('/:id/report', authMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid attempt id'), 400);
  }

  try {
    const result = await attemptService.getReport(c.get('user').id, id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /api/attempts/:id/claim — claim a guest attempt after login (authenticated)
attempt.post('/:id/claim', authMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid attempt id'), 400);
  }

  try {
    const result = await attemptService.claim(c.get('user').id, id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default attempt;
