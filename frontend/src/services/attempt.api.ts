import { apiClient } from '@/services/api';
import type { AttemptReport, ClaimResult } from '@/types';

export const attemptApi = {
  claim: (attemptId: string) =>
    apiClient.post<ClaimResult>(`/api/attempts/${attemptId}/claim`),

  getReport: (attemptId: string) =>
    apiClient.get<AttemptReport>(`/api/attempts/${attemptId}/report`),
};
