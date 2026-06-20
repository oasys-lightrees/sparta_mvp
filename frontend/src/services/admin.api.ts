import { apiClient } from '@/services/api';
import type {
  AdminAnalytics,
  AdminAssessment,
  AdminContact,
  AdminStats,
  AdminUser,
  AssessmentStatus,
  ContactStatus,
  Role,
} from '@/types';

export const adminApi = {
  // Users
  listUsers: () => apiClient.get<AdminUser[]>('/api/admin/users'),

  changeUserRole: (id: string, role: Role) =>
    apiClient.patch<{ id: string; role: Role }>(
      `/api/admin/users/${id}/role`,
      { role },
    ),

  grantTokens: (id: string, amount: number) =>
    apiClient.patch<{ id: string; token_balance: number }>(
      `/api/admin/users/${id}/tokens`,
      { amount },
    ),

  // Stats
  getStats: () => apiClient.get<AdminStats>('/api/admin/stats'),

  getAnalytics: () => apiClient.get<AdminAnalytics>('/api/admin/analytics'),

  // Assessments (moderation)
  listAssessments: () =>
    apiClient.get<AdminAssessment[]>('/api/admin/assessments'),

  updateAssessment: (
    id: string,
    input: { status?: AssessmentStatus; price?: number },
  ) =>
    apiClient.patch<{ id: string; status: AssessmentStatus; price: number }>(
      `/api/admin/assessments/${id}`,
      input,
    ),

  deleteAssessment: (id: string) =>
    apiClient.del<{ id: string }>(`/api/admin/assessments/${id}`),

  // Contacts
  listContacts: () => apiClient.get<AdminContact[]>('/api/admin/contacts'),

  updateContactStatus: (id: string, status: ContactStatus) =>
    apiClient.patch<{ id: string; status: ContactStatus }>(
      `/api/admin/contacts/${id}/status`,
      { status },
    ),
};
