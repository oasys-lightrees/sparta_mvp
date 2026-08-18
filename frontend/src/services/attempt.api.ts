import { apiClient } from '@/services/api';
import type { ClaimResult, MyAttempt, ReportResponse } from '@/types';

export const attemptApi = {
  claim: (attemptId: string) =>
    apiClient.post<ClaimResult>(`/api/attempts/${attemptId}/claim`),

  getReport: (attemptId: string) =>
    apiClient.get<ReportResponse>(`/api/attempts/${attemptId}/report`),

  listMine: () => apiClient.get<MyAttempt[]>('/api/attempts/me'),
};

