import { apiClient } from '@/services/api';
import type {
  MentorProduct,
  ProductContentBlock,
  ProductStatus,
  ProductTiers,
  PublicProduct,
  VoucherPackage,
} from '@/types';

export type UpsertProductInput = {
  name?: string;
  description?: string | null;
  status?: ProductStatus;
  tiers?: ProductTiers;
  voucherPackages?: VoucherPackage[];
  content?: ProductContentBlock[];
};

export const productApi = {
  // Public: PUBLISHED product tiers for a landing page (data is null if none).
  getPublic: (assessmentId: string) =>
    apiClient.get<PublicProduct | null>(`/api/products/by-assessment/${assessmentId}`),

  // Mentor: the product for one of their assessments (any status; null if none).
  getMine: (assessmentId: string) =>
    apiClient.get<MentorProduct | null>(
      `/api/products/mine/by-assessment/${assessmentId}`,
    ),

  // Mentor: create or update (upsert) the product for an assessment.
  upsert: (assessmentId: string, input: UpsertProductInput) =>
    apiClient.post<MentorProduct>(`/api/products/by-assessment/${assessmentId}`, input),
};
