'use client';

import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import { BrandedShell, LatoIcon } from './shell';
import { CompanyVouchers } from './CompanyVouchers';

export function BrandedCompany({
  app,
  assessmentId,
}: {
  app: AssessmentApp;
  assessmentId: string;
}) {
  const { user, loading: authLoading } = useAuth();

  const home = `/a/${assessmentId}`;
  const homeBack = { href: home, label: 'Home' };
  const dashboardBack = { href: `${home}/dashboard`, label: 'Dashboard' };

  if (!authLoading && !user) {
    const next = encodeURIComponent(`/a/${assessmentId}/company`);
    return (
      <BrandedShell app={app} homeHref={home} back={homeBack}>
        <div className="lato-intro">
          <div className="lato-card__i" style={{ margin: '0 auto 16px' }}>
            <LatoIcon name="lock" />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>Company portal</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Log in to buy voucher packages and see your team&apos;s results.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href={`/login?next=${next}`} className="lato-btn lato-btn--grad lato-btn--lg">
              Log in
            </a>
            <a href={`/register?next=${next}`} className="lato-btn lato-btn--ghost lato-btn--lg">
              Create account
            </a>
          </div>
        </div>
      </BrandedShell>
    );
  }

  return (
    <BrandedShell app={app} homeHref={home} back={dashboardBack}>
      <div className="lato-dash">
        <div className="lato-dash__head">
          <div>
            <span className="lato-eyebrow">{app.brand.brandName} · for companies</span>
            <h1>Company portal</h1>
          </div>
          <a href={`/a/${assessmentId}/redeem`} className="lato-btn lato-btn--ghost">
            Redeem a code
          </a>
        </div>
        <CompanyVouchers assessmentId={assessmentId} />
      </div>
    </BrandedShell>
  );
}
