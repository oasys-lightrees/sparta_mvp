import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessments,
  attempts,
  questions,
  reports,
  transactions,
  users,
} from '../db/schema';
import { normalizeMode, policyFor } from '../config/access';
import { HttpError } from '../utils/http-error';
import * as aiService from './ai.service';

// Fallback used when AI is disabled/unconfigured or generation fails.
const PREMIUM_CONTENT = 'Premium AI analysis coming soon';

/**
 * Unlock the premium report for the FREE report identified by `reportId`.
 * - the caller must own the attempt the report belongs to
 * - costs the assessment's premium_token_cost (400 if balance is insufficient)
 * - idempotent: if a premium report already exists it is returned, no charge
 *
 * On success (single transaction): debit the user, insert the PREMIUM report,
 * and record a PREMIUM_UNLOCK transaction crediting the assessment's mentor.
 */
export const unlockPremium = async (userId: string, reportId: string) => {
  const [report] = await db
    .select({ id: reports.id, attemptId: reports.attemptId })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  if (!report) {
    throw new HttpError(404, 'Report not found');
  }

  const [attempt] = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      assessmentId: attempts.assessmentId,
      totalScore: attempts.totalScore,
      answersSnapshot: attempts.answersSnapshot,
      categoryResult: attempts.categoryResult,
      reportLanguage: attempts.reportLanguage,
    })
    .from(attempts)
    .where(eq(attempts.id, report.attemptId))
    .limit(1);
  if (!attempt) {
    throw new HttpError(404, 'Attempt not found');
  }
  if (attempt.userId !== userId) {
    throw new HttpError(403, 'You do not have access to this report');
  }

  const [assessment] = await db
    .select({
      id: assessments.id,
      mentorId: assessments.mentorId,
      cost: assessments.premiumTokenCost,
      title: assessments.title,
      baseKnowledge: assessments.baseKnowledge,
      aiEnabled: assessments.aiEnabled,
      lowScoreThreshold: assessments.lowScoreThreshold,
      highScoreThreshold: assessments.highScoreThreshold,
      accessMode: assessments.accessMode,
    })
    .from(assessments)
    .where(eq(assessments.id, attempt.assessmentId))
    .limit(1);
  if (!assessment) {
    throw new HttpError(404, 'Assessment not found');
  }

  // Only FREEMIUM assessments have a separate premium unlock. In the other
  // modes the result is either fully free or already paid for at the door, so
  // there is nothing to unlock here.
  if (!policyFor(normalizeMode(assessment.accessMode)).premiumUnlockable) {
    throw new HttpError(400, 'This assessment has no premium report to unlock');
  }

  // Already unlocked -> return the existing premium report (no charge).
  const [existing] = await db
    .select({ id: reports.id, content: reports.content })
    .from(reports)
    .where(
      and(eq(reports.attemptId, attempt.id), eq(reports.reportType, 'PREMIUM')),
    )
    .limit(1);
  if (existing) {
    return {
      report_id: existing.id,
      type: 'PREMIUM' as const,
      content: existing.content,
      charged: 0,
      already_unlocked: true,
    };
  }

  const cost = assessment.cost;
  const [wallet] = await db
    .select({ balance: users.tokenBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!wallet) {
    throw new HttpError(404, 'User not found');
  }
  if (wallet.balance < cost) {
    throw new HttpError(400, 'Not enough tokens');
  }

  // Generate the premium content BEFORE the transaction (a long AI call should
  // not hold a DB transaction). AI is used only when the assessment opts in and
  // a key is configured; any failure falls back to the placeholder so the
  // unlock (and token accounting) always completes.
  let content = PREMIUM_CONTENT;
  if (assessment.aiEnabled && aiService.isAiConfigured()) {
    try {
      const [free] = await db
        .select({ content: reports.content })
        .from(reports)
        .where(
          and(
            eq(reports.attemptId, attempt.id),
            eq(reports.reportType, 'FREE'),
          ),
        )
        .limit(1);
      const questionRows = await db
        .select({ text: questions.questionText })
        .from(questions)
        .where(eq(questions.assessmentId, assessment.id));

      // Category (diagnostic/personality) engine: when the attempt captured a
      // category result, build a personality-style report from it — no
      // correct/wrong language.
      const language = (attempt.reportLanguage as 'en' | 'id') ?? 'en';
      const cr = attempt.categoryResult;
      if (cr) {
        const distribution = Object.keys(cr.categories)
          .sort()
          .map((label) => ({
            label,
            name: cr.categories[label]?.name ?? `Result ${label}`,
            pct:
              cr.total > 0
                ? Math.round(((cr.distribution[label] ?? 0) / cr.total) * 100)
                : 0,
          }));
        content = await aiService.generatePremiumReport({
          title: assessment.title,
          baseKnowledge: assessment.baseKnowledge,
          score: attempt.totalScore,
          freeReport: free?.content ?? '',
          questions: questionRows.map((q) => q.text),
          language,
          categoryContext: {
            dominantName: cr.dominantName,
            dominantKnowledge: cr.categories[cr.dominant]?.knowledge ?? '',
            distribution,
          },
        });
      } else {
        // Exam engine: derive the level from the assessment's own thresholds.
        const { low, high } = {
          low: assessment.lowScoreThreshold,
          high: assessment.highScoreThreshold,
        };
        const category =
          low === null || high === null
            ? null
            : attempt.totalScore < low
              ? 'Beginner'
              : attempt.totalScore < high
                ? 'Intermediate'
                : 'Advanced';

        content = await aiService.generatePremiumReport({
          title: assessment.title,
          baseKnowledge: assessment.baseKnowledge,
          score: attempt.totalScore,
          category,
          freeReport: free?.content ?? '',
          questions: questionRows.map((q) => q.text),
          language,
          // Per-question evidence (null for attempts created before this feature
          // -> AI falls back to a score-only report).
          answers: attempt.answersSnapshot ?? null,
        });
      }
    } catch (err) {
      console.error('[ai] premium report generation failed, using fallback:', err);
      content = PREMIUM_CONTENT;
    }
  }

  return db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ tokenBalance: sql`${users.tokenBalance} - ${cost}` })
      .where(eq(users.id, userId));

    const [premium] = await tx
      .insert(reports)
      .values({
        attemptId: attempt.id,
        reportType: 'PREMIUM',
        content,
      })
      .returning({ id: reports.id, content: reports.content });

    await tx.insert(transactions).values({
      userId,
      mentorId: assessment.mentorId,
      assessmentId: assessment.id,
      reportId: premium.id,
      amount: cost,
      type: 'PREMIUM_UNLOCK',
    });

    return {
      report_id: premium.id,
      type: 'PREMIUM' as const,
      content: premium.content,
      charged: cost,
      already_unlocked: false,
    };
  });
};
