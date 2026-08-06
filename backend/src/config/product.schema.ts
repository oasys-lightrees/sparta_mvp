import { z } from 'zod';

/**
 * Product tier configuration schema. Validates the `tiers` jsonb on a product.
 * Tiers are presentational + enablement only — the price labels are display
 * strings and the actual purchase mechanics reuse the assessment's existing
 * access model (premium unlock) and voucher batches. See db/schema ProductTiers.
 */
const TierSchema = z.object({
  enabled: z.boolean().default(true),
  priceLabel: z.string().default(''),
  blurb: z.string().default(''),
});

export const ProductTiersSchema = z
  .object({
    individualBasic: TierSchema.default({
      enabled: true,
      priceLabel: 'Free',
      blurb: '',
    }),
    individualPremium: TierSchema.default({
      enabled: true,
      priceLabel: '',
      blurb: '',
    }),
    companyPremium: TierSchema.extend({
      // Default number of voucher seats offered in the company tier.
      seats: z.number().int().positive().max(1000).default(10),
    }).default({ enabled: true, priceLabel: '', blurb: '', seats: 10 }),
  })
  .default({
    individualBasic: { enabled: true, priceLabel: 'Free', blurb: '' },
    individualPremium: { enabled: true, priceLabel: '', blurb: '' },
    companyPremium: { enabled: true, priceLabel: '', blurb: '', seats: 10 },
  });

export type ProductTiersInput = z.input<typeof ProductTiersSchema>;

/** Validate an unknown value as ProductTiers, filling defaults. */
export const parseTiers = (value: unknown) => ProductTiersSchema.parse(value);
