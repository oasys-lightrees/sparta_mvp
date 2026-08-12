import { apiClient } from '@/services/api';
import type { AssessmentApp } from '@/types/assessment-app';

// Deep-partial patch for the landing/branding config. The backend deep-merges
// this onto the current config, so only edited fields need to be sent.
export type AppConfigPatch = {
  brand?: {
    brandName?: string;
    monogram?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    colors?: { primary?: string; secondary?: string; accent?: string };
  };
  theme?: {
    mode?: 'light' | 'dark' | 'auto';
    radius?: 'sharp' | 'soft' | 'round';
  };
  landing?: {
    hero?: {
      eyebrow?: string;
      title?: string;
      subtitle?: string;
      description?: string;
      heroImageUrl?: string | null;
      ctaPrimary?: string;
      ctaSecondary?: string;
    };
    about?: {
      enabled?: boolean;
      title?: string;
      body?: string;
      imageUrl?: string | null;
    };
    benefits?: {
      enabled?: boolean;
      title?: string;
      items?: { title: string; body: string; imageUrl: string | null }[];
    };
    contact?: {
      enabled?: boolean;
      title?: string;
      name?: string;
      whatsapp?: string;
    };
    finalCta?: { enabled?: boolean; title?: string; subtitle?: string; button?: string };
  };
  seo?: { title?: string; description?: string };
};

export const assessmentAppApi = {
  // Public branded config for a published assessment.
  getConfig: (id: string) =>
    apiClient.get<AssessmentApp>(`/api/assessments/${id}/app-config`),

  // Mentor (owner): read the full config for editing (any status).
  getMentorConfig: (id: string) =>
    apiClient.get<AssessmentApp>(`/api/mentor/assessments/${id}/app-config`),

  // Mentor (owner): deep-merge a partial patch onto the config.
  updateConfig: (id: string, patch: AppConfigPatch) =>
    apiClient.patch<AssessmentApp>(
      `/api/mentor/assessments/${id}/app-config`,
      patch,
    ),

  // Mentor (owner): reset the config back to a generated default.
  resetConfig: (id: string) =>
    apiClient.post<AssessmentApp>(
      `/api/mentor/assessments/${id}/app-config/reset`,
    ),
};
