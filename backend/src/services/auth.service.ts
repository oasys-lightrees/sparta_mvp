import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { db } from '../db/client';
import { users } from '../db/schema';
import type { AuthUser, Role } from '../middleware/auth.middleware';
import { HttpError } from '../utils/http-error';

const SALT_ROUNDS = 10;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type SafeUser = { id: string; email: string; role: Role };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

const toSafeUser = (row: {
  id: string;
  email: string;
  role: Role;
}): SafeUser => ({
  id: row.id,
  email: row.email,
  role: row.role,
});

const signToken = (user: SafeUser): Promise<string> => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    secret,
  );
};

/**
 * Create a new account. New users always get the USER role.
 * Throws 409 if the email is already registered.
 */
export const register = async (input: RegisterInput): Promise<SafeUser> => {
  const email = input.email.toLowerCase().trim();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new HttpError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [created] = await db
    .insert(users)
    .values({
      name: input.name.trim(),
      email,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
    });

  return toSafeUser(created);
};

/**
 * Verify credentials and issue a JWT. Uses a single generic error for both
 * unknown email and wrong password to avoid user enumeration.
 */
export const login = async (
  input: LoginInput,
): Promise<{ token: string; user: SafeUser }> => {
  const email = input.email.toLowerCase().trim();

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!row) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, row.passwordHash);
  if (!valid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const user = toSafeUser(row);
  const token = await signToken(user);

  return { token, user };
};

/**
 * Fetch a user by id (used by /me to return a fresh role, not a stale token).
 */
export const getUserById = async (id: string): Promise<AuthUser> => {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'User not found');
  }

  return toSafeUser(row);
};
