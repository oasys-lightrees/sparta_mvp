'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { balanceApi } from '@/services/balance.api';

/**
 * The current user's wallet balance (IDR), or null when logged out / still
 * loading. Refetches whenever the authenticated user changes.
 */
export function useBalance(): number | null {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    let active = true;
    balanceApi
      .getBalance()
      .then((r) => {
        if (active) setBalance(r.balance);
      })
      .catch(() => {
        /* non-fatal — leave balance null */
      });
    return () => {
      active = false;
    };
  }, [user]);

  return balance;
}
