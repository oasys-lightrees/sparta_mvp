import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, reports } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * Map a score to a human level using the assessment's own thresholds, mirroring
 * the categories used when the FREE report is generated (submission.service).
 */
const levelFor = (
  score: number,
  low: number | null,
  high: number | null,
): string => {
  if (low === null || high === null) return 'Completed';
  if (score < low) return 'Beginner';
  if (score < high) return 'Intermediate';
  return 'Advanced';
};

/**
 * Return the FREE report for an attempt (only if it belongs to the current
 * user), plus premium availability/status. Guest (unclaimed) attempts have a
 * null user_id and are denied until claimed.
 */
export const getReport = async (userId: string, attemptId: string) => {
  const [attempt] = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      totalScore: attempts.totalScore,
      assessmentId: attempts.assessmentId,
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

  const [freeReport] = await db
    .select({ id: reports.id, content: reports.content })
    .from(reports)
    .where(
      and(eq(reports.attemptId, attemptId), eq(reports.reportType, 'FREE')),
    )
    .limit(1);

  if (!freeReport) {
    throw new HttpError(404, 'Report not found');
  }

  const [assessment] = await db
    .select({
      title: assessments.title,
      cost: assessments.premiumTokenCost,
      description: assessments.premiumReportDescription,
      low: assessments.lowScoreThreshold,
      high: assessments.highScoreThreshold,
    })
    .from(assessments)
    .where(eq(assessments.id, attempt.assessmentId))
    .limit(1);

  const [premium] = await db
    .select({ content: reports.content })
    .from(reports)
    .where(
      and(eq(reports.attemptId, attemptId), eq(reports.reportType, 'PREMIUM')),
    )
    .limit(1);

  return {
    attempt_id: attempt.id,
    score: attempt.totalScore,
    level: levelFor(
      attempt.totalScore,
      assessment?.low ?? null,
      assessment?.high ?? null,
    ),
    assessment_title: assessment?.title ?? null,
    report_id: freeReport.id,
    report: { type: 'FREE' as const, content: freeReport.content },
    premium: {
      cost: assessment?.cost ?? 0,
      description: assessment?.description ?? null,
      unlocked: Boolean(premium),
      content: premium?.content ?? null,
    },
  };
};

/**
 * List the current user's completed attempts with their (FREE) report, premium
 * cost and premium-unlock status. Newest first. Used by the user dashboard.
 */
export const listMine = async (userId: string) => {
  const rows = await db
    .select({
      attempt_id: attempts.id,
      assessment_id: assessments.id,
      assessment_title: assessments.title,
      premium_token_cost: assessments.premiumTokenCost,
      score: attempts.totalScore,
      created_at: attempts.createdAt,
      report_id: reports.id,
      report_type: reports.reportType,
      report_content: reports.content,
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    // Only the FREE report — premium status is resolved separately below.
    .leftJoin(
      reports,
      and(eq(reports.attemptId, attempts.id), eq(reports.reportType, 'FREE')),
    )
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.createdAt));

  const attemptIds = rows.map((r) => r.attempt_id);
  const premiumRows = attemptIds.length
    ? await db
        .select({ attemptId: reports.attemptId, content: reports.content })
        .from(reports)
        .where(
          and(
            inArray(reports.attemptId, attemptIds),
            eq(reports.reportType, 'PREMIUM'),
          ),
        )
    : [];
  const premiumByAttempt = new Map(
    premiumRows.map((p) => [p.attemptId, p.content]),
  );

  return rows.map((r) => ({
    ...r,
    premium_unlocked: premiumByAttempt.has(r.attempt_id),
    premium_content: premiumByAttempt.get(r.attempt_id) ?? null,
  }));
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
