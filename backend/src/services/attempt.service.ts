import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessmentAccess,
  assessments,
  attempts,
  products,
  reports,
  tierPurchases,
} from '../db/schema';
import type { ProductContentBlock } from '../db/schema';
import { resolveLearningResources } from '../config/learning-resources.schema';
import { normalizeMode, policyFor } from '../config/access';
import { hasGrant } from './access.service';
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

  // Result paywall: for gated modes (PAID/VOUCHER) the report is only revealed
  // once the taker holds an access grant (bought a tier / redeemed a voucher).
  // Ungated modes (FREE/FREEMIUM) are always unlocked. When locked we return a
  // minimal shape — no score, level or content — so the taker "sees nothing"
  // until they unlock. The unlock funnel drives them to a purchase.
  const gated = policyFor(mode).startRequiresGrant;
  const unlocked = !gated || (await hasGrant(userId, attempt.assessmentId));
  if (!unlocked) {
    return {
      attempt_id: attempt.id,
      locked: true as const,
      assessment_title: assessment?.title ?? null,
      access_mode: mode,
    };
  }

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

  // Bonus content the expert attached to the product's pricing tiers, delivered
  // here (never on the public landing) now that the buyer has finished. A gated
  // tier's (PAID/VOUCHER) content is only included when the user actually holds
  // an access grant for the assessment; open tiers (FREE/FREEMIUM) always show.
  const productContent = await resolveProductContent(
    userId,
    attempt.assessmentId,
  );

  return {
    attempt_id: attempt.id,
    locked: false as const,
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
    // Expert-authored bonus blocks unlocked by purchasing this product's tier.
    product_content: productContent,
  };
};

/**
 * Collect the bonus content the buyer is entitled to for an assessment's
 * product. Content lives per pricing tier. Each tier gates its own content:
 *  - FREE/FREEMIUM tiers show to anyone who finished;
 *  - PAID tiers show only when the user bought THAT specific tier;
 *  - VOUCHER tiers show when the user holds a voucher-sourced access grant.
 * Returns the blocks in tier order, then block order.
 */
const resolveProductContent = async (
  userId: string,
  assessmentId: string,
): Promise<ProductContentBlock[]> => {
  const [product] = await db
    .select({ tiers: products.tiers })
    .from(products)
    .where(eq(products.assessmentId, assessmentId))
    .limit(1);
  const tiers = product?.tiers ?? [];
  if (tiers.length === 0) return [];

  const purchasedRows = await db
    .select({ tierId: tierPurchases.tierId })
    .from(tierPurchases)
    .where(
      and(
        eq(tierPurchases.userId, userId),
        eq(tierPurchases.assessmentId, assessmentId),
      ),
    );
  const purchasedTierIds = new Set(purchasedRows.map((r) => r.tierId));

  const [voucherGrant] = await db
    .select({ id: assessmentAccess.id })
    .from(assessmentAccess)
    .where(
      and(
        eq(assessmentAccess.userId, userId),
        eq(assessmentAccess.assessmentId, assessmentId),
        eq(assessmentAccess.source, 'VOUCHER'),
      ),
    )
    .limit(1);
  const hasVoucherAccess = Boolean(voucherGrant);

  const entitled = (t: (typeof tiers)[number]): boolean => {
    if (t.kind === 'FREE' || t.kind === 'FREEMIUM') return true;
    if (t.kind === 'PAID') return purchasedTierIds.has(t.id);
    if (t.kind === 'VOUCHER') return hasVoucherAccess;
    return false;
  };

  return tiers
    .filter((t) => t.enabled)
    .filter(entitled)
    .flatMap((t) => t.content ?? []);
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
      score: attempts.totalScore,
      // Category-engine result (personality assessments); null for score-based.
      category_result: attempts.categoryResult,
      created_at: attempts.createdAt,
      report_id: reports.id,
      report_type: reports.reportType,
      report_content: reports.content,
      access_mode: assessments.accessMode,
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

  // Which of these assessments the user holds an access grant for — used to keep
  // gated (unpaid) results hidden in the history, mirroring the report paywall.
  const grantRows = await db
    .select({ assessmentId: assessmentAccess.assessmentId })
    .from(assessmentAccess)
    .where(eq(assessmentAccess.userId, userId));
  const grantedAssessments = new Set(grantRows.map((g) => g.assessmentId));

  return rows.map((r) => {
    const { category_result, access_mode, ...rest } = r;
    // A gated assessment's result stays locked until the user has a grant.
    const gated = policyFor(normalizeMode(access_mode)).startRequiresGrant;
    const locked = gated && !grantedAssessments.has(r.assessment_id);
    // Personality assessments resolve to a result category, not a score. Surface
    // the winning category so the dashboard can show it instead of a 0 score.
    const result_profile =
      !locked && category_result
        ? {
            code: category_result.dominant ?? '',
            name: category_result.dominantName ?? category_result.dominant ?? '',
          }
        : null;
    return {
      ...rest,
      // Withhold the score, result and report content while locked.
      score: locked ? 0 : rest.score,
      report_content: locked ? null : rest.report_content,
      locked,
      result_profile,
      premium_unlocked: premiumByAttempt.has(r.attempt_id),
      premium_content: locked ? null : premiumByAttempt.get(r.attempt_id) ?? null,
    };
  });
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
