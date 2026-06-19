import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, reports, transactions, users } from '../db/schema';
import { HttpError } from '../utils/http-error';

// Placeholder premium content (no AI integration yet).
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
    })
    .from(assessments)
    .where(eq(assessments.id, attempt.assessmentId))
    .limit(1);
  if (!assessment) {
    throw new HttpError(404, 'Assessment not found');
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
        content: PREMIUM_CONTENT,
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
