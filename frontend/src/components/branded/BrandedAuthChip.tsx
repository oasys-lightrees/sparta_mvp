'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTokenBalance } from '@/hooks/useTokenBalance';

/**
 * Auth area for the branded landing nav: when signed in it shows the user's
 * token balance + email (linking to their dashboard); otherwise a "Log in"
 * link. Styled with the branded (.lato-*) classes so it inherits the tenant
 * theme. A client component embedded in the server-rendered BrandedLanding.
 */
export function BrandedAuthChip({
  loginHref,
  dashboardHref,
}: {
  loginHref: string;
  dashboardHref: string;
}) {
  const { user, loading } = useAuth();
  const balance = useTokenBalance();

  if (loading) return null;
  if (!user) {
    return (
      <a href={loginHref} className="lato-login">
        Log in
      </a>
    );
  }

  return (
    <a
      href={dashboardHref}
      className="lato-login"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      title="Your dashboard"
    >
      {balance !== null ? (
        <span className="lato-pill" style={{ fontSize: '.72rem' }}>
          ◎ {balance} token{balance === 1 ? '' : 's'}
        </span>
      ) : null}
      <span
        style={{
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user.email}
      </span>
    </a>
  );
}
