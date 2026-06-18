// LocalStorage helpers for auth + the pending guest attempt.
// All guarded for SSR (no window on the server).

import type { User } from '@/types';

const TOKEN_KEY = 'sparta_token';
const USER_KEY = 'sparta_user';
const PENDING_ATTEMPT_KEY = 'sparta_pending_attempt';

const hasWindow = () => typeof window !== 'undefined';

export const getToken = (): string | null =>
  hasWindow() ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string): void => {
  if (hasWindow()) localStorage.setItem(TOKEN_KEY, token);
};

export const getStoredUser = (): User | null => {
  if (!hasWindow()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  if (hasWindow()) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = (): void => {
  if (!hasWindow()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Pending guest attempt — stored after submit, consumed after login (claim).
export const getPendingAttempt = (): string | null =>
  hasWindow() ? localStorage.getItem(PENDING_ATTEMPT_KEY) : null;

export const setPendingAttempt = (attemptId: string): void => {
  if (hasWindow()) localStorage.setItem(PENDING_ATTEMPT_KEY, attemptId);
};

export const clearPendingAttempt = (): void => {
  if (hasWindow()) localStorage.removeItem(PENDING_ATTEMPT_KEY);
};
