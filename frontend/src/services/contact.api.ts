import { apiClient } from '@/services/api';

export const contactApi = {
  submit: (input: {
    name: string;
    email: string;
    phone?: string | null;
    message: string;
  }) => apiClient.post<{ id: string }>('/api/contact', input),
};
