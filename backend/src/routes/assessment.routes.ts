import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as assessmentService from '../services/assessment.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const assessment = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// --- Public ---------------------------------------------------------------

// GET /api/assessments — list PUBLISHED assessments
assessment.get('/', async (c) => {
  try {
    const list = await assessmentService.listPublished();
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/assessments/:id — PUBLISHED detail (no choice scores)
assessment.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }

  try {
    const detail = await assessmentService.getPublishedById(id);
    return c.json(success(detail), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// --- Mentor (authenticated, MENTOR role) ----------------------------------

// POST /api/assessments — create (starts as DRAFT)
assessment.post('/', authMiddleware, requireRole('MENTOR'), async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || !isNonEmptyString(body.title)) {
    return c.json(error('Title is required'), 400);
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return c.json(error('Description must be a string'), 400);
  }

  try {
    const created = await assessmentService.create(c.get('user').id, {
      title: body.title,
      description: body.description,
    });
    return c.json(success(created), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /api/assessments/:id — update title/description (owner only)
assessment.patch('/:id', authMiddleware, requireRole('MENTOR'), async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(error('Invalid request body'), 400);
  }
  if (body.title !== undefined && !isNonEmptyString(body.title)) {
    return c.json(error('Title must be a non-empty string'), 400);
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return c.json(error('Description must be a string'), 400);
  }
  if (body.title === undefined && body.description === undefined) {
    return c.json(error('Nothing to update'), 400);
  }

  try {
    const updated = await assessmentService.update(c.get('user').id, id, {
      title: body.title,
      description: body.description,
    });
    return c.json(success(updated), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// DELETE /api/assessments/:id — delete (owner only)
assessment.delete('/:id', authMiddleware, requireRole('MENTOR'), async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }

  try {
    await assessmentService.remove(c.get('user').id, id);
    return c.json(success({ id }), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /api/assessments/:id/status — set DRAFT/PUBLISHED (owner only)
assessment.patch(
  '/:id/status',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (body?.status !== 'DRAFT' && body?.status !== 'PUBLISHED') {
      return c.json(error('Status must be DRAFT or PUBLISHED'), 400);
    }

    try {
      const updated = await assessmentService.setStatus(
        c.get('user').id,
        id,
        body.status,
      );
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default assessment;
