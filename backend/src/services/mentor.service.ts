import { count, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, users } from '../db/schema';
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
