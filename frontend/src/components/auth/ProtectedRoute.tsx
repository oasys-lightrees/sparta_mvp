'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { roleHome } from '@/lib/roles';
import { Loading } from '@/components/common/Loading';
import type { ReactNode } from 'react';
import type { Role } from '@/types';

/**
 * Client-side guard. Redirects unauthenticated users to the login page
 * (`/login` by default, overridable via `loginPath`), and users whose role is
 * not allowed to their own role home.
 */
export function ProtectedRoute({
  roles,
  loginPath = '/login',
  children,
}: {
  roles?: Role[];
  loginPath?: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(loginPath);
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [loading, user, roles, router, loginPath]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return <Loading />;
  }

  return <>{children}</>;
}
