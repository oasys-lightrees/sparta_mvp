// Mirrors the backend AssessmentApp config (config/assessment-app.schema.ts).
// The reusable branded frontend renders entirely from this object.

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  onBrand: string;
}

export interface Brand {
  brandName: string;
  monogram: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandColors;
  typography: { display: 'sans' | 'grotesk' | 'serif'; body: 'sans' | 'serif' };
  iconStyle: 'line' | 'solid';
  illustrationStyle: 'mesh' | 'flat' | 'photo';
}

export interface ThemeTokens {
  radius: 'sharp' | 'soft' | 'round';
  spacing: 'compact' | 'regular' | 'roomy';
  gradients: boolean;
  animations: 'full' | 'reduced';
}

export interface Stat {
  value: string;
  label: string;
}
export interface Feature {
  icon: string;
  title: string;
  body: string;
}
export interface Step {
  title: string;
  body: string;
}
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
}
export interface Faq {
  q: string;
  a: string;
}

export interface Landing {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    description: string;
    heroImageUrl: string | null;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  trust: { lead: string; companies: string[]; stats: Stat[] };
  features: Feature[];
  process: Step[];
  testimonials: Testimonial[];
  faq: Faq[];
  finalCta: { title: string; subtitle: string; button: string; fineprint: string };
}

export interface Plan {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
  voucher: boolean;
  badge: string;
  grantsTier: Tier;
}

export type Tier = 'free' | 'pro' | 'company' | 'enterprise';

export interface Modules {
  landing: boolean;
  assessment: boolean;
  freeReport: boolean;
  premiumReport: boolean;
  studyResources: boolean;
  userDashboard: boolean;
  companyDashboard: boolean;
  mentorDashboard: boolean;
  vouchers: boolean;
  certificates: boolean;
  referral: boolean;
}

export interface AiConfig {
  enabled: boolean;
  provider: 'openai';
  model: string | null;
  persona: string;
  tone: 'professional' | 'warm' | 'direct' | 'playful';
  temperature: number | null;
  capabilities: { questionGeneration: boolean; premiumReport: boolean };
  guardrails: string;
}

export type WebhookEvent =
  | 'assessment.completed'
  | 'report.unlocked'
  | 'voucher.redeemed'
  | 'batch.purchased';

export interface Automation {
  webhooks: { event: WebhookEvent; url: string; secret: string | null }[];
}

export interface Integrations {
  customDomain: string | null;
  sso: { enabled: boolean; provider: 'none' | 'saml' | 'oidc'; metadataUrl: string | null };
  scimEnabled: boolean;
  api: { enabled: boolean };
  analyticsId: string | null;
}

export interface Settings {
  defaultLocale: 'en' | 'id';
  removeBranding: boolean;
}

export interface Products {
  eyebrow: string;
  title: string;
  subtitle: string;
  plans: Plan[];
  voucherPackages: { credits: number; price: string }[];
  enterprise: { features: string[] };
}

export interface AssessmentApp {
  version: number;
  tier: Tier;
  modules: Modules;
  featureFlags: Record<string, boolean>;
  brand: Brand;
  theme: ThemeTokens;
  ai: AiConfig;
  landing: Landing;
  assessment: {
    intro: { title: string; body: string };
    meta: {
      estimatedMinutes: number;
      questionCount: number;
      audience: string;
      benefits: string[];
    };
    timerEnabled: boolean;
    completion: { title: string; body: string };
  };
  reports: {
    free: { title: string };
    premium: { title: string };
    competencies: { key: string }[];
    roadmapEnabled: boolean;
    pdf: { footer: string };
  };
  products: Products;
  automation: Automation;
  integrations: Integrations;
  emails: Record<string, { subject: string; heading: string; body: string }>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImageUrl: string | null;
  };
  settings: Settings;
  metadata: Record<string, unknown>;
}
