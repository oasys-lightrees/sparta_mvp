import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, products } from '../db/schema';
import type { ProductTiers } from '../db/schema';
import {
  ProductContentSchema,
  ProductTiersSchema,
  VoucherPackagesSchema,
} from '../config/product.schema';
import { HttpError } from '../utils/http-error';

// The caller's identity + role, used to authorize mentor operations.
type Caller = { id: string; role: string };

type ProductRow = typeof products.$inferSelect;

export type UpsertProductInput = {
  name?: string;
  description?: string | null;
  status?: 'DRAFT' | 'PUBLISHED';
  tiers?: unknown;
  voucherPackages?: unknown;
  content?: unknown;
};

const defaultTiers = (): ProductTiers =>
  ProductTiersSchema.parse([
    {
      id: 'free',
      enabled: true,
      title: 'Free',
      description: 'Take the assessment and get your instant report.',
      kind: 'FREE',
      priceLabel: 'Free',
      amount: 0,
      ctaLabel: 'Start assessment',
      imageUrl: null,
      highlight: false,
    },
    {
      id: 'paid',
      enabled: true,
      title: 'Full access',
      description: 'Pay to unlock and take the assessment.',
      kind: 'PAID',
      priceLabel: '',
      amount: 0,
      ctaLabel: 'Get access',
      imageUrl: null,
      highlight: true,
    },
    {
      id: 'voucher',
      enabled: true,
      title: 'Team / Voucher',
      description: 'Have a company voucher? Redeem it to unlock access.',
      kind: 'VOUCHER',
      priceLabel: '',
      amount: 0,
      ctaLabel: 'Redeem a voucher',
      imageUrl: null,
      highlight: false,
    },
  ]);

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product';

/** A slug not used by any other product (append -2, -3… on collision). */
const uniqueSlug = async (base: string): Promise<string> => {
  let candidate = base;
  for (let n = 2; ; n += 1) {
    const [clash] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
    candidate = `${base}-${n}`;
  }
};

const toDto = (p: ProductRow) => ({
  id: p.id,
  assessment_id: p.assessmentId,
  name: p.name,
  slug: p.slug,
  description: p.description,
  status: p.status,
  tiers: p.tiers ?? defaultTiers(),
  voucher_packages: p.voucherPackages ?? [],
  content: p.content ?? [],
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

/**
 * Load an assessment and assert the caller may manage its product: admins may
 * manage any, a mentor only their own. 404 if missing, 403 otherwise.
 */
const loadManageableAssessment = async (assessmentId: string, caller: Caller) => {
  const [a] = await db
    .select({ id: assessments.id, mentorId: assessments.mentorId, title: assessments.title })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!a) throw new HttpError(404, 'Assessment not found');
  if (caller.role !== 'ADMIN' && a.mentorId !== caller.id) {
    throw new HttpError(403, 'You can only manage products for your own assessments');
  }
  return a;
};

/** The product for an assessment (mentor view — any status). Null if none. */
export const getForAssessment = async (assessmentId: string, caller: Caller) => {
  await loadManageableAssessment(assessmentId, caller);
  const [p] = await db
    .select()
    .from(products)
    .where(eq(products.assessmentId, assessmentId))
    .limit(1);
  return p ? toDto(p) : null;
};

/**
 * Public product tiers for an assessment's landing page — only when PUBLISHED.
 * Returns just the sellable surface (name, description, tiers). Null otherwise.
 */
export const getPublicForAssessment = async (assessmentId: string) => {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.assessmentId, assessmentId), eq(products.status, 'PUBLISHED')))
    .limit(1);
  if (!p) return null;
  return {
    name: p.name,
    description: p.description,
    tiers: p.tiers ?? defaultTiers(),
    voucher_packages: p.voucherPackages ?? [],
    content: p.content ?? [],
  };
};

/** All of a mentor's products, with their assessment title/status. */
export const listForMentor = async (mentorId: string) => {
  const rows = await db
    .select({
      id: products.id,
      assessment_id: products.assessmentId,
      name: products.name,
      slug: products.slug,
      status: products.status,
      created_at: products.createdAt,
      assessment_title: assessments.title,
      assessment_status: assessments.status,
    })
    .from(products)
    .innerJoin(assessments, eq(products.assessmentId, assessments.id))
    .where(eq(products.mentorId, mentorId))
    .orderBy(desc(products.createdAt));
  return rows;
};

type AssessmentPricing = {
  accessMode: 'FREE' | 'FREEMIUM' | 'PAID' | 'VOUCHER';
  accessCost: number;
};

/**
 * Derive the assessment's access model + access cost from the product's enabled
 * tiers, so the price a mentor sets on a tier is the price actually charged (and
 * shown on the landing/report). Returns null when there are no enabled tiers, so
 * the assessment is left untouched.
 *
 * Mapping:
 *  - A PAID tier's amount (IDR) -> the start-access cost.
 *  - Start gating: a FREE/FREEMIUM tier lets anyone start for free; otherwise the
 *    entry is gated by PAID, or by VOUCHER (redeem a code).
 */
const deriveAssessmentPricing = (tiers: ProductTiers): AssessmentPricing | null => {
  const enabled = tiers.filter((t) => t.enabled);
  if (enabled.length === 0) return null;

  const paid = enabled.find((t) => t.kind === 'PAID');
  const hasFreeEntry = enabled.some((t) => t.kind === 'FREE' || t.kind === 'FREEMIUM');

  if (hasFreeEntry) {
    return { accessMode: 'FREE', accessCost: 0 };
  }
  if (paid) {
    return { accessMode: 'PAID', accessCost: paid.amount };
  }
  if (enabled.some((t) => t.kind === 'VOUCHER')) {
    return { accessMode: 'VOUCHER', accessCost: 0 };
  }
  return { accessMode: 'FREE', accessCost: 0 };
};

/**
 * Create or update the product for an assessment (1:1). Verifies the caller
 * owns the assessment, validates the tiers, and generates a unique slug on
 * first create. The product is the source of truth for pricing, so saving it
 * also syncs the derived access model + access cost onto the assessment (in one
 * transaction) — the tier's price is what actually gets charged. Returns
 * the saved product.
 */
export const upsertForAssessment = async (
  caller: Caller,
  assessmentId: string,
  input: UpsertProductInput,
) => {
  const assessment = await loadManageableAssessment(assessmentId, caller);

  const tiers = ProductTiersSchema.parse(input.tiers ?? {});
  const voucherPackages = VoucherPackagesSchema.parse(input.voucherPackages ?? []);
  const content = ProductContentSchema.parse(input.content ?? []);
  const name = (input.name ?? '').trim() || assessment.title;
  const status = input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const description =
    input.description === undefined || input.description === null
      ? null
      : String(input.description);

  const pricing = deriveAssessmentPricing(tiers);

  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.assessmentId, assessmentId))
    .limit(1);
  // 1:1 unique constraint means no concurrent second product, so a slug picked
  // here can't be claimed between now and the insert below.
  const slug = existing ? null : await uniqueSlug(slugify(name));

  return db.transaction(async (tx) => {
    let saved: ProductRow;
    if (existing) {
      [saved] = await tx
        .update(products)
        .set({ name, description, tiers, voucherPackages, content, status })
        .where(eq(products.id, existing.id))
        .returning();
    } else {
      [saved] = await tx
        .insert(products)
        // The product's owner is always the assessment's mentor (not necessarily
        // the caller, who may be an admin acting on their behalf).
        .values({
          mentorId: assessment.mentorId,
          assessmentId,
          name,
          slug: slug as string,
          description,
          tiers,
          voucherPackages,
          content,
          status,
        })
        .returning();
    }

    if (pricing) {
      await tx
        .update(assessments)
        .set({
          accessMode: pricing.accessMode,
          accessCost: pricing.accessCost,
        })
        .where(eq(assessments.id, assessmentId));
    }

    return toDto(saved);
  });
};

/** Delete the product for an assessment (owner/admin). No-op if none. */
export const removeForAssessment = async (caller: Caller, assessmentId: string) => {
  await loadManageableAssessment(assessmentId, caller);
  await db.delete(products).where(eq(products.assessmentId, assessmentId));
};

// Exported for potential reuse/testing.
export { defaultTiers };
