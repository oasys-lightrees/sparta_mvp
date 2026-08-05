'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { tokenApi } from '@/services/token.api';

/**
 * The current user's token balance, or null when logged out / still loading.
 * Refetches whenever the authenticated user changes.
 */
export function useTokenBalance(): number | null {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      return;
    }
    let active = true;
    tokenApi
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
