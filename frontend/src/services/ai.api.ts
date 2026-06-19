import { apiClient } from '@/services/api';
import type { AIQuestionPreview } from '@/types';

export const aiApi = {
  // Preview structured questions from pasted text (mentor reviews before save).
  previewQuestions: (assessmentId: string, rawText: string) =>
    apiClient.post<AIQuestionPreview[]>(
      `/api/mentor/assessments/${assessmentId}/ai/questions`,
      { rawText },
    ),
};
