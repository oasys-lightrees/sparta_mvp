import { apiClient } from '@/services/api';
import type {
  BalanceInfo,
  BalancePricing,
  OrderStatus,
  PurchaseResult,
} from '@/types';

export const balanceApi = {
  getBalance: () => apiClient.get<BalanceInfo>('/api/balance/me'),

  // Currency + whether a real gateway is configured (for the top-up UI).
  getPricing: () => apiClient.get<BalancePricing>('/api/balance/pricing'),

  // Start a real (Midtrans) top-up. Falls back to a demo credit when the gateway
  // is not configured — see the discriminated PurchaseResult. `amount` is IDR.
  // `returnUrl` (absolute) is where Midtrans returns the browser after payment;
  // it must be on an allowed origin or the backend ignores it.
  purchase: (amount: number, returnUrl?: string) =>
    apiClient.post<PurchaseResult>('/api/balance/purchase', {
      amount,
      ...(returnUrl ? { return_url: returnUrl } : {}),
    }),

  // Poll a top-up's status after returning from the Midtrans redirect.
  getOrder: (orderId: string) =>
    apiClient.get<OrderStatus>(`/api/balance/orders/${orderId}`),
};
