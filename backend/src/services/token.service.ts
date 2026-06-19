import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { transactions, users } from '../db/schema';
import { HttpError } from '../utils/http-error';

/**
 * Current token balance for a user.
 */
export const getBalance = async (userId: string) => {
  const [row] = await db
    .select({ balance: users.tokenBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'User not found');
  }
  return { balance: row.balance };
};

/**
 * Dummy top-up: credit the user's wallet and record a TOKEN_TOPUP transaction.
 * No real payment is processed.
 */
export const topupDemo = async (userId: string, amount: number) => {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ tokenBalance: sql`${users.tokenBalance} + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ balance: users.tokenBalance });

    if (!updated) {
      throw new HttpError(404, 'User not found');
    }

    await tx
      .insert(transactions)
      .values({ userId, amount, type: 'TOKEN_TOPUP' });

    return { balance: updated.balance };
  });
};
