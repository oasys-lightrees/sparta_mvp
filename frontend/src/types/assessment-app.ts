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
  // Additive design tokens (default to today's look).
  mode: 'light' | 'dark' | 'auto';
  typographyPreset: 'modern' | 'classic' | 'editorial' | 'technical';
  motion: 'full' | 'subtle' | 'none';
}

export interface Modules {
  landing: boolean;
  assessment: boolean;
  reports: boolean;
  dashboard: boolean;
  vouchers: boolean;
  organization: boolean;
  marketplace: boolean;
  blog: boolean;
  community: boolean;
  analytics: boolean;
}

export interface AiConfig {
  enabled: boolean;
  provider: 'openai';
  model: string | null;
  languages: string[];
  tone: 'professional' | 'warm' | 'direct' | 'playful';
  persona: string;
  temperature: number | null;
  reportOptions: { includeRoadmap: boolean; includeRecommendations: boolean };
  prompts: { systemPromptOverride: string | null };
  guardrails: string;
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
  about: {
    enabled: boolean;
    title: string;
    body: string;
    imageUrl: string | null;
  };
  benefits: {
    enabled: boolean;
    title: string;
    items: { title: string; body: string; imageUrl: string | null }[];
  };
  contact: {
    enabled: boolean;
    title: string;
    name: string;
    whatsapp: string;
  };
  finalCta: {
    enabled: boolean;
    title: string;
    subtitle: string;
    button: string;
    fineprint: string;
  };
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
  // Configuration metadata (additive).
  schemaVersion: number;
  configVersion: number;
  createdAt: string | null;
  updatedAt: string | null;
  // Capability + AI (additive).
  modules: Modules;
  ai: AiConfig;
  brand: Brand;
  theme: ThemeTokens;
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
  dashboard: {
    user: { enabled: boolean };
    company: { enabled: boolean };
    mentor: { enabled: boolean };
  };
  emails: Record<string, { subject: string; heading: string; body: string }>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImageUrl: string | null;
  };
  integrations: {
    customDomain: string | null;
    ssoEnabled: boolean;
    apiEnabled: boolean;
    webhooks: string[];
    analyticsId: string | null;
  };
}
