import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import * as reportService from '../services/report.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const report = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// POST /api/reports/:id/unlock — unlock the premium report (authenticated, owner)
report.post('/:id/unlock', authMiddleware, async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid report id'), 400);
  }

  try {
    const result = await reportService.unlockPremium(c.get('user').id, id);
    return c.json(success(result), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default report;
