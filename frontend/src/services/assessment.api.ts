import { apiClient } from '@/services/api';
import type {
  AccessMode,
  AccessState,
  Answer,
  AssessmentDetail,
  AssessmentStatus,
  AssessmentSummary,
  LearningResourcesDoc,
  MentorChoice,
  MentorQuestion,
  PurchaseAccessResult,
  ResultCategories,
  SubmitResult,
} from '@/types';

type AssessmentConfig = {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  free_report_text?: string | null;
  low_score_threshold?: number | null;
  high_score_threshold?: number | null;
  price?: number;
  free_report_template?: string | null;
  premium_report_description?: string | null;
  email_template?: string | null;
  base_knowledge?: string | null;
  ai_enabled?: boolean;
  result_categories?: ResultCategories | null;
  study_video_url?: string | null;
  learning_resources?: LearningResourcesDoc | null;
  access_mode?: AccessMode | null;
  access_cost?: number;
};

export const assessmentApi = {
  // Public
  listPublished: () => apiClient.get<AssessmentSummary[]>('/api/assessments'),

  getPublic: (id: string) =>
    apiClient.get<AssessmentDetail>(`/api/assessments/${id}`),

  // Access model: resolve the viewer's access state (drives the take-flow CTA).
  getAccess: (id: string) =>
    apiClient.get<AccessState>(`/api/assessments/${id}/access`),

  // Access model: purchase from balance (idempotent). With a tierId it buys that
  // specific product pricing tier at its own price; without one it buys the
  // assessment's single access cost.
  purchaseAccess: (id: string, tierId?: string) =>
    apiClient.post<PurchaseAccessResult>(
      `/api/assessments/${id}/access/purchase`,
      tierId ? { tier_id: tierId } : {},
    ),

  submit: (
    id: string,
    input: { guest_email?: string; answers: Answer[]; language?: 'en' | 'id' },
  ) => apiClient.post<SubmitResult>(`/api/assessments/${id}/submit`, input),

  // Mentor (owner)
  create: (input: AssessmentConfig & { title: string }) =>
    apiClient.post<{ id: string; status: AssessmentStatus }>(
      '/api/assessments',
      input,
    ),

  update: (id: string, input: AssessmentConfig) =>
    apiClient.patch(`/api/assessments/${id}`, input),

  remove: (id: string) => apiClient.del<{ id: string }>(`/api/assessments/${id}`),

  setStatus: (id: string, status: AssessmentStatus) =>
    apiClient.patch<{ id: string; status: AssessmentStatus }>(
      `/api/assessments/${id}/status`,
      { status },
    ),

  // Questions (owner)
  addQuestion: (
    assessmentId: string,
    input: {
      question_text: string;
      choices: { choice_text: string; score: number; categories?: string[] }[];
      correct_answer?: string | null;
      explanation?: string | null;
    },
  ) =>
    apiClient.post<MentorQuestion>(
      `/api/assessments/${assessmentId}/questions`,
      input,
    ),

  updateQuestion: (
    questionId: string,
    input: {
      question_text?: string;
      choices?: { choice_text: string; score: number; categories?: string[] }[];
    },
  ) => apiClient.patch<MentorQuestion>(`/api/questions/${questionId}`, input),

  deleteQuestion: (questionId: string) =>
    apiClient.del<{ id: string }>(`/api/questions/${questionId}`),
};

export type { AssessmentConfig, MentorChoice };
