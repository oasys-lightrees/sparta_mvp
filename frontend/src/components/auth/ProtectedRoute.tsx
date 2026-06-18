'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { roleHome } from '@/lib/roles';
import { Loading } from '@/components/common/Loading';
import type { ReactNode } from 'react';
import type { Role } from '@/types';

/**
 * Client-side guard. Redirects unauthenticated users to /login, and users
 * whose role is not allowed to their own role home.
 */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return <Loading />;
  }

  return <>{children}</>;
}
