import { Hono, type Context } from 'hono';
import { verify } from 'hono/jwt';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import * as submissionService from '../services/submission.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const submission = new Hono();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleError = (c: Context, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

/**
 * Optional authentication for the public submit endpoint:
 *  - no Authorization header -> guest (returns null)
 *  - valid Bearer token      -> returns the user id
 *  - present but invalid     -> 401 (client clearly intended to authenticate)
 */
const getOptionalUserId = async (c: Context): Promise<string | null> => {
  const header = c.req.header('Authorization');
  if (!header) {
    return null;
  }
  if (!header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Invalid authorization header');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  try {
    const payload = await verify(header.slice('Bearer '.length).trim(), secret, 'HS256');
    return String(payload.sub);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
};

// POST /api/assessments/:id/submit (Public; attaches user_id if a JWT is sent)
submission.post('/:id/submit', async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid assessment id'), 400);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(error('Invalid request body'), 400);
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return c.json(error('answers must be a non-empty array'), 400);
  }
  for (const ans of body.answers) {
    if (
      !ans ||
      !UUID_REGEX.test(ans.question_id) ||
      !UUID_REGEX.test(ans.choice_id)
    ) {
      return c.json(
        error('Each answer needs a valid question_id and choice_id'),
        400,
      );
    }
  }

  if (
    body.guest_email !== undefined &&
    body.guest_email !== null &&
    (typeof body.guest_email !== 'string' || !EMAIL_REGEX.test(body.guest_email))
  ) {
    return c.json(error('guest_email must be a valid email'), 400);
  }

  try {
    const userId = await getOptionalUserId(c);

    const { attemptId } = await submissionService.submit(id, {
      userId,
      // Authenticated users are recorded by user_id; guest_email is ignored.
      guestEmail: userId ? null : (body.guest_email ?? null),
      answers: body.answers.map((a: { question_id: string; choice_id: string }) => ({
        question_id: a.question_id,
        choice_id: a.choice_id,
      })),
    });

    // The report is stored but gated: the user must authenticate (and claim a
    // guest attempt) before retrieving it via GET /api/attempts/:id/report.
    return c.json(success({ attempt_id: attemptId, requires_auth: true }), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

export default submission;
