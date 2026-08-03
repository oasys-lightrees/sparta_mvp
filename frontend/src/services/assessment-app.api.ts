import { apiClient } from '@/services/api';
import type { AssessmentApp } from '@/types/assessment-app';

export const assessmentAppApi = {
  // Public branded config for a published assessment.
  getConfig: (id: string) =>
    apiClient.get<AssessmentApp>(`/api/assessments/${id}/app-config`),
};
