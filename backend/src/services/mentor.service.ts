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
 * Visual analytics for the mentor dashboard charts.
 *
 *  - assessmentPerformance: attempts per assessment (bar)
 *  - revenueByDate:         tokens earned per day from premium unlocks (line)
 *  - scoreDistribution:     attempts bucketed Beginner/Intermediate/Advanced (pie)
 *  - conversionFunnel:      submissions -> premium unlocks (bar)
 *
 * Page views are not tracked, so the funnel starts at submissions.
 */
export const getAnalytics = async (mentorId: string) => {
  // 1. Attempts per assessment.
  const perfRows = await db
    .select({
      name: assessments.title,
      attempts: count(attempts.id),
    })
    .from(assessments)
    .leftJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .where(eq(assessments.mentorId, mentorId))
    .groupBy(assessments.id)
    .orderBy(desc(count(attempts.id)));

  const assessmentPerformance = perfRows.map((r) => ({
    name: r.name,
    attempts: Number(r.attempts),
  }));

  // 2. Token revenue per day (premium unlocks crediting this mentor).
  const dateExpr = sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`;
  const revRows = await db
    .select({
      date: dateExpr,
      tokens: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.mentorId, mentorId),
        eq(transactions.type, 'PREMIUM_UNLOCK'),
      ),
    )
    .groupBy(dateExpr)
    .orderBy(dateExpr);

  const revenueByDate = revRows.map((r) => ({
    date: r.date,
    tokens: Number(r.tokens),
  }));

  // 3. Score distribution by each assessment's own thresholds.
  const bandExpr = sql<string>`case
    when ${assessments.lowScoreThreshold} is not null and ${attempts.totalScore} <= ${assessments.lowScoreThreshold} then 'Beginner'
    when ${assessments.highScoreThreshold} is not null and ${attempts.totalScore} >= ${assessments.highScoreThreshold} then 'Advanced'
    else 'Intermediate' end`;
  const bandRows = await db
    .select({ band: bandExpr, value: count() })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .where(eq(assessments.mentorId, mentorId))
    .groupBy(bandExpr);

  const bandCounts: Record<string, number> = {};
  for (const row of bandRows) bandCounts[row.band] = Number(row.value);
  const scoreDistribution = ['Beginner', 'Intermediate', 'Advanced'].map(
    (name) => ({ name, value: bandCounts[name] ?? 0 }),
  );

  // 4. Conversion funnel: submissions -> premium unlocks.
  const submissions = assessmentPerformance.reduce(
    (sum, a) => sum + a.attempts,
    0,
  );
  const [unlockAgg] = await db
    .select({ value: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.mentorId, mentorId),
        eq(transactions.type, 'PREMIUM_UNLOCK'),
      ),
    );
  const conversionFunnel = [
    { stage: 'Submissions', value: submissions },
    { stage: 'Premium Unlocks', value: Number(unlockAgg?.value ?? 0) },
  ];

  return {
    assessmentPerformance,
    revenueByDate,
    scoreDistribution,
    conversionFunnel,
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
