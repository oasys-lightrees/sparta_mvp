import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import type { ChoiceInput } from '../services/question.service';
import * as questionService from '../services/question.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const question = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

type ChoiceValidation =
  | { ok: true; value: ChoiceInput[] }
  | { ok: false; message: string };

/**
 * Validate the `choices` payload shape. Requires a non-empty array where each
 * entry has a non-empty choice_text and an integer score.
 */
const validateChoices = (raw: unknown): ChoiceValidation => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, message: 'At least one choice is required' };
  }
  const value: ChoiceInput[] = [];
  for (const ch of raw) {
    if (!ch || !isNonEmptyString(ch.choice_text)) {
      return { ok: false, message: 'Each choice needs a non-empty choice_text' };
    }
    if (!Number.isInteger(ch.score)) {
      return { ok: false, message: 'Each choice needs an integer score' };
    }
    value.push({ choice_text: ch.choice_text, score: ch.score });
  }
  return { ok: true, value };
};

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// POST /api/assessments/:id/questions — add a question + choices (owner only)
question.post(
  '/assessments/:id/questions',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !isNonEmptyString(body.question_text)) {
      return c.json(error('question_text is required'), 400);
    }
    const choices = validateChoices(body.choices);
    if (!choices.ok) {
      return c.json(error(choices.message), 400);
    }

    try {
      const created = await questionService.addQuestion(c.get('user').id, id, {
        question_text: body.question_text,
        choices: choices.value,
      });
      return c.json(success(created), 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// PATCH /api/questions/:id — update text and/or replace choices (owner only)
question.patch(
  '/questions/:id',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid question id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(error('Invalid request body'), 400);
    }

    const hasText = body.question_text !== undefined;
    const hasChoices = body.choices !== undefined;
    if (!hasText && !hasChoices) {
      return c.json(error('Nothing to update'), 400);
    }
    if (hasText && !isNonEmptyString(body.question_text)) {
      return c.json(error('question_text must be a non-empty string'), 400);
    }

    let choicesValue: ChoiceInput[] | undefined;
    if (hasChoices) {
      const choices = validateChoices(body.choices);
      if (!choices.ok) {
        return c.json(error(choices.message), 400);
      }
      choicesValue = choices.value;
    }

    try {
      const updated = await questionService.updateQuestion(
        c.get('user').id,
        id,
        {
          question_text: hasText ? body.question_text : undefined,
          choices: choicesValue,
        },
      );
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// DELETE /api/questions/:id — delete a question (owner only; choices cascade)
question.delete(
  '/questions/:id',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid question id'), 400);
    }

    try {
      await questionService.deleteQuestion(c.get('user').id, id);
      return c.json(success({ id }), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// GET /api/mentor/assessments/:id — mentor editing view (assessment + questions
// + choices + scores). Owner only.
question.get(
  '/mentor/assessments/:id',
  authMiddleware,
  requireRole('MENTOR'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid assessment id'), 400);
    }

    try {
      const detail = await questionService.getMentorAssessmentDetail(
        c.get('user').id,
        id,
      );
      return c.json(success(detail), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default question;
