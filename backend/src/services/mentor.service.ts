import { and, avg, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, transactions, users } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * List the mentor's own assessments with an attempt count.
 */
export const listMyAssessments = async (mentorId: string) => {
  const rows = await db
    .select({
      id: assessments.id,
      title: assessments.title,
      status: assessments.status,
      price: assessments.price,
      totalAttempts: count(attempts.id),
    })
    .from(assessments)
    .leftJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .where(eq(assessments.mentorId, mentorId))
    .groupBy(assessments.id)
    .orderBy(desc(assessments.createdAt));

  return rows.map((r) => ({ ...r, totalAttempts: Number(r.totalAttempts) }));
};

/**
 * Aggregate analytics for the mentor dashboard overview.
 */
export const getStats = async (mentorId: string) => {
  // Assessment counts by status (one grouped query).
  const statusRows = await db
    .select({ status: assessments.status, value: count() })
    .from(assessments)
    .where(eq(assessments.mentorId, mentorId))
    .groupBy(assessments.status);

  let publishedAssessments = 0;
  let draftAssessments = 0;
  for (const row of statusRows) {
    if (row.status === 'PUBLISHED') publishedAssessments = Number(row.value);
    else if (row.status === 'DRAFT') draftAssessments = Number(row.value);
  }

  // Attempt count + average score across all of the mentor's assessments.
  const [agg] = await db
    .select({
      total: count(attempts.id),
      average: avg(attempts.totalScore),
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .where(eq(assessments.mentorId, mentorId));

  const totalAttempts = Number(agg?.total ?? 0);
  const averageScore =
    agg?.average != null ? Math.round(Number(agg.average) * 10) / 10 : 0;

  return {
    totalAssessments: publishedAssessments + draftAssessments,
    publishedAssessments,
    draftAssessments,
    totalAttempts,
    averageScore,
  };
};

/**
 * Token revenue for the mentor: sum + count of PREMIUM_UNLOCK transactions
 * crediting this mentor, plus the recent unlock list.
 */
export const getRevenue = async (mentorId: string) => {
  const premiumFilter = and(
    eq(transactions.mentorId, mentorId),
    eq(transactions.type, 'PREMIUM_UNLOCK'),
  );

  const [agg] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      unlocks: count(transactions.id),
    })
    .from(transactions)
    .where(premiumFilter);

  const rows = await db
    .select({
      assessmentTitle: assessments.title,
      amount: transactions.amount,
      date: transactions.createdAt,
    })
    .from(transactions)
    .leftJoin(assessments, eq(transactions.assessmentId, assessments.id))
    .where(premiumFilter)
    .orderBy(desc(transactions.createdAt));

  return {
    totalRevenue: Number(agg?.total ?? 0),
    premiumUnlocks: Number(agg?.unlocks ?? 0),
    transactions: rows,
  };
};

/**
 * List attempt results for an assessment the mentor owns.
 * 404 if missing, 403 if owned by another mentor.
 * `email` is the registered user's email when logged in, else the guest email.
 */
export const getResults = async (mentorId: string, assessmentId: string) => {
  const [assessment] = await db
    .select({ mentorId: assessments.mentorId })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment) {
    throw new HttpError(404, 'Assessment not found');
  }
  if (assessment.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }

  const rows = await db
    .select({
      userEmail: users.email,
      guestEmail: attempts.guestEmail,
      score: attempts.totalScore,
      created_at: attempts.createdAt,
    })
    .from(attempts)
    .leftJoin(users, eq(attempts.userId, users.id))
    .where(eq(attempts.assessmentId, assessmentId))
    .orderBy(desc(attempts.createdAt));

  return rows.map((r) => ({
    email: r.userEmail ?? r.guestEmail,
    score: r.score,
    created_at: r.created_at,
  }));
};
