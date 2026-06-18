import { apiClient } from '@/services/api';
import type { AssessmentStatus, BlogDetail, BlogSummary } from '@/types';

type BlogInput = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  status?: AssessmentStatus;
};

export const blogApi = {
  listPublished: () => apiClient.get<BlogSummary[]>('/api/blogs'),

  getBySlug: (slug: string) => apiClient.get<BlogDetail>(`/api/blogs/${slug}`),

  create: (input: BlogInput & { title: string; slug: string }) =>
    apiClient.post<BlogDetail>('/api/blogs', input),

  update: (id: string, input: BlogInput) =>
    apiClient.patch<BlogDetail>(`/api/blogs/${id}`, input),

  remove: (id: string) => apiClient.del<{ id: string }>(`/api/blogs/${id}`),
};
