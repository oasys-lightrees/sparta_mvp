import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as configService from '../services/assessment-config.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

/**
 * Branded AssessmentApp config: the presentation/branding document the reusable
 * frontend renders from. Mounted at /api.
 *   GET   /api/assessments/:id/app-config          (public, PUBLISHED only)
 *   GET   /api/mentor/assessments/:id/app-config   (owner)
 *   PATCH /api/mentor/assessments/:id/app-config   (owner, deep-merge patch)
 *   POST  /api/mentor/assessments/:id/app-config/reset (owner)
 */
const config = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// Public: the config used to render an assessment's branded landing/app.
config.get('/assessments/:id/app-config', async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }
  try {
    const cfg = await configService.getPublicConfig(id);
    return c.json(success(cfg), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// Mentor: read the config for editing (any status, owner only).
config.get(
  '/mentor/assessments/:id/app-config',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    try {
      const cfg = await configService.getMentorConfig(c.get('user').id, id);
      return c.json(success(cfg), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// Mentor: update (deep-merge patch) the config.
config.patch(
  '/mentor/assessments/:id/app-config',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(error('Invalid request body'), 400);
    }
    try {
      const cfg = await configService.updateConfig(c.get('user').id, id, body);
      return c.json(success(cfg), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// Mentor: reset the config back to a generated default.
config.post(
  '/mentor/assessments/:id/app-config/reset',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }
    try {
      const cfg = await configService.resetConfig(c.get('user').id, id);
      return c.json(success(cfg), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default config;
