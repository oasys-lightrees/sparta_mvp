import { apiClient } from '@/services/api';
import type {
  AttemptReport,
  ClaimResult,
  MyAttempt,
  UnlockResult,
} from '@/types';

export const attemptApi = {
  claim: (attemptId: string) =>
    apiClient.post<ClaimResult>(`/api/attempts/${attemptId}/claim`),

  getReport: (attemptId: string) =>
    apiClient.get<AttemptReport>(`/api/attempts/${attemptId}/report`),

  listMine: () => apiClient.get<MyAttempt[]>('/api/attempts/me'),

  // Unlock the premium report for a given (FREE) report id.
  unlockPremium: (reportId: string) =>
    apiClient.post<UnlockResult>(`/api/reports/${reportId}/unlock`),
};

