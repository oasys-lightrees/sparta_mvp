import { randomInt } from 'node:crypto';
import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessments,
  attempts,
  products,
  transactions,
  users,
  voucherBatches,
  vouchers,
} from '../db/schema';
import { normalizeMode, policyFor } from '../config/access';
import { grantAccess } from './access.service';
import { HttpError } from '../utils/http-error';

const MAX_CREDITS = 1000;
// Unambiguous alphabet (no I/O/0/1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A code like ABCD-EF23-GH45. */
const generateCode = (): string => {
  const group = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${group()}-${group()}-${group()}`;
};

export type CreateBatchInput = {
  assessmentId: string;
  companyName: string;
  packageId: string;
};

/**
 * Purchase a voucher batch by buying one of the assessment product's seat
 * packages. Charges the buyer's token wallet the package's `tokenCost` (guarded,
 * so it can never go negative) and issues `seats` unique voucher codes — all in
 * one transaction. Redeeming a code only grants start-access (no tokens are
 * minted), so this is a straightforward token spend, safe in production.
 */
export const createBatch = async (buyerId: string, input: CreateBatchInput) => {
  const companyName = input.companyName.trim();
  if (!companyName) {
    throw new HttpError(400, 'companyName is required');
  }

  const [assessment] = await db
    .select({
      id: assessments.id,
      status: assessments.status,
      title: assessments.title,
      mentorId: assessments.mentorId,
    })
    .from(assessments)
    .where(eq(assessments.id, input.assessmentId))
    .limit(1);
  if (!assessment || assessment.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }

  // Seat packages (and their token prices) are defined by the mentor on the
  // assessment's product. The server is the source of truth for price/size.
  const [product] = await db
    .select({ voucherPackages: products.voucherPackages })
    .from(products)
    .where(eq(products.assessmentId, input.assessmentId))
    .limit(1);
  const pkg = (product?.voucherPackages ?? []).find((p) => p.id === input.packageId);
  if (!pkg) {
    throw new HttpError(404, 'That voucher package is not available');
  }
  const seats = pkg.seats;
  const cost = pkg.tokenCost;
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_CREDITS) {
    throw new HttpError(400, 'Invalid package size');
  }

  // Unique-within-batch codes; the global unique constraint is the backstop.
  const codes = new Set<string>();
  while (codes.size < seats) codes.add(generateCode());

  return db.transaction(async (tx) => {
    // Charge the buyer for the package. Guarded debit: only succeeds when the
    // balance covers the cost, so it can never go negative — and if it fails the
    // whole transaction (codes included) rolls back.
    let balance: number | null = null;
    if (cost > 0) {
      const debited = await tx
        .update(users)
        .set({ tokenBalance: sql`${users.tokenBalance} - ${cost}` })
        .where(and(eq(users.id, buyerId), gte(users.tokenBalance, cost)))
        .returning({ balance: users.tokenBalance });
      if (debited.length === 0) {
        throw new HttpError(400, 'Not enough tokens. Top up your wallet and try again.');
      }
      balance = debited[0].balance;
    } else {
      const [wallet] = await tx
        .select({ balance: users.tokenBalance })
        .from(users)
        .where(eq(users.id, buyerId))
        .limit(1);
      balance = wallet?.balance ?? null;
    }

    const [batch] = await tx
      .insert(voucherBatches)
      .values({ assessmentId: input.assessmentId, buyerId, companyName, credits: seats })
      .returning({ id: voucherBatches.id, createdAt: voucherBatches.createdAt });

    await tx
      .insert(vouchers)
      .values([...codes].map((code) => ({ batchId: batch.id, code })));

    if (cost > 0) {
      await tx.insert(transactions).values({
        userId: buyerId,
        mentorId: assessment.mentorId,
        assessmentId: input.assessmentId,
        amount: cost,
        type: 'VOUCHER_PURCHASE',
      });
    }

    return {
      batch_id: batch.id,
      assessment_id: input.assessmentId,
      assessment_title: assessment.title,
      company_name: companyName,
      credits: seats,
      charged: cost,
      balance,
      created_at: batch.createdAt,
    };
  });
};

/** The buyer's batches with redeemed counts. */
export const listBatches = async (buyerId: string) => {
  const rows = await db
    .select({
      batch_id: voucherBatches.id,
      company_name: voucherBatches.companyName,
      credits: voucherBatches.credits,
      created_at: voucherBatches.createdAt,
      assessment_id: voucherBatches.assessmentId,
      assessment_title: assessments.title,
      redeemed: sql<number>`count(*) filter (where ${vouchers.status} = 'REDEEMED')`,
    })
    .from(voucherBatches)
    .innerJoin(assessments, eq(voucherBatches.assessmentId, assessments.id))
    .leftJoin(vouchers, eq(vouchers.batchId, voucherBatches.id))
    .where(eq(voucherBatches.buyerId, buyerId))
    .groupBy(voucherBatches.id, assessments.title)
    .orderBy(sql`${voucherBatches.createdAt} desc`);

  return rows.map((r) => ({ ...r, redeemed: Number(r.redeemed) }));
};

const loadOwnedBatch = async (buyerId: string, batchId: string) => {
  const [batch] = await db
    .select({
      id: voucherBatches.id,
      buyerId: voucherBatches.buyerId,
      assessmentId: voucherBatches.assessmentId,
      companyName: voucherBatches.companyName,
      credits: voucherBatches.credits,
      createdAt: voucherBatches.createdAt,
    })
    .from(voucherBatches)
    .where(eq(voucherBatches.id, batchId))
    .limit(1);
  if (!batch) throw new HttpError(404, 'Batch not found');
  if (batch.buyerId !== buyerId) throw new HttpError(403, 'You do not own this batch');
  return batch;
};

/** Batch detail: the codes + aggregated analytics + per-person results. Owner only. */
export const getBatch = async (buyerId: string, batchId: string) => {
  const batch = await loadOwnedBatch(buyerId, batchId);

  const codeRows = await db
    .select({
      code: vouchers.code,
      status: vouchers.status,
      redeemedAt: vouchers.redeemedAt,
    })
    .from(vouchers)
    .where(eq(vouchers.batchId, batchId))
    .orderBy(vouchers.createdAt);

  const analytics = await computeAnalytics(batch.id, batch.assessmentId, batch.credits);
  const redeemers = await computeRedeemers(batch.id, batch.assessmentId);

  // Personality assessments produce a result category, not a score — the UI
  // uses this to show the result label instead of an (always-zero) score.
  const [assessment] = await db
    .select({ resultCategories: assessments.resultCategories })
    .from(assessments)
    .where(eq(assessments.id, batch.assessmentId))
    .limit(1);
  const isPersonality = Boolean(
    assessment?.resultCategories && Object.keys(assessment.resultCategories).length > 0,
  );

  return {
    batch_id: batch.id,
    assessment_id: batch.assessmentId,
    company_name: batch.companyName,
    credits: batch.credits,
    created_at: batch.createdAt,
    is_personality: isPersonality,
    analytics,
    redeemers,
    codes: codeRows.map((c) => ({
      code: c.code,
      status: c.status,
      redeemed_at: c.redeemedAt,
    })),
  };
};

/**
 * Per-person results for a batch: who redeemed each code, and — if they've taken
 * the assessment — their score and completion. Visible only to the batch owner
 * (enforced by getBatch's loadOwnedBatch). The company funded these seats, so it
 * may review individual outcomes; we expose the redeemer's name/email + score,
 * never their answers. A redeemer who hasn't taken it yet shows as not completed.
 */
const computeRedeemers = async (batchId: string, assessmentId: string) => {
  const rows = await db
    .select({
      userId: vouchers.redeemedByUserId,
      code: vouchers.code,
      redeemedAt: vouchers.redeemedAt,
      name: users.name,
      email: users.email,
    })
    .from(vouchers)
    .innerJoin(users, eq(users.id, vouchers.redeemedByUserId))
    .where(and(eq(vouchers.batchId, batchId), eq(vouchers.status, 'REDEEMED')))
    .orderBy(vouchers.redeemedAt);

  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));

  // Latest attempt per redeemer on this assessment (rows ordered ascending, so
  // the last one written to the map wins). For personality assessments the
  // result is a category (no numeric score), so we also carry the category name.
  const attemptByUser = new Map<
    string,
    { attemptId: string; score: number; resultLabel: string | null }
  >();
  if (userIds.length) {
    const attemptRows = await db
      .select({
        userId: attempts.userId,
        attemptId: attempts.id,
        score: attempts.totalScore,
        categoryResult: attempts.categoryResult,
      })
      .from(attempts)
      .where(
        and(
          eq(attempts.assessmentId, assessmentId),
          inArray(attempts.userId, userIds),
        ),
      )
      .orderBy(attempts.createdAt);
    for (const a of attemptRows) {
      if (!a.userId) continue;
      const cr = a.categoryResult;
      attemptByUser.set(a.userId, {
        attemptId: a.attemptId,
        score: a.score,
        resultLabel: cr ? (cr.dominantName ?? cr.dominant ?? null) : null,
      });
    }
  }

  return rows.map((r) => {
    const attempt = r.userId ? attemptByUser.get(r.userId) : undefined;
    return {
      name: r.name,
      email: r.email,
      code: r.code,
      redeemed_at: r.redeemedAt,
      completed: Boolean(attempt),
      // Personality attempts have no meaningful score — `result` carries the
      // category name instead, and `score` is null.
      score: attempt && attempt.resultLabel === null ? attempt.score : null,
      result: attempt?.resultLabel ?? null,
      attempt_id: attempt?.attemptId ?? null,
    };
  });
};

/**
 * Aggregated, privacy-preserving analytics for a batch: how many codes were
 * redeemed, how many redeemers actually completed the assessment, and their
 * average score. Never exposes individual identities or answers.
 */
const computeAnalytics = async (
  batchId: string,
  assessmentId: string,
  credits: number,
) => {
  const redeemers = await db
    .select({ userId: vouchers.redeemedByUserId })
    .from(vouchers)
    .where(and(eq(vouchers.batchId, batchId), eq(vouchers.status, 'REDEEMED')));

  const redeemedCount = redeemers.length;
  const userIds = redeemers
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));

  let completedCount = 0;
  let averageScore = 0;
  if (userIds.length) {
    const [agg] = await db
      .select({
        takers: sql<number>`count(distinct ${attempts.userId})`,
        avg: sql<string>`coalesce(avg(${attempts.totalScore}), 0)`,
      })
      .from(attempts)
      .where(
        and(
          eq(attempts.assessmentId, assessmentId),
          inArray(attempts.userId, userIds),
        ),
      );
    completedCount = Number(agg?.takers ?? 0);
    averageScore = Math.round(Number(agg?.avg ?? 0) * 10) / 10;
  }

  return {
    credits,
    redeemed: redeemedCount,
    remaining: credits - redeemedCount,
    completed: completedCount,
    completion_rate: redeemedCount ? Math.round((completedCount / redeemedCount) * 100) : 0,
    average_score: averageScore,
  };
};

/**
 * Redeem a voucher code (auth). Marks the code REDEEMED and grants the taker
 * the tokens needed to unlock this assessment's premium report, recorded as a
 * VOUCHER_REDEEM transaction. Idempotency: a code can only be redeemed once.
 */
export const redeem = async (userId: string, rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new HttpError(400, 'A voucher code is required');

  const [voucher] = await db
    .select({ id: vouchers.id, status: vouchers.status, batchId: vouchers.batchId })
    .from(vouchers)
    .where(eq(vouchers.code, code))
    .limit(1);
  if (!voucher) throw new HttpError(404, 'That voucher code is not valid');
  if (voucher.status !== 'ACTIVE') {
    throw new HttpError(409, 'That voucher code has already been used');
  }

  const [batch] = await db
    .select({ assessmentId: voucherBatches.assessmentId })
    .from(voucherBatches)
    .where(eq(voucherBatches.id, voucher.batchId))
    .limit(1);
  if (!batch) throw new HttpError(404, 'That voucher code is not valid');

  const [assessment] = await db
    .select({
      title: assessments.title,
      cost: assessments.premiumTokenCost,
      accessMode: assessments.accessMode,
    })
    .from(assessments)
    .where(eq(assessments.id, batch.assessmentId))
    .limit(1);
  if (!assessment) throw new HttpError(404, 'Assessment not found');

  // A voucher always grants start-access to its assessment (this is what makes
  // VOUCHER-mode assessments takeable). It additionally tops up the premium
  // tokens only when the assessment actually has a premium tier (FREEMIUM) —
  // preserving the original "company funds premium unlocks" use case.
  const premiumUnlockable = policyFor(normalizeMode(assessment.accessMode)).premiumUnlockable;
  const grant = premiumUnlockable ? assessment.cost : 0;

  return db.transaction(async (tx) => {
    // Claim the code atomically — the WHERE status='ACTIVE' guards against a
    // concurrent double-redeem.
    const claimed = await tx
      .update(vouchers)
      .set({ status: 'REDEEMED', redeemedByUserId: userId, redeemedAt: new Date() })
      .where(and(eq(vouchers.id, voucher.id), eq(vouchers.status, 'ACTIVE')))
      .returning({ id: vouchers.id });
    if (claimed.length === 0) {
      throw new HttpError(409, 'That voucher code has already been used');
    }

    await grantAccess(tx, userId, batch.assessmentId, 'VOUCHER');

    if (grant > 0) {
      await tx
        .update(users)
        .set({ tokenBalance: sql`${users.tokenBalance} + ${grant}` })
        .where(eq(users.id, userId));
      await tx
        .insert(transactions)
        .values({ userId, amount: grant, type: 'VOUCHER_REDEEM' });
    }

    return {
      assessment_id: batch.assessmentId,
      assessment_title: assessment.title,
      granted_tokens: grant,
    };
  });
};
