import { apiClient } from '@/services/api';
import type { AuthResult, User } from '@/types';

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    apiClient.post<User>('/api/auth/register', input),

  login: (input: { email: string; password: string }) =>
    apiClient.post<AuthResult>('/api/auth/login', input),

  me: () => apiClient.get<User>('/api/auth/me'),
};
