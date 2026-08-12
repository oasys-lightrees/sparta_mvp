import { z } from 'zod';

/**
 * AssessmentApp configuration schema.
 *
 * This is the "tenant document" for the multi-tenant assessment platform: one
 * reusable frontend renders any assessment purely from this object, so a new
 * branded assessment is a config row, not new code (the Shopify-theme model).
 *
 * It is a *presentation & branding* layer that sits ON TOP of the existing
 * relational assessment (questions, choices, thresholds, result categories,
 * premium token cost live in their own tables). Nothing here duplicates those —
 * `defaultAssessmentApp()` hydrates sensible defaults from the assessment row.
 */

/** #rgb or #rrggbb */
const Hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex color like #4f46e5');

const NonEmpty = z.string().min(1);

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
    .default({ display: 'sans', body: 'sans' }),
  iconStyle: z.enum(['line', 'solid']).default('line'),
  illustrationStyle: z.enum(['mesh', 'flat', 'photo']).default('mesh'),
});

// ---- theme -----------------------------------------------------------------
// Additive design tokens. Existing color/radius/spacing/animations are
// unchanged; the new tokens default to values that reproduce today's look, so
// existing configs (and the default generator) behave exactly as before.
export const ThemeSchema = z
  .object({
    radius: z.enum(['sharp', 'soft', 'round']).default('soft'),
    spacing: z.enum(['compact', 'regular', 'roomy']).default('regular'),
    gradients: z.boolean().default(true),
    animations: z.enum(['full', 'reduced']).default('full'),
    // Color-scheme preference. 'auto' follows the viewer's OS (current behavior).
    mode: z.enum(['light', 'dark', 'auto']).default('auto'),
    // Named typography preset the frontend can map to a font pairing.
    typographyPreset: z
      .enum(['modern', 'classic', 'editorial', 'technical'])
      .default('modern'),
    // Motion intensity (finer than `animations`; reserved for future use).
    motion: z.enum(['full', 'subtle', 'none']).default('full'),
  })
  .default({
    radius: 'soft',
    spacing: 'regular',
    gradients: true,
    animations: 'full',
    mode: 'auto',
    typographyPreset: 'modern',
    motion: 'full',
  });

// ---- modules (capability enablement) ---------------------------------------
// A lightweight switchboard for major platform capabilities. Every module
// defaults to ENABLED so existing configs and current behavior are unchanged —
// a tenant only ever opts OUT. Modules for surfaces that don't exist yet are
// included (and default on) so shipping them never requires a schema change.
export const ModulesSchema = z
  .object({
    landing: z.boolean().default(true),
    assessment: z.boolean().default(true),
    reports: z.boolean().default(true),
    dashboard: z.boolean().default(true),
    vouchers: z.boolean().default(true),
    organization: z.boolean().default(true),
    marketplace: z.boolean().default(true),
    blog: z.boolean().default(true),
    community: z.boolean().default(true),
    analytics: z.boolean().default(true),
  })
  .default({
    landing: true,
    assessment: true,
    reports: true,
    dashboard: true,
    vouchers: true,
    organization: true,
    marketplace: true,
    blog: true,
    community: true,
    analytics: true,
  });

// ---- ai (reserved; does not affect current report generation) --------------
// Optional AI configuration space for future model routing, languages, report
// options and prompt tuning. Nothing here is wired into report generation yet
// (that still uses the server default model + the relational assessment fields);
// this simply reserves a stable, typed home so adding AI features later is
// additive rather than breaking. Never holds secrets/API keys.
export const AiSchema = z
  .object({
    enabled: z.boolean().default(true),
    provider: z.enum(['openai']).default('openai'),
    // Null -> use the platform default model (env).
    model: z.string().nullable().default(null),
    // Output languages the AI may generate in (BCP-47-ish codes).
    languages: z.array(z.string()).default(['en']),
    tone: z
      .enum(['professional', 'warm', 'direct', 'playful'])
      .default('warm'),
    persona: z.string().default('a seasoned, encouraging mentor'),
    temperature: z.number().min(0).max(2).nullable().default(null),
    // Report-generation options (reserved).
    reportOptions: z
      .object({
        includeRoadmap: z.boolean().default(true),
        includeRecommendations: z.boolean().default(true),
      })
      .default({ includeRoadmap: true, includeRecommendations: true }),
    // Prompt tuning (reserved). Null -> platform default prompt.
    prompts: z
      .object({ systemPromptOverride: z.string().nullable().default(null) })
      .default({ systemPromptOverride: null }),
    // Free-text safety/guardrail instructions (reserved).
    guardrails: z.string().default(''),
  })
  .default({
    enabled: true,
    provider: 'openai',
    model: null,
    languages: ['en'],
    tone: 'warm',
    persona: 'a seasoned, encouraging mentor',
    temperature: null,
    reportOptions: { includeRoadmap: true, includeRecommendations: true },
    prompts: { systemPromptOverride: null },
    guardrails: '',
  });

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
    .default({ lead: 'Trusted by teams at', companies: [], stats: [] }),
  features: z.array(FeatureSchema).default([]),
  process: z.array(StepSchema).default([]),
  testimonials: z.array(TestimonialSchema).default([]),
  faq: z.array(FaqSchema).default([]),
  // Optional "About" section: title + description on the left, an image on the
  // right. Off by default so existing assessments are unchanged; the expert
  // turns it on and fills it from the landing-page editor.
  about: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().default('About'),
      body: z.string().default(''),
      imageUrl: z.string().url().nullable().default(null),
    })
    .default({ enabled: false, title: 'About', body: '', imageUrl: null }),
  // Optional "Benefits" section: a titled grid of cards, each with an image,
  // heading and description (e.g. "4 Ways You Can Benefit…"). Off by default;
  // the expert turns it on and fills it from the landing editor.
  benefits: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().default(''),
      items: z
        .array(
          z.object({
            title: z.string().default(''),
            body: z.string().default(''),
            imageUrl: z.string().url().nullable().default(null),
          }),
        )
        .max(8)
        .default([]),
    })
    .default({ enabled: false, title: '', items: [] }),
  // Optional "Contact" section: a clickable title in the footer that opens a
  // WhatsApp chat with the expert. Off by default; the expert turns it on and
  // fills the title, contact name and WhatsApp number from the landing editor.
  contact: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().default('Contact'),
      name: z.string().default(''),
      whatsapp: z.string().default(''),
    })
    .default({ enabled: false, title: 'Contact', name: '', whatsapp: '' }),
  finalCta: z
    .object({
      // Whether the closing call-to-action section renders on the landing page.
      enabled: z.boolean().default(true),
      title: NonEmpty.default('Ready to begin?'),
      subtitle: z.string().default(''),
      button: NonEmpty.default('Get started'),
      fineprint: z.string().default('Free to start · No credit card'),
    })
    .default({
      enabled: true,
      title: 'Ready to begin?',
      subtitle: '',
      button: 'Get started',
      fineprint: 'Free to start · No credit card',
    }),
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
  free: z
    .object({ title: NonEmpty.default('Your free report') })
    .default({ title: 'Your free report' }),
  premium: z
    .object({ title: NonEmpty.default('Your full report') })
    .default({ title: 'Your full report' }),
  competencies: z.array(z.object({ key: NonEmpty })).default([]),
  roadmapEnabled: z.boolean().default(true),
  pdf: z
    .object({ footer: z.string().default('') })
    .default({ footer: '' }),
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
      .default({ features: [] }),
  })
  .default({
    eyebrow: 'Products',
    title: 'Plans for every buyer',
    subtitle: '',
    plans: [],
    voucherPackages: [],
    enterprise: { features: [] },
  });

// ---- dashboard (which surfaces are enabled per tenant) ---------------------
export const DashboardSchema = z
  .object({
    user: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
    company: z
      .object({ enabled: z.boolean().default(true) })
      .default({ enabled: true }),
    mentor: z
      .object({ enabled: z.boolean().default(true) })
      .default({ enabled: true }),
  })
  .default({
    user: { enabled: true },
    company: { enabled: true },
    mentor: { enabled: true },
  });

// ---- emails (branded transactional copy) -----------------------------------
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
      subject: 'Your report is ready',
      heading: 'Your report is ready',
      body: '',
    },
    reportReady: {
      subject: 'Your report is ready',
      heading: 'Your report is ready',
      body: '',
    },
  });

// ---- seo -------------------------------------------------------------------
export const SeoSchema = z
  .object({
    title: z.string().default(''),
    description: z.string().default(''),
    keywords: z.array(z.string()).default([]),
    ogImageUrl: z.string().url().nullable().default(null),
  })
  .default({ title: '', description: '', keywords: [], ogImageUrl: null });

// ---- integrations ----------------------------------------------------------
export const IntegrationsSchema = z
  .object({
    customDomain: z.string().nullable().default(null),
    ssoEnabled: z.boolean().default(false),
    apiEnabled: z.boolean().default(false),
    webhooks: z.array(z.string().url()).default([]),
    analyticsId: z.string().nullable().default(null),
  })
  .default({
    customDomain: null,
    ssoEnabled: false,
    apiEnabled: false,
    webhooks: [],
    analyticsId: null,
  });

// ---- root ------------------------------------------------------------------
export const AssessmentAppSchema = z.object({
  // Legacy shape version, retained for backward compatibility (== schemaVersion).
  version: z.literal(1).default(1),
  // --- Configuration metadata (additive) ---
  // Canonical schema version going forward. Bumped only on shape changes.
  schemaVersion: z.number().int().default(1),
  // Content revision counter — bumped by the API on every save (audit +
  // optimistic concurrency + cache busting). Independent of the schema version.
  configVersion: z.number().int().nonnegative().default(1),
  // ISO timestamps stamped by the API. Null until first saved.
  createdAt: z.string().datetime().nullable().default(null),
  updatedAt: z.string().datetime().nullable().default(null),
  // --- Capability + AI (additive) ---
  modules: ModulesSchema,
  ai: AiSchema,
  // --- Existing sections (unchanged) ---
  brand: BrandSchema,
  theme: ThemeSchema,
  landing: LandingSchema,
  assessment: AssessmentSectionSchema,
  reports: ReportsSchema,
  products: ProductsSchema,
  dashboard: DashboardSchema,
  emails: EmailsSchema,
  seo: SeoSchema,
  integrations: IntegrationsSchema,
});

export type AssessmentApp = z.infer<typeof AssessmentAppSchema>;

/**
 * Validate an unknown value as a full AssessmentApp. Throws ZodError on failure.
 */
export const parseAssessmentApp = (value: unknown): AssessmentApp =>
  AssessmentAppSchema.parse(value);

/**
 * Deep-merge a partial patch onto a base config (plain objects merged
 * recursively; arrays and scalars are replaced, not concatenated). Used so
 * mentors can PATCH one field without resending the whole document. The result
 * is validated by the caller before persisting.
 */
export const mergeAssessmentApp = (
  base: unknown,
  patch: unknown,
): unknown => {
  if (
    base === null ||
    typeof base !== 'object' ||
    Array.isArray(base) ||
    patch === null ||
    typeof patch !== 'object' ||
    Array.isArray(patch)
  ) {
    return patch === undefined ? base : patch;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, val] of Object.entries(patch as Record<string, unknown>)) {
    if (val === undefined) continue;
    out[key] = mergeAssessmentApp((base as Record<string, unknown>)[key], val);
  }
  return out;
};

export type DefaultConfigInput = {
  brandName: string;
  assessmentTitle: string;
  monogram?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
  premiumPrice?: string; // display string, e.g. "$29"
  questionCount?: number;
  estimatedMinutes?: number;
  description?: string | null;
};

const DEFAULT_COLORS = {
  primary: '#4f46e5',
  secondary: '#7c3aed',
  accent: '#06b6d4',
};

/**
 * Produce a COMPLETE, valid AssessmentApp from minimal input, so a brand-new
 * assessment renders as a finished product on day one. Copy is intentionally
 * generic placeholder text the mentor can then refine.
 */
export const defaultAssessmentApp = (
  input: DefaultConfigInput,
): AssessmentApp => {
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
    version: 1,
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
    landing: {
      hero: {
        eyebrow: 'Assessment',
        title: `Know where you stand with ${title}.`,
        subtitle: `${title} measures what matters and turns your result into a personalized plan.`,
        description:
          'Take the assessment for free and get an instant report.',
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
        { icon: 'gauge', title: 'Identify gaps', body: 'Pinpoint the specific areas holding you back, with no vague feedback.' },
        { icon: 'spark', title: 'Personalized insight', body: 'A tailored report written from your responses, not a template.' },
        { icon: 'map', title: 'A clear next step', body: 'Concrete recommendations and a roadmap matched to your level.' },
      ],
      process: [
        { title: 'Answer questions', body: 'A short set of questions. A few minutes, no account needed.' },
        { title: 'Get your report', body: 'An instant score, level, and summary of your strengths.' },
        { title: 'See your full result', body: 'A personalized breakdown of your gaps and how to close them.' },
        { title: 'Follow your roadmap', body: 'A focused action plan you can start on immediately.' },
      ],
      testimonials: [],
      faq: [
        { q: 'Is the assessment free?', a: 'Yes, unless the creator has set an access price. Either way your full report is included when you finish.' },
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
        body: 'Answer honestly; there are no trick questions. Your progress saves automatically.',
      },
      meta: {
        estimatedMinutes: input.estimatedMinutes ?? 12,
        questionCount: input.questionCount ?? 0,
        audience: 'For professionals',
        benefits: ['Instant free report', 'Personalized insights', 'A clear next step'],
      },
      timerEnabled: false,
      completion: {
        title: 'Analyzing your responses…',
        body: 'Scoring your answers and preparing your personalized report.',
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
        { name: 'Free', price: '$0', period: 'forever', tagline: 'The essentials to get oriented.', features: ['Full assessment', 'Instant score & level', 'Strengths summary'], cta: 'Start free', highlight: false, voucher: false, badge: '' },
        { name: 'Individual', price, period: 'one-time', tagline: 'Your complete personalized blueprint.', features: ['Everything in Free', 'Full report', 'Study materials', 'Personalized recommendations'], cta: 'Get full access', highlight: true, voucher: false, badge: 'Most popular' },
        { name: 'Company', price: '$249', period: '/ 10 seats', tagline: 'Assess a team and see it all in one place.', features: ['10 voucher codes', 'Employee dashboard', 'Team & role reports', 'HR analytics'], cta: 'Buy team plan', highlight: false, voucher: true, badge: '' },
        { name: 'Enterprise', price: 'Custom', period: '', tagline: 'For org-wide rollout and integration.', features: ['Unlimited employees', 'Org-wide dashboard', 'API integration', 'SSO & security review', 'Dedicated support'], cta: 'Talk to sales', highlight: false, voucher: false, badge: '' },
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
    dashboard: {
      user: { enabled: true },
      company: { enabled: true },
      mentor: { enabled: true },
    },
    emails: {
      welcome: { subject: `Welcome to ${name}`, heading: `Welcome to ${name}`, body: 'Thanks for joining. Take your first assessment any time.' },
      voucher: { subject: `Your ${name} voucher code`, heading: 'Here is your voucher code', body: 'Redeem it to take the assessment and unlock your report.' },
      premiumUnlock: { subject: `Your ${name} report is ready`, heading: 'Your report is ready', body: 'Your personalized report is now available.' },
      reportReady: { subject: `Your ${name} result`, heading: 'Your report is ready', body: 'View your score, level, and personalized summary.' },
    },
    seo: {
      title: `${name} - ${title}`,
      description: input.description?.trim() || `Take ${title}: an assessment with an instant free report and a personalized plan.`,
      keywords: [name.toLowerCase(), 'assessment', 'report'],
      ogImageUrl: null,
    },
    integrations: {
      customDomain: null,
      ssoEnabled: false,
      apiEnabled: false,
      webhooks: [],
      analyticsId: null,
    },
  };

  // Parse to fill any remaining defaults and guarantee a valid document.
  return AssessmentAppSchema.parse(draft);
};
