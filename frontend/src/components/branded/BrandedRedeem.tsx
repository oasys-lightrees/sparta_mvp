'use client';

import { useState } from 'react';
import { voucherApi } from '@/services/voucher.api';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { RedeemResult } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

export function BrandedRedeem({
  app,
  assessmentId,
  initialCode = '',
}: {
  app: AssessmentApp;
  assessmentId: string;
  initialCode?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState(initialCode.trim().toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RedeemResult | null>(null);

  const home = `/a/${assessmentId}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResult(await voucherApi.redeem(code.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redemption failed');
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && !user) {
    // Preserve the entered code so it's still there after logging in.
    const redeemPath = `/a/${assessmentId}/redeem${code ? `?code=${encodeURIComponent(code)}` : ''}`;
    const next = encodeURIComponent(redeemPath);
    return (
      <BrandedShell app={app} homeHref={home}>
        <div className="lato-intro">
          <div className="lato-card__i" style={{ margin: '0 auto 16px' }}>
            <LatoIcon name="lock" />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>Redeem a voucher</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Log in or create a free account to redeem your company voucher code.
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
    <BrandedShell app={app} homeHref={home}>
      <div className="lato-intro">
        <span className="lato-eyebrow" style={{ justifyContent: 'center' }}>
          {app.brand.brandName}
        </span>
        <h1 style={{ marginTop: 12 }}>Redeem your voucher</h1>

        {result ? (
          <>
            <div
              className="lato-card__i"
              style={{ margin: '22px auto 14px', width: 56, height: 56 }}
            >
              <LatoIcon name="check" size={26} />
            </div>
            <p className="lato-sub" style={{ marginInline: 'auto' }}>
              Success! You&apos;ve unlocked <b>{result.assessment_title}</b>.
            </p>
            <div style={{ marginTop: 24 }}>
              <a
                href={`/a/${assessmentId}/start`}
                className="lato-btn lato-btn--grad lato-btn--lg"
              >
                Start the assessment
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 12 }}>
              Enter the code your company shared with you. It unlocks full access
              to this assessment.
            </p>
            <form onSubmit={submit} style={{ maxWidth: 360, margin: '22px auto 0' }}>
              <label className="lato-field">
                Voucher code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-EF23-GH45"
                  autoComplete="off"
                  style={{ fontFamily: 'var(--mono)', letterSpacing: '.05em' }}
                />
              </label>
              {error ? (
                <div className="lato-note" style={{ marginTop: 12 }}>
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                className="lato-btn lato-btn--grad lato-btn--lg lato-btn--block"
                style={{ marginTop: 16 }}
                disabled={busy || !code.trim()}
              >
                {busy ? 'Redeeming…' : 'Redeem code'}
              </button>
            </form>
          </>
        )}
      </div>
    </BrandedShell>
  );
}
