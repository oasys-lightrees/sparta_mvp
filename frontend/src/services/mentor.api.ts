import { apiClient } from '@/services/api';
import type {
  MentorAssessmentDetail,
  MentorAssessmentListItem,
  MentorResult,
  MentorRevenue,
  MentorStats,
} from '@/types';

export const mentorApi = {
  getStats: () => apiClient.get<MentorStats>('/api/mentor/stats'),

  getRevenue: () => apiClient.get<MentorRevenue>('/api/mentor/revenue'),

  listMyAssessments: () =>
    apiClient.get<MentorAssessmentListItem[]>('/api/mentor/assessments'),

  // Editing view: assessment + questions + choices + scores (owner only).
  getEditingDetail: (id: string) =>
    apiClient.get<MentorAssessmentDetail>(`/api/mentor/assessments/${id}`),

  getResults: (id: string) =>
    apiClient.get<MentorResult[]>(`/api/mentor/assessments/${id}/results`),
};
