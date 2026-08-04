import { apiClient } from '@/services/api';
import type {
  CreateBatchResult,
  RedeemResult,
  VoucherBatchDetail,
  VoucherBatchSummary,
} from '@/types';

export const voucherApi = {
  // Company: buy a batch of N credits for an assessment (generates codes).
  createBatch: (input: {
    assessment_id: string;
    company_name: string;
    credits: number;
  }) => apiClient.post<CreateBatchResult>('/api/vouchers/batches', input),

  // Company: the buyer's batches (with redeemed counts).
  listBatches: () => apiClient.get<VoucherBatchSummary[]>('/api/vouchers/batches'),

  // Company: batch detail — codes + aggregated analytics.
  getBatch: (batchId: string) =>
    apiClient.get<VoucherBatchDetail>(`/api/vouchers/batches/${batchId}`),

  // Employee: redeem a code (grants tokens to unlock premium).
  redeem: (code: string) =>
    apiClient.post<RedeemResult>('/api/vouchers/redeem', { code }),
};
