import { and, eq, gte, sql } from 'drizzle-orm';
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
  accessCost: number;
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
      accessCost: assessments.accessCost,
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
 * mode, whether a grant/auth is required, the access cost, and whether THIS user
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
  let balance: number | null = null;
  if (userId) {
    if (policy.startRequiresGrant) hasAccess = await hasGrant(userId, assessmentId);
    const [wallet] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    balance = wallet?.balance ?? null;
  }

  return {
    assessment_id: a.id,
    mode,
    start_requires_grant: policy.startRequiresGrant,
    requires_auth_to_start: policy.requiresAuthToStart,
    grant_via: policy.grantVia,
    premium_unlockable: policy.premiumUnlockable,
    access_cost: a.accessCost,
    price: a.price,
    has_access: hasAccess,
    balance,
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
 * Purchase start-access to a PAID assessment using the wallet balance (the same
 * wallet funded by Midtrans / the demo top-up). Idempotent: if the user already
 * has access, no charge is made. Debits access_cost (IDR) from the balance,
 * records an ACCESS_PURCHASE transaction crediting the mentor, and grants access
 * — all in one transaction.
 */
export const purchaseAccess = async (userId: string, assessmentId: string) => {
  const a = await loadAssessment(assessmentId);
  const mode = normalizeMode(a.accessMode);
  const policy = policyFor(mode);

  if (!policy.startRequiresGrant || policy.grantVia !== 'payment') {
    throw new HttpError(400, 'This assessment does not require payment to start');
  }

  // Fast path: already purchased (also enforced atomically below).
  if (await hasGrant(userId, assessmentId)) {
    return { charged: 0, already_purchased: true };
  }

  const cost = a.accessCost;

  return db.transaction(async (tx) => {
    // Claim the grant atomically. The unique (user, assessment) constraint means
    // a concurrent double-purchase yields exactly one grant — the loser gets 0
    // rows back and is charged nothing.
    const granted = await tx
      .insert(assessmentAccess)
      .values({ userId, assessmentId, source: 'PAYMENT' })
      .onConflictDoNothing({
        target: [assessmentAccess.userId, assessmentAccess.assessmentId],
      })
      .returning({ id: assessmentAccess.id });
    if (granted.length === 0) {
      return { charged: 0, already_purchased: true };
    }

    if (cost > 0) {
      // Guarded debit: only succeeds when the balance covers the cost, so it can
      // never go negative. If it fails, the whole transaction (grant included)
      // rolls back, so access is never granted without a successful charge.
      const debited = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${cost}` })
        .where(and(eq(users.id, userId), gte(users.balance, cost)))
        .returning({ balance: users.balance });
      if (debited.length === 0) {
        throw new HttpError(400, 'Not enough balance');
      }
      await tx.insert(transactions).values({
        userId,
        mentorId: a.mentorId,
        assessmentId: a.id,
        amount: cost,
        type: 'ACCESS_PURCHASE',
      });
    }
    return { charged: cost, already_purchased: false };
  });
};
