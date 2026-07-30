import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { HttpError } from '../utils/http-error';

// Real token purchases (Midtrans) and the demo top-up live in payment.service.
export { topupDemo } from './payment.service';

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
