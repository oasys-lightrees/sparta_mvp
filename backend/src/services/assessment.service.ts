import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type AssessmentStatus = 'DRAFT' | 'PUBLISHED';

export type CreateInput = {
  title: string;
  description?: string | null;
};

export type UpdateInput = {
  title?: string;
  description?: string | null;
};

const publicColumns = {
  id: assessments.id,
  title: assessments.title,
  description: assessments.description,
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
 * Public detail — only if PUBLISHED. Choice scores are never exposed here.
 * `questions` is returned as an empty array for now; it is hydrated once the
 * question feature is implemented (kept in the shape so the contract is stable).
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

  return { ...row, questions: [] as unknown[] };
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

  const values: Partial<{ title: string; description: string | null }> = {};
  if (input.title !== undefined) {
    values.title = input.title.trim();
  }
  if (input.description !== undefined) {
    values.description = input.description;
  }

  const [updated] = await db
    .update(assessments)
    .set(values)
    .where(eq(assessments.id, id))
    .returning({
      id: assessments.id,
      title: assessments.title,
      description: assessments.description,
      status: assessments.status,
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
