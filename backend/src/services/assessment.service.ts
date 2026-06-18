import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, choices, questions } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type AssessmentStatus = 'DRAFT' | 'PUBLISHED';

export type CreateInput = {
  title: string;
  description?: string | null;
  free_report_text?: string | null;
  low_score_threshold?: number | null;
  high_score_threshold?: number | null;
  price?: number;
};

export type UpdateInput = {
  title?: string;
  description?: string | null;
  free_report_text?: string | null;
  low_score_threshold?: number | null;
  high_score_threshold?: number | null;
  price?: number;
};

const publicColumns = {
  id: assessments.id,
  title: assessments.title,
  description: assessments.description,
  price: assessments.price,
};

/**
 * Fetch an assessment and assert the given mentor owns it.
 * Throws 404 if missing, 403 if owned by someone else.
 */
const getOwnedOrThrow = async (mentorId: string, id: string) => {
  const [row] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, id))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'Assessment not found');
  }
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }

  return row;
};

/**
 * Public list — only PUBLISHED assessments, no mentor/internal fields.
 */
export const listPublished = async () => {
  return db
    .select(publicColumns)
    .from(assessments)
    .where(eq(assessments.status, 'PUBLISHED'));
};

/**
 * Public detail — only if PUBLISHED. Returns the assessment with its questions
 * and choices for a user to take the test. Choice scores are NEVER exposed here.
 */
export const getPublishedById = async (id: string) => {
  const [row] = await db
    .select(publicColumns)
    .from(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.status, 'PUBLISHED')))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'Assessment not found');
  }

  const questionRows = await db
    .select({ id: questions.id, questionText: questions.questionText })
    .from(questions)
    .where(eq(questions.assessmentId, id))
    .orderBy(questions.createdAt);

  const questionIds = questionRows.map((q) => q.id);
  // Note: `score` is intentionally not selected — scores must stay private.
  const choiceRows = questionIds.length
    ? await db
        .select({
          id: choices.id,
          questionId: choices.questionId,
          choiceText: choices.choiceText,
        })
        .from(choices)
        .where(inArray(choices.questionId, questionIds))
    : [];

  const choicesByQuestion = new Map<string, { id: string; text: string }[]>();
  for (const ch of choiceRows) {
    const list = choicesByQuestion.get(ch.questionId) ?? [];
    list.push({ id: ch.id, text: ch.choiceText });
    choicesByQuestion.set(ch.questionId, list);
  }

  return {
    ...row,
    questions: questionRows.map((q) => ({
      id: q.id,
      question: q.questionText,
      choices: choicesByQuestion.get(q.id) ?? [],
    })),
  };
};

/**
 * Create a new assessment owned by the mentor. Always starts as DRAFT.
 */
export const create = async (mentorId: string, input: CreateInput) => {
  const [created] = await db
    .insert(assessments)
    .values({
      mentorId,
      title: input.title.trim(),
      description: input.description ?? null,
      freeReportText: input.free_report_text ?? null,
      lowScoreThreshold: input.low_score_threshold ?? null,
      highScoreThreshold: input.high_score_threshold ?? null,
      price: input.price ?? 0,
    })
    .returning({ id: assessments.id, status: assessments.status });

  return created;
};

/**
 * Update title/description. Mentor must own the assessment.
 */
export const update = async (
  mentorId: string,
  id: string,
  input: UpdateInput,
) => {
  await getOwnedOrThrow(mentorId, id);

  const values: Partial<{
    title: string;
    description: string | null;
    freeReportText: string | null;
    lowScoreThreshold: number | null;
    highScoreThreshold: number | null;
    price: number;
  }> = {};
  if (input.title !== undefined) values.title = input.title.trim();
  if (input.description !== undefined) values.description = input.description;
  if (input.free_report_text !== undefined)
    values.freeReportText = input.free_report_text;
  if (input.low_score_threshold !== undefined)
    values.lowScoreThreshold = input.low_score_threshold;
  if (input.high_score_threshold !== undefined)
    values.highScoreThreshold = input.high_score_threshold;
  if (input.price !== undefined) values.price = input.price;

  const [updated] = await db
    .update(assessments)
    .set(values)
    .where(eq(assessments.id, id))
    .returning({
      id: assessments.id,
      title: assessments.title,
      description: assessments.description,
      status: assessments.status,
      free_report_text: assessments.freeReportText,
      low_score_threshold: assessments.lowScoreThreshold,
      high_score_threshold: assessments.highScoreThreshold,
      price: assessments.price,
    });

  return updated;
};

/**
 * Delete an assessment (cascades to questions/choices/attempts/reports via FK).
 * Mentor must own the assessment.
 */
export const remove = async (mentorId: string, id: string) => {
  await getOwnedOrThrow(mentorId, id);
  await db.delete(assessments).where(eq(assessments.id, id));
};

/**
 * Set DRAFT/PUBLISHED status. Mentor must own the assessment.
 */
export const setStatus = async (
  mentorId: string,
  id: string,
  status: AssessmentStatus,
) => {
  await getOwnedOrThrow(mentorId, id);

  const [updated] = await db
    .update(assessments)
    .set({ status })
    .where(eq(assessments.id, id))
    .returning({ id: assessments.id, status: assessments.status });

  return updated;
};
