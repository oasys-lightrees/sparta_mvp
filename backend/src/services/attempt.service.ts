import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, reports } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * Return the report for an attempt, but only if it belongs to the current user.
 * Guest (unclaimed) attempts have a null user_id and are therefore denied until
 * claimed. 404 if the attempt/report is missing, 403 if owned by someone else.
 */
export const getReport = async (userId: string, attemptId: string) => {
  const [attempt] = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      totalScore: attempts.totalScore,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);

  if (!attempt) {
    throw new HttpError(404, 'Attempt not found');
  }
  if (attempt.userId !== userId) {
    throw new HttpError(403, 'You do not have access to this report');
  }

  const [report] = await db
    .select({ reportType: reports.reportType, content: reports.content })
    .from(reports)
    .where(eq(reports.attemptId, attemptId))
    .limit(1);

  if (!report) {
    throw new HttpError(404, 'Report not found');
  }

  return {
    attempt_id: attempt.id,
    score: attempt.totalScore,
    report: { type: report.reportType, content: report.content },
  };
};

/**
 * List the current user's completed attempts with their assessment and report.
 * Newest first. Used by the user dashboard.
 */
export const listMine = async (userId: string) => {
  return db
    .select({
      attempt_id: attempts.id,
      assessment_id: assessments.id,
      assessment_title: assessments.title,
      score: attempts.totalScore,
      created_at: attempts.createdAt,
      report_id: reports.id,
      report_type: reports.reportType,
      report_content: reports.content,
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .leftJoin(reports, eq(reports.attemptId, attempts.id))
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt));
};

/**
 * Claim a guest attempt for the current user (called after a guest logs in).
 * - unclaimed (user_id null)        -> assign to current user
 * - already owned by current user   -> no-op (idempotent)
 * - owned by a different user        -> 403
 * 404 if the attempt does not exist.
 */
export const claim = async (userId: string, attemptId: string) => {
  const [attempt] = await db
    .select({ id: attempts.id, userId: attempts.userId })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);

  if (!attempt) {
    throw new HttpError(404, 'Attempt not found');
  }
  if (attempt.userId && attempt.userId !== userId) {
    throw new HttpError(403, 'This attempt belongs to another user');
  }

  if (!attempt.userId) {
    await db
      .update(attempts)
      .set({ userId })
      .where(eq(attempts.id, attemptId));
  }

  return { attempt_id: attempt.id };
};
