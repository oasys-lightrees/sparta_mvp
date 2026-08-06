import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, reports } from '../db/schema';
import { resolveLearningResources } from '../config/learning-resources.schema';
import { normalizeMode } from '../config/access';
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
      categoryResult: attempts.categoryResult,
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
      low: assessments.lowScoreThreshold,
      high: assessments.highScoreThreshold,
      studyVideoUrl: assessments.studyVideoUrl,
      learningResources: assessments.learningResources,
      accessMode: assessments.accessMode,
    })
    .from(assessments)
    .where(eq(assessments.id, attempt.assessmentId))
    .limit(1);

  const level = levelFor(
    attempt.totalScore,
    assessment?.low ?? null,
    assessment?.high ?? null,
  );

  // The result "profile" keys the learning resources: for personality/diagnostic
  // attempts it's the winning result-category code; for skill attempts it's the
  // score level (Beginner/Intermediate/Advanced/Completed).
  const profileCode =
    attempt.categoryResult?.winner ??
    attempt.categoryResult?.dominant ??
    level;

  const mode = normalizeMode(assessment?.accessMode);

  // The paid premium report has been removed — anyone who reaches this result
  // gets the full deal, so all learning resources + the study video are shown.
  const resources = resolveLearningResources(
    assessment?.learningResources ?? null,
    { profileCode, premiumUnlocked: true },
  );

  // The result profile powers the personalized learning header. For personality
  // assessments it's the winning result category (code + name); null otherwise.
  const resultProfile = attempt.categoryResult
    ? {
        code: profileCode,
        name: attempt.categoryResult.dominantName ?? profileCode,
      }
    : null;

  return {
    attempt_id: attempt.id,
    score: attempt.totalScore,
    level,
    assessment_title: assessment?.title ?? null,
    access_mode: mode,
    result_profile: resultProfile,
    report_id: freeReport.id,
    report: { type: 'FREE' as const, content: freeReport.content },
    // The mentor's study video, shown alongside the result (no paywall).
    study_video_url: assessment?.studyVideoUrl ?? null,
    // Learning resources for this result — all of them, no premium gating.
    learning_resources: resources.items,
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
