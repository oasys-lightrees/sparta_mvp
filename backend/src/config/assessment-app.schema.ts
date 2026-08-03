import { z } from 'zod';

/**
 * AssessmentApp configuration schema — the multi-tenant "tenant document".
 *
 * One reusable frontend renders any assessment purely from this object, so a
 * new branded assessment is a config row, not new code (the Shopify-theme
 * model). It is a *presentation, branding, capability & behavior* layer that
 * sits ON TOP of the relational assessment (questions, choices, thresholds,
 * result categories, premium token cost live in their own tables).
 *
 * ── Long-term architecture ─────────────────────────────────────────────────
 * The document is organized into stable concerns so it can grow without churn:
 *   - version         schema version + forward migration (see migrateAssessmentApp)
 *   - tier            entitlement tier (free → enterprise)
 *   - modules         which product surfaces/capabilities are enabled
 *   - featureFlags    open-ended experiment/rollout switches (escape hatch)
 *   - brand / theme   visual identity + design tokens
 *   - ai              per-tenant AI behavior (model, persona, capabilities)
 *   - landing / assessment / reports / products   content + presentation
 *   - automation      event → webhook wiring
 *   - integrations    enterprise connectivity (SSO/SCIM/API/custom domain)
 *   - emails / seo / settings                    channels + metadata
 *   - metadata        untyped per-tenant extension bag (never dropped)
 *
 * Rules of thumb for evolving this schema:
 *   1. Prefer ADDING optional fields with defaults over changing existing ones.
 *   2. Any breaking shape change bumps CURRENT_VERSION and gets an upcaster in
 *      migrateAssessmentApp so stored configs keep loading.
 *   3. Keep sections cohesive by concern; don't leak behavior into content.
 */

/** Bump when the shape changes in a way stored configs must be migrated for. */
export const CURRENT_VERSION = 2;

/** #rgb or #rrggbb */
const Hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex color like #4f46e5');
const NonEmpty = z.string().min(1);

// ---- tier + modules + flags ------------------------------------------------
export const TierSchema = z
  .enum(['free', 'pro', 'company', 'enterprise'])
  .default('free');

// Which product surfaces/capabilities are switched on for this tenant. The
// frontend and API gate behavior on these rather than hardcoding availability.
export const ModulesSchema = z
  .object({
    landing: z.boolean().default(true),
    assessment: z.boolean().default(true),
    freeReport: z.boolean().default(true),
    premiumReport: z.boolean().default(true),
    studyResources: z.boolean().default(true),
    userDashboard: z.boolean().default(true),
    companyDashboard: z.boolean().default(true),
    mentorDashboard: z.boolean().default(true),
    vouchers: z.boolean().default(true),
    certificates: z.boolean().default(false),
    referral: z.boolean().default(false),
  })
  .prefault({});

// Open-ended switches for experiments / gradual rollout without a schema bump.
const FeatureFlagsSchema = z.record(z.string(), z.boolean()).prefault({});

// ---- brand -----------------------------------------------------------------
export const BrandSchema = z.object({
  brandName: NonEmpty,
  monogram: z.string().min(1).max(2),
  logoUrl: z.string().url().nullable().default(null),
  faviconUrl: z.string().url().nullable().default(null),
  colors: z.object({
    primary: Hex,
    secondary: Hex,
    accent: Hex,
    onBrand: Hex.default('#ffffff'),
  }),
  typography: z
    .object({
      display: z.enum(['sans', 'grotesk', 'serif']).default('sans'),
      body: z.enum(['sans', 'serif']).default('sans'),
    })
    .prefault({}),
  iconStyle: z.enum(['line', 'solid']).default('line'),
  illustrationStyle: z.enum(['mesh', 'flat', 'photo']).default('mesh'),
});

// ---- theme -----------------------------------------------------------------
export const ThemeSchema = z
  .object({
    radius: z.enum(['sharp', 'soft', 'round']).default('soft'),
    spacing: z.enum(['compact', 'regular', 'roomy']).default('regular'),
    gradients: z.boolean().default(true),
    animations: z.enum(['full', 'reduced']).default('full'),
  })
  .prefault({});

// ---- ai (per-tenant behavior; keys/models resolved server-side) ------------
export const AiSchema = z
  .object({
    enabled: z.boolean().default(true),
    provider: z.enum(['openai']).default('openai'),
    // Null -> use the platform default model (env). Never a secret/key here.
    model: z.string().nullable().default(null),
    persona: z.string().default('a seasoned, encouraging mentor'),
    tone: z.enum(['professional', 'warm', 'direct', 'playful']).default('warm'),
    temperature: z.number().min(0).max(2).nullable().default(null),
    capabilities: z
      .object({
        questionGeneration: z.boolean().default(true),
        premiumReport: z.boolean().default(true),
      })
      .prefault({}),
    // Free-text safety/guardrail instructions appended to prompts.
    guardrails: z.string().default(''),
  })
  .prefault({});

// ---- landing ---------------------------------------------------------------
const StatSchema = z.object({ value: NonEmpty, label: NonEmpty });
const FeatureSchema = z.object({
  icon: z.string().default('spark'),
  title: NonEmpty,
  body: NonEmpty,
});
const StepSchema = z.object({ title: NonEmpty, body: NonEmpty });
const TestimonialSchema = z.object({
  quote: NonEmpty,
  name: NonEmpty,
  role: z.string().default(''),
  company: z.string().default(''),
});
const FaqSchema = z.object({ q: NonEmpty, a: NonEmpty });

export const LandingSchema = z.object({
  hero: z.object({
    eyebrow: z.string().default(''),
    title: NonEmpty,
    subtitle: z.string().default(''),
    description: z.string().default(''),
    heroImageUrl: z.string().url().nullable().default(null),
    ctaPrimary: NonEmpty.default('Get started'),
    ctaSecondary: z.string().default('See how it works'),
  }),
  trust: z
    .object({
      lead: z.string().default('Trusted by teams at'),
      companies: z.array(NonEmpty).default([]),
      stats: z.array(StatSchema).default([]),
    })
    .prefault({}),
  features: z.array(FeatureSchema).default([]),
  process: z.array(StepSchema).default([]),
  testimonials: z.array(TestimonialSchema).default([]),
  faq: z.array(FaqSchema).default([]),
  finalCta: z
    .object({
      title: NonEmpty.default('Ready to begin?'),
      subtitle: z.string().default(''),
      button: NonEmpty.default('Get started'),
      fineprint: z.string().default('Free to start · No credit card'),
    })
    .prefault({}),
});

// ---- assessment (presentation only; questions stay relational) -------------
export const AssessmentSectionSchema = z.object({
  intro: z
    .object({ title: NonEmpty, body: z.string().default('') })
    .default({ title: 'Before you begin', body: '' }),
  meta: z.object({
    estimatedMinutes: z.number().int().positive().default(12),
    questionCount: z.number().int().nonnegative().default(0),
    audience: z.string().default('For professionals'),
    benefits: z.array(NonEmpty).default([]),
  }),
  timerEnabled: z.boolean().default(false),
  completion: z
    .object({ title: NonEmpty, body: z.string().default('') })
    .default({ title: 'Analyzing your responses…', body: '' }),
});

// ---- reports ---------------------------------------------------------------
export const ReportsSchema = z.object({
  free: z.object({ title: NonEmpty.default('Your free report') }).prefault({}),
  premium: z
    .object({ title: NonEmpty.default('Your premium report') })
    .prefault({}),
  competencies: z.array(z.object({ key: NonEmpty })).default([]),
  roadmapEnabled: z.boolean().default(true),
  pdf: z.object({ footer: z.string().default('') }).prefault({}),
});

// ---- products / pricing / vouchers -----------------------------------------
const PlanSchema = z.object({
  name: NonEmpty,
  price: NonEmpty,
  period: z.string().default(''),
  tagline: z.string().default(''),
  features: z.array(NonEmpty).default([]),
  cta: NonEmpty.default('Choose plan'),
  highlight: z.boolean().default(false),
  voucher: z.boolean().default(false),
  badge: z.string().default(''),
  // Which entitlement tier purchasing this plan grants (drives access later).
  grantsTier: z.enum(['free', 'pro', 'company', 'enterprise']).default('free'),
});
const VoucherPackSchema = z.object({
  credits: z.number().int().positive(),
  price: NonEmpty,
});
export const ProductsSchema = z
  .object({
    eyebrow: z.string().default('Products'),
    title: NonEmpty.default('Plans for every buyer'),
    subtitle: z.string().default(''),
    plans: z.array(PlanSchema).default([]),
    voucherPackages: z.array(VoucherPackSchema).default([]),
    enterprise: z
      .object({ features: z.array(NonEmpty).default([]) })
      .prefault({}),
  })
  .prefault({});

// ---- automation (event → webhook) ------------------------------------------
export const WebhookEventSchema = z.enum([
  'assessment.completed',
  'report.unlocked',
  'voucher.redeemed',
  'batch.purchased',
]);
export const AutomationSchema = z
  .object({
    webhooks: z
      .array(
        z.object({
          event: WebhookEventSchema,
          url: z.string().url(),
          secret: z.string().nullable().default(null),
        }),
      )
      .default([]),
  })
  .prefault({});

// ---- integrations (enterprise connectivity) --------------------------------
export const IntegrationsSchema = z
  .object({
    customDomain: z.string().nullable().default(null),
    sso: z
      .object({
        enabled: z.boolean().default(false),
        provider: z.enum(['none', 'saml', 'oidc']).default('none'),
        metadataUrl: z.string().url().nullable().default(null),
      })
      .prefault({}),
    scimEnabled: z.boolean().default(false),
    api: z.object({ enabled: z.boolean().default(false) }).prefault({}),
    analyticsId: z.string().nullable().default(null),
  })
  .prefault({});

// ---- emails ----------------------------------------------------------------
const EmailSchema = z.object({
  subject: NonEmpty,
  heading: NonEmpty,
  body: z.string().default(''),
});
export const EmailsSchema = z
  .object({
    welcome: EmailSchema,
    voucher: EmailSchema,
    premiumUnlock: EmailSchema,
    reportReady: EmailSchema,
  })
  .default({
    welcome: { subject: 'Welcome', heading: 'Welcome', body: '' },
    voucher: { subject: 'Your voucher code', heading: 'Your voucher code', body: '' },
    premiumUnlock: {
      subject: 'Your premium report is unlocked',
      heading: 'Premium unlocked',
      body: '',
    },
    reportReady: {
      subject: 'Your report is ready',
      heading: 'Your report is ready',
      body: '',
    },
  });

// ---- seo + settings --------------------------------------------------------
export const SeoSchema = z
  .object({
    title: z.string().default(''),
    description: z.string().default(''),
    keywords: z.array(z.string()).default([]),
    ogImageUrl: z.string().url().nullable().default(null),
  })
  .prefault({});

export const SettingsSchema = z
  .object({
    defaultLocale: z.enum(['en', 'id']).default('en'),
    // Enterprise white-label: hide the "Powered by LATO" mark.
    removeBranding: z.boolean().default(false),
  })
  .prefault({});

// ---- root ------------------------------------------------------------------
export const AssessmentAppSchema = z.object({
  version: z.number().int().default(CURRENT_VERSION),
  tier: TierSchema,
  modules: ModulesSchema,
  featureFlags: FeatureFlagsSchema,
  brand: BrandSchema,
  theme: ThemeSchema,
  ai: AiSchema,
  landing: LandingSchema,
  assessment: AssessmentSectionSchema,
  reports: ReportsSchema,
  products: ProductsSchema,
  automation: AutomationSchema,
  integrations: IntegrationsSchema,
  emails: EmailsSchema,
  seo: SeoSchema,
  settings: SettingsSchema,
  // Untyped per-tenant extension bag. Survives round-trips so custom keys are
  // never silently dropped (the typed sections strip unknowns).
  metadata: z.record(z.string(), z.unknown()).prefault({}),
});

export type AssessmentApp = z.infer<typeof AssessmentAppSchema>;

/** Validate an unknown value as a full AssessmentApp. Throws ZodError. */
export const parseAssessmentApp = (value: unknown): AssessmentApp =>
  AssessmentAppSchema.parse(value);

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Forward-migrate a stored config to the current shape, then validate. Older
 * documents (identified by `version`) are upcast field-by-field so no data is
 * lost when the typed schema would otherwise strip removed keys. Call this on
 * every read of a persisted config.
 */
export const migrateAssessmentApp = (raw: unknown): AssessmentApp => {
  if (!isObj(raw)) return AssessmentAppSchema.parse(raw);
  const version = typeof raw.version === 'number' ? raw.version : 1;
  let doc: Record<string, unknown> = raw;
  if (version < 2) doc = upcastV1toV2(doc);
  // Future: if (doc.version < 3) doc = upcastV2toV3(doc); …
  return AssessmentAppSchema.parse(doc);
};

/** v1 → v2: `dashboard.*.enabled` → `modules.*`, flat `integrations` →
 *  structured `integrations` + `automation`, and set the new sections. */
const upcastV1toV2 = (o: Record<string, unknown>): Record<string, unknown> => {
  const dashboard = isObj(o.dashboard) ? o.dashboard : {};
  const enabled = (k: string) =>
    isObj(dashboard[k]) && typeof (dashboard[k] as Record<string, unknown>).enabled === 'boolean'
      ? ((dashboard[k] as Record<string, unknown>).enabled as boolean)
      : true;
  const oldInt = isObj(o.integrations) ? o.integrations : {};
  const webhooks = Array.isArray(oldInt.webhooks)
    ? (oldInt.webhooks as unknown[])
        .filter((u): u is string => typeof u === 'string')
        .map((url) => ({ event: 'assessment.completed' as const, url }))
    : [];

  const { dashboard: _drop, integrations: _drop2, ...rest } = o;
  return {
    ...rest,
    version: 2,
    modules: {
      userDashboard: enabled('user'),
      companyDashboard: enabled('company'),
      mentorDashboard: enabled('mentor'),
    },
    automation: { webhooks },
    integrations: {
      customDomain: typeof oldInt.customDomain === 'string' ? oldInt.customDomain : null,
      sso: { enabled: oldInt.ssoEnabled === true },
      api: { enabled: oldInt.apiEnabled === true },
      analyticsId: typeof oldInt.analyticsId === 'string' ? oldInt.analyticsId : null,
    },
  };
};

/**
 * Deep-merge a partial patch onto a base config (objects merged recursively;
 * arrays and scalars replaced). Lets mentors PATCH one field without resending
 * the whole document; the caller validates the merged result before persisting.
 */
export const mergeAssessmentApp = (base: unknown, patch: unknown): unknown => {
  if (!isObj(base) || !isObj(patch)) return patch === undefined ? base : patch;
  const out: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) continue;
    out[key] = mergeAssessmentApp(base[key], val);
  }
  return out;
};

export type DefaultConfigInput = {
  brandName: string;
  assessmentTitle: string;
  monogram?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  premiumPrice?: string;
  premiumTokenCost?: number;
  questionCount?: number;
  estimatedMinutes?: number;
  description?: string | null;
};

const DEFAULT_COLORS = { primary: '#4f46e5', secondary: '#7c3aed', accent: '#06b6d4' };

/**
 * Produce a COMPLETE, valid AssessmentApp from minimal input, so a brand-new
 * assessment renders as a finished product on day one. Copy is generic
 * placeholder text the mentor can refine.
 */
export const defaultAssessmentApp = (input: DefaultConfigInput): AssessmentApp => {
  const name = input.brandName.trim() || input.assessmentTitle.trim();
  const monogram = (input.monogram || name || 'A').trim().slice(0, 2).toUpperCase();
  const colors = {
    primary: input.colors?.primary || DEFAULT_COLORS.primary,
    secondary: input.colors?.secondary || DEFAULT_COLORS.secondary,
    accent: input.colors?.accent || DEFAULT_COLORS.accent,
    onBrand: '#ffffff',
  };
  const price = input.premiumPrice || '$29';
  const title = input.assessmentTitle.trim() || name;

  const draft: z.input<typeof AssessmentAppSchema> = {
    version: CURRENT_VERSION,
    tier: 'free',
    modules: {},
    featureFlags: {},
    brand: {
      brandName: name,
      monogram,
      logoUrl: null,
      faviconUrl: null,
      colors,
      typography: { display: 'sans', body: 'sans' },
      iconStyle: 'line',
      illustrationStyle: 'mesh',
    },
    theme: { radius: 'soft', spacing: 'regular', gradients: true, animations: 'full' },
    ai: {
      enabled: true,
      provider: 'openai',
      model: null,
      persona: 'a seasoned, encouraging mentor',
      tone: 'warm',
      temperature: null,
      capabilities: { questionGeneration: true, premiumReport: true },
      guardrails: '',
    },
    landing: {
      hero: {
        eyebrow: 'AI Assessment',
        title: `Know where you stand with ${title}.`,
        subtitle: `${title} measures what matters and turns your result into a personalized AI plan.`,
        description:
          'Take the assessment for free and get an instant report — with an optional AI deep-dive.',
        heroImageUrl: null,
        ctaPrimary: 'Start free assessment',
        ctaSecondary: 'See how it works',
      },
      trust: {
        lead: 'Trusted by teams everywhere',
        companies: [],
        stats: [
          { value: 'New', label: 'just launched' },
          { value: '4.9', label: 'average rating' },
          { value: 'Free', label: 'to get started' },
        ],
      },
      features: [
        { icon: 'target', title: 'Discover strengths', body: 'See where you already outperform, backed by your own answers.' },
        { icon: 'gauge', title: 'Identify gaps', body: 'Pinpoint the specific areas holding you back — no vague feedback.' },
        { icon: 'spark', title: 'Personalized AI insight', body: 'A tailored report written from your responses, not a template.' },
        { icon: 'map', title: 'A clear next step', body: 'Concrete recommendations and a roadmap matched to your level.' },
      ],
      process: [
        { title: 'Answer questions', body: 'A short set of questions. A few minutes, no account needed.' },
        { title: 'Get your free report', body: 'An instant score, level, and summary of your strengths.' },
        { title: 'Unlock the AI report', body: 'A personalized deep-dive into your gaps and how to close them.' },
        { title: 'Follow your roadmap', body: 'A focused action plan you can start on immediately.' },
      ],
      testimonials: [],
      faq: [
        { q: 'Is the assessment free?', a: 'Yes. The full assessment and your score, level, and summary are free. The AI deep-dive report is the paid upgrade.' },
        { q: 'How long does it take?', a: `About ${input.estimatedMinutes ?? 12} minutes.` },
        { q: 'How do company voucher codes work?', a: 'Buy a seat package and we generate that many unique codes. Share them with your team; each unlocks one assessment and feeds a team dashboard.' },
      ],
      finalCta: {
        title: 'Ready to find out where you stand?',
        subtitle: 'Take the free assessment now and get your instant report.',
        button: 'Start free assessment',
        fineprint: 'Free to start · No credit card · Instant report',
      },
    },
    assessment: {
      intro: {
        title: `Welcome to ${title}`,
        body: 'Answer honestly — there are no trick questions. Your progress saves automatically.',
      },
      meta: {
        estimatedMinutes: input.estimatedMinutes ?? 12,
        questionCount: input.questionCount ?? 0,
        audience: 'For professionals',
        benefits: ['Instant free report', 'Personalized AI insights', 'A clear next step'],
      },
      timerEnabled: false,
      completion: {
        title: 'Analyzing your responses…',
        body: 'Our AI is scoring your answers and preparing your personalized report.',
      },
    },
    reports: {
      free: { title: `Your ${title} report` },
      premium: { title: 'Your Growth Blueprint' },
      competencies: [],
      roadmapEnabled: true,
      pdf: { footer: `${name} · Powered by LATO` },
    },
    products: {
      eyebrow: 'Products',
      title: 'One assessment. Plans for every buyer.',
      subtitle: 'Start free. Upgrade for depth, or roll it out across your whole company.',
      plans: [
        { name: 'Free', price: '$0', period: 'forever', tagline: 'The essentials to get oriented.', features: ['Full assessment', 'Instant score & level', 'Strengths summary'], cta: 'Start free', highlight: false, voucher: false, badge: '', grantsTier: 'free' },
        { name: 'Individual', price, period: 'one-time', tagline: 'Your complete personalized blueprint.', features: ['Everything in Free', 'Premium AI report', 'Study materials', 'Personalized recommendations'], cta: 'Unlock my report', highlight: true, voucher: false, badge: 'Most popular', grantsTier: 'pro' },
        { name: 'Company', price: '$249', period: '/ 10 seats', tagline: 'Assess a team and see it all in one place.', features: ['10 voucher codes', 'Employee dashboard', 'Team & role reports', 'HR analytics'], cta: 'Buy team plan', highlight: false, voucher: true, badge: '', grantsTier: 'company' },
        { name: 'Enterprise', price: 'Custom', period: '', tagline: 'For org-wide rollout and integration.', features: ['Unlimited employees', 'Org-wide dashboard', 'API integration', 'SSO & security review', 'Dedicated support'], cta: 'Talk to sales', highlight: false, voucher: false, badge: '', grantsTier: 'enterprise' },
      ],
      voucherPackages: [
        { credits: 10, price: '$249' },
        { credits: 50, price: '$1,090' },
        { credits: 100, price: '$1,990' },
      ],
      enterprise: {
        features: ['White-label branding', 'API access', 'SSO / SCIM', 'Custom domain', 'Dedicated support'],
      },
    },
    automation: { webhooks: [] },
    integrations: {
      customDomain: null,
      sso: { enabled: false, provider: 'none', metadataUrl: null },
      scimEnabled: false,
      api: { enabled: false },
      analyticsId: null,
    },
    emails: {
      welcome: { subject: `Welcome to ${name}`, heading: `Welcome to ${name}`, body: 'Thanks for joining. Take your first assessment any time.' },
      voucher: { subject: `Your ${name} voucher code`, heading: 'Here is your voucher code', body: 'Redeem it to take the assessment and unlock your report.' },
      premiumUnlock: { subject: `Your ${name} premium report is ready`, heading: 'Premium unlocked', body: 'Your personalized AI report is now available.' },
      reportReady: { subject: `Your ${name} result`, heading: 'Your report is ready', body: 'View your score, level, and personalized summary.' },
    },
    seo: {
      title: `${name} — ${title}`,
      description: input.description?.trim() || `Take ${title}: an AI-powered assessment with an instant free report and a personalized premium blueprint.`,
      keywords: [name.toLowerCase(), 'assessment', 'ai report'],
      ogImageUrl: null,
    },
    settings: { defaultLocale: 'en', removeBranding: false },
    metadata: {},
  };

  return AssessmentAppSchema.parse(draft);
};
