import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { assessments, questions } from '../db/schema';
import { HttpError } from '../utils/http-error';
import {
  type AssessmentApp,
  defaultAssessmentApp,
  mergeAssessmentApp,
  migrateAssessmentApp,
  parseAssessmentApp,
} from '../config/assessment-app.schema';

type AssessmentRow = {
  id: string;
  mentorId: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  description: string | null;
  appConfig: AssessmentApp | null;
};

const selectRow = {
  id: assessments.id,
  mentorId: assessments.mentorId,
  status: assessments.status,
  title: assessments.title,
  description: assessments.description,
  appConfig: assessments.appConfig,
};

const loadRow = async (assessmentId: string): Promise<AssessmentRow> => {
  const [row] = await db
    .select(selectRow)
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!row) {
    throw new HttpError(404, 'Assessment not found');
  }
  return row;
};

/**
 * Build a complete default config for an assessment from its own fields, so an
 * assessment with no saved config still renders as a finished product.
 */
const deriveDefault = async (row: AssessmentRow): Promise<AssessmentApp> => {
  const [q] = await db
    .select({ n: count() })
    .from(questions)
    .where(eq(questions.assessmentId, row.id));

  return defaultAssessmentApp({
    brandName: row.title,
    assessmentTitle: row.title,
    description: row.description,
    questionCount: Number(q?.n ?? 0),
  });
};

/**
 * The saved config (forward-migrated to the current schema version), or a
 * generated default when none is stored yet.
 */
const resolveConfig = async (row: AssessmentRow): Promise<AssessmentApp> =>
  row.appConfig ? migrateAssessmentApp(row.appConfig) : deriveDefault(row);

/**
 * Public config for the branded landing/app. Only PUBLISHED assessments are
 * exposed; secrets are never part of the config document.
 */
export const getPublicConfig = async (
  assessmentId: string,
): Promise<AssessmentApp> => {
  const row = await loadRow(assessmentId);
  if (row.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }
  return resolveConfig(row);
};

/** Mentor editing view: any status, owner only. */
export const getMentorConfig = async (
  mentorId: string,
  assessmentId: string,
): Promise<AssessmentApp> => {
  const row = await loadRow(assessmentId);
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }
  return resolveConfig(row);
};

const formatZodError = (err: z.ZodError): string => {
  const first = err.issues[0];
  if (!first) return 'Invalid configuration';
  const path = first.path.join('.');
  return path ? `${path}: ${first.message}` : first.message;
};

/**
 * Update an assessment's config. The `patch` is deep-merged onto the current
 * (saved or default) config so callers can send just the fields they changed;
 * the merged result is fully validated before it is persisted. Owner only.
 */
export const updateConfig = async (
  mentorId: string,
  assessmentId: string,
  patch: unknown,
): Promise<AssessmentApp> => {
  const row = await loadRow(assessmentId);
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new HttpError(400, 'Config must be an object');
  }

  const current = await resolveConfig(row);
  const merged = mergeAssessmentApp(current, patch);

  let validated: AssessmentApp;
  try {
    validated = parseAssessmentApp(merged);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new HttpError(400, formatZodError(err));
    }
    throw err;
  }

  await db
    .update(assessments)
    .set({ appConfig: validated })
    .where(eq(assessments.id, assessmentId));

  return validated;
};

/**
 * Reset an assessment's config back to a freshly generated default (owner only).
 */
export const resetConfig = async (
  mentorId: string,
  assessmentId: string,
): Promise<AssessmentApp> => {
  const row = await loadRow(assessmentId);
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }
  const fresh = await deriveDefault(row);
  await db
    .update(assessments)
    .set({ appConfig: fresh })
    .where(eq(assessments.id, assessmentId));
  return fresh;
};
