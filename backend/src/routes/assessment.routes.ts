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

const isNullableString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'string';

const isNullableInt = (value: unknown): boolean =>
  value === undefined || value === null || Number.isInteger(value);

/**
 * Validate the optional report-config + price fields shared by create/update.
 * Returns an error message, or null when valid.
 */
const validateConfigFields = (body: Record<string, unknown>): string | null => {
  if (!isNullableString(body.free_report_text)) {
    return 'free_report_text must be a string';
  }
  if (!isNullableInt(body.low_score_threshold)) {
    return 'low_score_threshold must be an integer';
  }
  if (!isNullableInt(body.high_score_threshold)) {
    return 'high_score_threshold must be an integer';
  }
  if (
    typeof body.low_score_threshold === 'number' &&
    typeof body.high_score_threshold === 'number' &&
    body.low_score_threshold > body.high_score_threshold
  ) {
    return 'low_score_threshold must be <= high_score_threshold';
  }
  if (
    body.price !== undefined &&
    (!Number.isInteger(body.price) || (body.price as number) < 0)
  ) {
    return 'price must be a non-negative integer';
  }
  if (
    body.premium_token_cost !== undefined &&
    (!Number.isInteger(body.premium_token_cost) ||
      (body.premium_token_cost as number) < 0)
  ) {
    return 'premium_token_cost must be a non-negative integer';
  }
  if (!isNullableString(body.free_report_template)) {
    return 'free_report_template must be a string';
  }
  if (!isNullableString(body.premium_report_description)) {
    return 'premium_report_description must be a string';
  }
  if (!isNullableString(body.email_template)) {
    return 'email_template must be a string';
  }
  return null;
};

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
  const configError = validateConfigFields(body);
  if (configError) {
    return c.json(error(configError), 400);
  }

  try {
    const created = await assessmentService.create(c.get('user').id, {
      title: body.title,
      description: body.description,
      free_report_text: body.free_report_text,
      low_score_threshold: body.low_score_threshold,
      high_score_threshold: body.high_score_threshold,
      price: body.price,
      premium_token_cost: body.premium_token_cost,
      free_report_template: body.free_report_template,
      premium_report_description: body.premium_report_description,
      email_template: body.email_template,
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
  const configError = validateConfigFields(body);
  if (configError) {
    return c.json(error(configError), 400);
  }
  const updatableKeys = [
    'title',
    'description',
    'free_report_text',
    'low_score_threshold',
    'high_score_threshold',
    'price',
    'premium_token_cost',
    'free_report_template',
    'premium_report_description',
    'email_template',
  ];
  if (!updatableKeys.some((k) => body[k] !== undefined)) {
    return c.json(error('Nothing to update'), 400);
  }

  try {
    const updated = await assessmentService.update(c.get('user').id, id, {
      title: body.title,
      description: body.description,
      free_report_text: body.free_report_text,
      low_score_threshold: body.low_score_threshold,
      high_score_threshold: body.high_score_threshold,
      price: body.price,
      premium_token_cost: body.premium_token_cost,
      free_report_template: body.free_report_template,
      premium_report_description: body.premium_report_description,
      email_template: body.email_template,
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
