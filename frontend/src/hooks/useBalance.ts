'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { balanceApi } from '@/services/balance.api';

// A tiny shared store so every consumer of the wallet balance — the topbar and
// any dashboard card — stays in sync. Updating it after a top-up/purchase
// re-renders all of them at once (per-component state would drift otherwise).
let current: number | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => current;
const getServerSnapshot = () => null;

/** Set the shared wallet balance; call after a top-up or purchase. */
export function setSharedBalance(next: number | null): void {
  if (current === next) return;
  current = next;
  emit();
}

/** Refetch the wallet balance from the API into the shared store. */
export async function refreshBalance(): Promise<void> {
  try {
    const r = await balanceApi.getBalance();
    setSharedBalance(r.balance);
  } catch {
    /* non-fatal — leave the current value */
  }
}

/**
 * The current user's wallet balance (IDR) from the shared store, or null when
 * logged out / still loading. Fetches when the authenticated user changes;
 * call setSharedBalance / refreshBalance elsewhere to keep it current.
 */
export function useBalance(): number | null {
  const { user } = useAuth();
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!user) {
      setSharedBalance(null);
      return;
    }
    void refreshBalance();
  }, [user]);

  return value;
}
