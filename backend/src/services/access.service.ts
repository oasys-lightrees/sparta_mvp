import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessmentAccess,
  assessments,
  products,
  tierPurchases,
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
 * Split a gross sale (IDR) into the platform's fee and the expert's net share.
 * The fee is floored so the expert never loses more than the configured percent
 * to rounding. `feePercent` is clamped to 0–100.
 */
export const splitEarnings = (gross: number, feePercent: number) => {
  const pct = Math.min(100, Math.max(0, feePercent));
  const fee = Math.floor((gross * pct) / 100);
  return { fee, expertShare: gross - fee };
};

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

/** The product pricing-tier ids the user has purchased for this assessment. */
export const listPurchasedTierIds = async (
  userId: string,
  assessmentId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ tierId: tierPurchases.tierId })
    .from(tierPurchases)
    .where(
      and(
        eq(tierPurchases.userId, userId),
        eq(tierPurchases.assessmentId, assessmentId),
      ),
    );
  return rows.map((r) => r.tierId);
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
  platformFeePercent: number;
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
      platformFeePercent: assessments.platformFeePercent,
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
  let purchasedTiers: string[] = [];
  if (userId) {
    if (policy.startRequiresGrant) hasAccess = await hasGrant(userId, assessmentId);
    const [wallet] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    balance = wallet?.balance ?? null;
    purchasedTiers = await listPurchasedTierIds(userId, assessmentId);
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
    // Product pricing-tier ids this user has already bought (each paid tier is
    // a separate purchase at its own price).
    purchased_tiers: purchasedTiers,
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
      // The platform keeps its fee; the rest is credited to the expert's wallet.
      const { expertShare } = splitEarnings(cost, a.platformFeePercent);
      if (expertShare > 0) {
        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${expertShare}` })
          .where(eq(users.id, a.mentorId));
      }
      await tx.insert(transactions).values({
        userId,
        mentorId: a.mentorId,
        assessmentId: a.id,
        amount: expertShare,
        type: 'ACCESS_PURCHASE',
      });
    }
    return { charged: cost, already_purchased: false };
  });
};

/**
 * Purchase a specific product pricing tier at its own price. Each paid tier is
 * an independent purchase: it charges that tier's amount, records a
 * tier_purchases row (unique per user/assessment/tier, so a repeat is a no-op),
 * grants the binary assessment access, and unlocks that tier's bonus content on
 * the result page. Credits the platform fee + expert share exactly like
 * purchaseAccess.
 */
export const purchaseTier = async (
  userId: string,
  assessmentId: string,
  tierId: string,
) => {
  const a = await loadAssessment(assessmentId);

  const [product] = await db
    .select({ tiers: products.tiers })
    .from(products)
    .where(eq(products.assessmentId, assessmentId))
    .limit(1);
  const tier = (product?.tiers ?? []).find((t) => t.id === tierId && t.enabled);
  if (!tier) {
    throw new HttpError(404, 'Pricing tier not found');
  }
  if (tier.kind !== 'PAID') {
    throw new HttpError(400, 'This tier is not purchasable');
  }
  const cost = tier.amount;

  // Fast path: already bought this tier (also enforced atomically below).
  const [existing] = await db
    .select({ id: tierPurchases.id })
    .from(tierPurchases)
    .where(
      and(
        eq(tierPurchases.userId, userId),
        eq(tierPurchases.assessmentId, assessmentId),
        eq(tierPurchases.tierId, tierId),
      ),
    )
    .limit(1);
  if (existing) {
    return { charged: 0, already_purchased: true, tier_id: tierId };
  }

  return db.transaction(async (tx) => {
    // Claim the tier purchase atomically; the loser of a concurrent double-buy
    // gets 0 rows and is charged nothing.
    const claimed = await tx
      .insert(tierPurchases)
      .values({ userId, assessmentId, tierId, amount: cost })
      .onConflictDoNothing({
        target: [
          tierPurchases.userId,
          tierPurchases.assessmentId,
          tierPurchases.tierId,
        ],
      })
      .returning({ id: tierPurchases.id });
    if (claimed.length === 0) {
      return { charged: 0, already_purchased: true, tier_id: tierId };
    }

    // Buying any paid tier grants the right to take the assessment (idempotent).
    await tx
      .insert(assessmentAccess)
      .values({ userId, assessmentId, source: 'PAYMENT' })
      .onConflictDoNothing({
        target: [assessmentAccess.userId, assessmentAccess.assessmentId],
      });

    if (cost > 0) {
      const debited = await tx
        .update(users)
        .set({ balance: sql`${users.balance} - ${cost}` })
        .where(and(eq(users.id, userId), gte(users.balance, cost)))
        .returning({ balance: users.balance });
      if (debited.length === 0) {
        throw new HttpError(400, 'Not enough balance');
      }
      const { expertShare } = splitEarnings(cost, a.platformFeePercent);
      if (expertShare > 0) {
        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${expertShare}` })
          .where(eq(users.id, a.mentorId));
      }
      await tx.insert(transactions).values({
        userId,
        mentorId: a.mentorId,
        assessmentId: a.id,
        amount: expertShare,
        type: 'ACCESS_PURCHASE',
      });
    }
    return { charged: cost, already_purchased: false, tier_id: tierId };
  });
};
