import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessmentAccess,
  assessments,
  transactions,
  users,
} from '../db/schema';
import {
  normalizeMode,
  policyFor,
  type AccessMode,
} from '../config/access';
import { HttpError } from '../utils/http-error';

// A drizzle transaction handle (or the base db) — lets callers grant access
// inside their own transaction (e.g. voucher redemption).
type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Idempotently grant a user start-access to an assessment. Safe to call inside
 * an existing transaction; the unique (user, assessment) constraint means a
 * repeat grant is a no-op.
 */
export const grantAccess = async (
  tx: Db,
  userId: string,
  assessmentId: string,
  source: 'PAYMENT' | 'VOUCHER' | 'GRANT',
): Promise<void> => {
  await tx
    .insert(assessmentAccess)
    .values({ userId, assessmentId, source })
    .onConflictDoNothing({
      target: [assessmentAccess.userId, assessmentAccess.assessmentId],
    });
};

/** True if the user already holds a start-access grant for the assessment. */
export const hasGrant = async (
  userId: string,
  assessmentId: string,
): Promise<boolean> => {
  const [row] = await db
    .select({ id: assessmentAccess.id })
    .from(assessmentAccess)
    .where(
      and(
        eq(assessmentAccess.userId, userId),
        eq(assessmentAccess.assessmentId, assessmentId),
      ),
    )
    .limit(1);
  return Boolean(row);
};

type AssessmentAccessRow = {
  id: string;
  status: string;
  mentorId: string;
  accessMode: AccessMode | null;
  accessTokenCost: number;
  premiumTokenCost: number;
  price: number;
};

const loadAssessment = async (
  assessmentId: string,
): Promise<AssessmentAccessRow> => {
  const [row] = await db
    .select({
      id: assessments.id,
      status: assessments.status,
      mentorId: assessments.mentorId,
      accessMode: assessments.accessMode,
      accessTokenCost: assessments.accessTokenCost,
      premiumTokenCost: assessments.premiumTokenCost,
      price: assessments.price,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!row || row.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }
  return row as AssessmentAccessRow;
};

/**
 * Resolve the access state of an assessment for a given user (or anonymous when
 * userId is null). Everything the client needs to render the right CTA — the
 * mode, whether a grant/auth is required, the token cost, and whether THIS user
 * already has access — comes from here so no gating rule is duplicated on the
 * frontend.
 */
export const getAccessState = async (
  assessmentId: string,
  userId: string | null,
) => {
  const a = await loadAssessment(assessmentId);
  const mode = normalizeMode(a.accessMode);
  const policy = policyFor(mode);

  let hasAccess = !policy.startRequiresGrant;
  let tokenBalance: number | null = null;
  if (userId) {
    if (policy.startRequiresGrant) hasAccess = await hasGrant(userId, assessmentId);
    const [wallet] = await db
      .select({ balance: users.tokenBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    tokenBalance = wallet?.balance ?? null;
  }

  return {
    assessment_id: a.id,
    mode,
    start_requires_grant: policy.startRequiresGrant,
    requires_auth_to_start: policy.requiresAuthToStart,
    grant_via: policy.grantVia,
    premium_unlockable: policy.premiumUnlockable,
    access_token_cost: a.accessTokenCost,
    premium_token_cost: a.premiumTokenCost,
    price: a.price,
    has_access: hasAccess,
    token_balance: tokenBalance,
  };
};

/**
 * Backend authorization gate for STARTING an assessment (creating an attempt).
 * Enforces the mode's policy: gated modes require an authenticated user who
 * holds a grant. Ungated modes (FREE/FREEMIUM) always pass, including guests —
 * exactly the original behavior.
 */
export const assertCanStart = async (
  assessmentId: string,
  userId: string | null,
  mode: AccessMode | null,
): Promise<void> => {
  const policy = policyFor(mode);
  if (!policy.startRequiresGrant) return;
  if (!userId) {
    throw new HttpError(
      401,
      'Sign in and get access to start this assessment',
    );
  }
  const ok = await hasGrant(userId, assessmentId);
  if (!ok) {
    const how =
      policy.grantVia === 'voucher'
        ? 'Redeem a voucher to start this assessment'
        : 'Purchase access to start this assessment';
    throw new HttpError(403, how);
  }
};

/**
 * Purchase start-access to a PAID assessment using the token wallet (the same
 * wallet funded by Midtrans / the demo top-up). Idempotent: if the user already
 * has access, no charge is made. Debits access_token_cost tokens, records an
 * ACCESS_PURCHASE transaction crediting the mentor, and grants access — all in
 * one transaction.
 */
export const purchaseAccess = async (userId: string, assessmentId: string) => {
  const a = await loadAssessment(assessmentId);
  const mode = normalizeMode(a.accessMode);
  const policy = policyFor(mode);

  if (!policy.startRequiresGrant || policy.grantVia !== 'payment') {
    throw new HttpError(400, 'This assessment does not require payment to start');
  }

  if (await hasGrant(userId, assessmentId)) {
    return { charged: 0, already_purchased: true };
  }

  const cost = a.accessTokenCost;
  const [wallet] = await db
    .select({ balance: users.tokenBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!wallet) throw new HttpError(404, 'User not found');
  if (wallet.balance < cost) {
    throw new HttpError(400, 'Not enough tokens');
  }

  await db.transaction(async (tx) => {
    if (cost > 0) {
      await tx
        .update(users)
        .set({ tokenBalance: sql`${users.tokenBalance} - ${cost}` })
        .where(eq(users.id, userId));
      await tx.insert(transactions).values({
        userId,
        mentorId: a.mentorId,
        assessmentId: a.id,
        amount: cost,
        type: 'ACCESS_PURCHASE',
      });
    }
    await grantAccess(tx, userId, assessmentId, 'PAYMENT');
  });

  return { charged: cost, already_purchased: false };
};
