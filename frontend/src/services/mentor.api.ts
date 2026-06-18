import { apiClient } from '@/services/api';
import type {
  MentorAssessmentDetail,
  MentorAssessmentListItem,
  MentorResult,
} from '@/types';

export const mentorApi = {
  listMyAssessments: () =>
    apiClient.get<MentorAssessmentListItem[]>('/api/mentor/assessments'),

  // Editing view: assessment + questions + choices + scores (owner only).
  getEditingDetail: (id: string) =>
    apiClient.get<MentorAssessmentDetail>(`/api/mentor/assessments/${id}`),

  getResults: (id: string) =>
    apiClient.get<MentorResult[]>(`/api/mentor/assessments/${id}/results`),
};
