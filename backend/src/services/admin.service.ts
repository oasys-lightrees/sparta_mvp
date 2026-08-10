import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, transactions, users } from '../db/schema';
import type { AssessmentStatus } from './assessment.service';
import type { Role } from '../middleware/auth.middleware';
import { HttpError } from '../utils/http-error';

/**
 * List all users (admin view), including their wallet balance (IDR).
 */
export const listUsers = async () => {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      balance: users.balance,
      created_at: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
};

/**
 * Grant balance (IDR) to a user and record an ADMIN_GRANT transaction. 404 if
 * missing.
 */
export const grantBalance = async (userId: string, amount: number) => {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ id: users.id, balance: users.balance });

    if (!updated) {
      throw new HttpError(404, 'User not found');
    }

    await tx
      .insert(transactions)
      .values({ userId, amount, type: 'ADMIN_GRANT' });

    return updated;
  });
};

/**
 * Change a user's role. 404 if the user does not exist.
 */
export const changeUserRole = async (userId: string, role: Role) => {
  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, role: users.role });

  if (!updated) {
    throw new HttpError(404, 'User not found');
  }

  return updated;
};

/**
 * Platform-wide counts + potential revenue for the admin dashboard.
 *
 * potentialRevenue is analytics-only: the sum of each completed attempt's
 * assessment price (no payments are processed in the MVP).
 */
export const getStats = async () => {
  const [[userCount], [assessmentCount], [attemptCount], [revenue]] =
    await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(assessments),
      db.select({ value: count() }).from(attempts),
      db
        .select({
          value: sql<string>`coalesce(sum(${assessments.price}), 0)`,
        })
        .from(attempts)
        .innerJoin(assessments, eq(attempts.assessmentId, assessments.id)),
    ]);

  return {
    totalUsers: Number(userCount.value),
    totalAssessments: Number(assessmentCount.value),
    totalAttempts: Number(attemptCount.value),
    potentialRevenue: Number(revenue.value),
  };
};

/**
 * Visual analytics for the admin dashboard charts.
 *
 *  - platformGrowth:   total users, experts and assessments (bar)
 *  - revenueOverview:  total transactions vs paid-access purchases (bar)
 *  - activityOverTime: submissions per day (line)
 */
export const getAnalytics = async () => {
  const [
    [userCount],
    [mentorCount],
    [assessmentCount],
    [txnCount],
    [accessCount],
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(eq(users.role, 'MENTOR')),
    db.select({ value: count() }).from(assessments),
    db.select({ value: count() }).from(transactions),
    db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.type, 'ACCESS_PURCHASE')),
  ]);

  const dateExpr = sql<string>`to_char(${attempts.createdAt}, 'YYYY-MM-DD')`;
  const activityRows = await db
    .select({ date: dateExpr, submissions: count() })
    .from(attempts)
    .groupBy(dateExpr)
    .orderBy(dateExpr);

  return {
    platformGrowth: [
      { name: 'Users', value: Number(userCount.value) },
      { name: 'Mentors', value: Number(mentorCount.value) },
      { name: 'Assessments', value: Number(assessmentCount.value) },
    ],
    revenueOverview: [
      { name: 'Transactions', value: Number(txnCount.value) },
      { name: 'Paid Unlocks', value: Number(accessCount.value) },
    ],
    activityOverTime: activityRows.map((r) => ({
      date: r.date,
      submissions: Number(r.submissions),
    })),
  };
};

/**
 * List every assessment (admin moderation view) with mentor email, status,
 * price and attempt count.
 */
export const listAllAssessments = async () => {
  const rows = await db
    .select({
      id: assessments.id,
      title: assessments.title,
      status: assessments.status,
      price: assessments.price,
      mentor_email: users.email,
      totalAttempts: count(attempts.id),
    })
    .from(assessments)
    .innerJoin(users, eq(assessments.mentorId, users.id))
    .leftJoin(attempts, eq(attempts.assessmentId, assessments.id))
    .groupBy(assessments.id, users.email)
    .orderBy(desc(assessments.createdAt));

  return rows.map((r) => ({ ...r, totalAttempts: Number(r.totalAttempts) }));
};

/**
 * Admin moderation: update an assessment's status and/or price. 404 if missing.
 */
export const updateAssessment = async (
  id: string,
  input: { status?: AssessmentStatus; price?: number },
) => {
  const values: Partial<{ status: AssessmentStatus; price: number }> = {};
  if (input.status !== undefined) values.status = input.status;
  if (input.price !== undefined) values.price = input.price;

  const [updated] = await db
    .update(assessments)
    .set(values)
    .where(eq(assessments.id, id))
    .returning({
      id: assessments.id,
      status: assessments.status,
      price: assessments.price,
    });

  if (!updated) {
    throw new HttpError(404, 'Assessment not found');
  }

  return updated;
};

/**
 * Admin moderation: delete any assessment (cascades). 404 if missing.
 */
export const deleteAssessment = async (id: string) => {
  const [existing] = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(eq(assessments.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'Assessment not found');
  }

  await db.delete(assessments).where(eq(assessments.id, id));
};
