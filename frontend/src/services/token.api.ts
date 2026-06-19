import { apiClient } from '@/services/api';
import type { TokenBalance } from '@/types';

export const tokenApi = {
  getBalance: () => apiClient.get<TokenBalance>('/api/tokens/me'),

  topupDemo: (amount: number) =>
    apiClient.post<TokenBalance>('/api/tokens/topup-demo', { amount }),
};
