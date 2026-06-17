import { count, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, users } from '../db/schema';
import type { Role } from '../middleware/auth.middleware';
import { HttpError } from '../utils/http-error';

/**
 * List all users (admin view).
 */
export const listUsers = async () => {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      created_at: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
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
 * Platform-wide counts for the admin dashboard.
 */
export const getStats = async () => {
  const [[userCount], [assessmentCount], [attemptCount]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(assessments),
    db.select({ value: count() }).from(attempts),
  ]);

  return {
    totalUsers: Number(userCount.value),
    totalAssessments: Number(assessmentCount.value),
    totalAttempts: Number(attemptCount.value),
  };
};
