import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as mentorService from '../services/mentor.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const mentor = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// GET /api/mentor/stats — aggregate analytics for the mentor dashboard
mentor.get('/stats', authMiddleware, requireRole('MENTOR'), async (c) => {
  try {
    const stats = await mentorService.getStats(c.get('user').id);
    return c.json(success(stats), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/mentor/revenue — token revenue from premium unlocks
mentor.get('/revenue', authMiddleware, requireRole('MENTOR'), async (c) => {
  try {
    const revenue = await mentorService.getRevenue(c.get('user').id);
    return c.json(success(revenue), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/mentor/analytics — chart data for the mentor dashboard
mentor.get('/analytics', authMiddleware, requireRole('MENTOR'), async (c) => {
  try {
    const analytics = await mentorService.getAnalytics(c.get('user').id);
    return c.json(success(analytics), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/mentor/assessments — the current mentor's assessments + attempt count
mentor.get('/assessments', authMiddleware, requireRole('MENTOR'), async (c) => {
  try {
    const list = await mentorService.listMyAssessments(c.get('user').id);
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/mentor/assessments/:id/results — attempt results (owner only)
mentor.get(
  '/assessments/:id/results',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    try {
      const results = await mentorService.getResults(c.get('user').id, id);
      return c.json(success(results), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default mentor;
