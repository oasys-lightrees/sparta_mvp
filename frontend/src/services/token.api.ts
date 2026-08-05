import { apiClient } from '@/services/api';
import type {
  PurchaseResult,
  TokenBalance,
  TokenOrderStatus,
  TokenPricing,
} from '@/types';

export const tokenApi = {
  getBalance: () => apiClient.get<TokenBalance>('/api/tokens/me'),

  // Per-token price + whether a real gateway is configured (for the top-up UI).
  getPricing: () => apiClient.get<TokenPricing>('/api/tokens/pricing'),

  // Start a real (Midtrans) token purchase. Falls back to a demo credit when
  // the gateway is not configured — see the discriminated PurchaseResult.
  purchase: (amount: number) =>
    apiClient.post<PurchaseResult>('/api/tokens/purchase', { amount }),

  // Poll a purchase's status after returning from the Midtrans redirect.
  getOrder: (orderId: string) =>
    apiClient.get<TokenOrderStatus>(`/api/tokens/orders/${orderId}`),
};
