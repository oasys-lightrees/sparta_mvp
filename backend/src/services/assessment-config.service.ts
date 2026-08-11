import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { assessments, questions } from '../db/schema';
import { HttpError } from '../utils/http-error';
import {
  type AssessmentApp,
  defaultAssessmentApp,
  mergeAssessmentApp,
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

/** The assessment's current number of questions (relational source of truth). */
const countQuestions = async (assessmentId: string): Promise<number> => {
  const [q] = await db
    .select({ n: count() })
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId));
  return Number(q?.n ?? 0);
};

/**
 * Build a complete default config for an assessment from its own fields, so an
 * assessment with no saved config still renders as a finished product.
 */
const deriveDefault = async (row: AssessmentRow): Promise<AssessmentApp> =>
  defaultAssessmentApp({
    brandName: row.title,
    assessmentTitle: row.title,
    description: row.description,
    questionCount: await countQuestions(row.id),
  });

/**
 * The saved config, or a generated default when none is stored yet. Stored
 * configs are re-parsed so any newly-added fields are filled with their
 * defaults on read — existing documents stay valid with no migration.
 *
 * `questionCount` is derived data (the relational question count), not a
 * mentor-edited field, so it is always overwritten with the live count — a
 * stored config saved when the assessment had fewer questions never goes stale.
 */
const resolveConfig = async (row: AssessmentRow): Promise<AssessmentApp> => {
  if (!row.appConfig) return deriveDefault(row);
  const cfg = parseAssessmentApp(row.appConfig);
  const questionCount = await countQuestions(row.id);
  return {
    ...cfg,
    assessment: {
      ...cfg.assessment,
      meta: { ...cfg.assessment.meta, questionCount },
    },
  };
};

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

  // Server-owned provenance: bump the content revision and stamp timestamps
  // (never trusting client-supplied values for these).
  const now = new Date().toISOString();
  const stamped: AssessmentApp = {
    ...validated,
    createdAt: current.createdAt ?? now,
    updatedAt: now,
    configVersion: (current.configVersion ?? 0) + 1,
  };

  await db
    .update(assessments)
    .set({ appConfig: stamped })
    .where(eq(assessments.id, assessmentId));

  return stamped;
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
