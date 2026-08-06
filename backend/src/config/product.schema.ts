import { z } from 'zod';

/**
 * Product pricing tiers. A product exposes a list of pricing tiers; each is a
 * self-contained marketing card the mentor fully controls (title, description,
 * price, token cost, button, image) plus a pricing `kind` that mirrors the
 * assessment access models (free / freemium / paid / voucher) and decides where
 * the card's button routes on the landing page.
 *
 * Presentation + routing only: actual access enforcement (start gating, voucher
 * redeem, premium unlock) stays on the assessment. A VOUCHER tier routes to the
 * redeem flow ("accept a voucher for this product").
 */

export const TIER_KINDS = ['FREE', 'FREEMIUM', 'PAID', 'VOUCHER'] as const;

const PricingTierSchema = z.object({
  // Stable key (used by the editor + React lists). Generated on create.
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  title: z.string().default(''),
  description: z.string().default(''),
  kind: z.enum(TIER_KINDS).default('FREE'),
  // Free-text price display, e.g. "$29", "Free", "From $199".
  priceLabel: z.string().default(''),
  // Token price to surface on the card (0 -> hidden).
  tokenCost: z.number().int().nonnegative().max(1_000_000).default(0),
  // Custom button label.
  ctaLabel: z.string().default('Get started'),
  // Optional image/logo shown between the title and the button. Absolute URL
  // (an uploaded asset or an external image); null -> none.
  imageUrl: z.string().url().nullable().default(null),
  highlight: z.boolean().default(false),
});

// A product's tiers are simply an ordered list (max 6 keeps the UI sane).
export const ProductTiersSchema = z.array(PricingTierSchema).max(6).default([]);

export type PricingTierInput = z.input<typeof PricingTierSchema>;
export type ProductTiersInput = z.input<typeof ProductTiersSchema>;

/** Validate an unknown value as ProductTiers, filling per-tier defaults. */
export const parseTiers = (value: unknown) => ProductTiersSchema.parse(value);
