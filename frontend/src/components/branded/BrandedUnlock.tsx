'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/services/assessment.api';
import { productApi } from '@/services/product.api';
import { voucherApi } from '@/services/voucher.api';
import { attemptApi } from '@/services/attempt.api';
import { formatIdr } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AccessState, PricingTier, PublicProduct } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

// The steps after answering: sign in, then (for gated modes) choose a product
// and pay, or redeem a voucher. Free/already-unlocked results skip straight to
// the report.
type Phase = 'loading' | 'auth' | 'select' | 'pay' | 'redeem' | 'error';

export function BrandedUnlock({
  app,
  assessmentId,
  attemptId,
}: {
  app: AssessmentApp;
  assessmentId: string;
  attemptId: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [access, setAccess] = useState<AccessState | null>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [tier, setTier] = useState<PricingTier | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const home = `/a/${assessmentId}`;
  const reportHref = `/a/${assessmentId}/report/${attemptId}`;
  const dashboardHref = `/a/${assessmentId}/dashboard`;

  const goToReport = useCallback(() => {
    router.replace(reportHref);
  }, [router, reportHref]);

  // Resolve where the taker needs to go: claim the attempt, read the access
  // state, then route to the report (free / already unlocked) or the right
  // unlock step (pay a tier, or redeem a voucher).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhase('auth');
      return;
    }
    let active = true;
    (async () => {
      try {
        await attemptApi.claim(attemptId);
        const [acc, prod] = await Promise.all([
          assessmentApi.getAccess(assessmentId),
          productApi.getPublic(assessmentId).catch(() => null),
        ]);
        if (!active) return;
        setAccess(acc);
        setProduct(prod);

        // Free / freemium, or the user already holds a grant → show the report.
        if (!acc.start_requires_grant || acc.has_access) {
          goToReport();
          return;
        }
        if (acc.grant_via === 'voucher') {
          setPhase('redeem');
          return;
        }
        // Payment: choose a paid tier. Auto-advance when there's exactly one; a
        // misconfigured product with no paid tier falls back to access_cost.
        const paid = (prod?.tiers ?? []).filter(
          (t) => t.enabled && t.kind === 'PAID',
        );
        if (paid.length === 1) {
          setTier(paid[0]);
          setPhase('pay');
        } else if (paid.length === 0) {
          setTier(null);
          setPhase('pay');
        } else {
          setPhase('select');
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Something went wrong');
          setPhase('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, assessmentId, attemptId, goToReport]);

  const cost = tier?.amount ?? access?.access_cost ?? 0;
  const balance = access?.balance ?? 0;
  const affordable = balance >= cost;

  const purchase = async () => {
    setBusy(true);
    setError('');
    try {
      await assessmentApi.purchaseAccess(assessmentId, tier?.id);
      goToReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
      setBusy(false);
    }
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await voucherApi.redeem(code.trim());
      goToReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Redemption failed');
      setBusy(false);
    }
  };

  const back = { href: home, label: 'Home' };

  // --- Register / sign in (results are tied to an account) ---
  if (phase === 'auth') {
    const next = encodeURIComponent(`/a/${assessmentId}/unlock/${attemptId}`);
    return (
      <BrandedShell app={app} homeHref={home} back={back}>
        <div className="lato-intro">
          <div className="lato-card__i" style={{ margin: '0 auto 16px' }}>
            <LatoIcon name="check" />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>You&apos;re done — nice work!</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Create a free account (or log in) to unlock and keep your results.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/register?next=${next}`} className="lato-btn lato-btn--grad lato-btn--lg">
              Create account
            </a>
            <a href={`/login?next=${next}`} className="lato-btn lato-btn--ghost lato-btn--lg">
              Log in
            </a>
          </div>
        </div>
      </BrandedShell>
    );
  }

  // --- Loading (claiming / resolving access, or redirecting to report) ---
  if (phase === 'loading') {
    return (
      <BrandedShell app={app} homeHref={home} back={back}>
        <div className="lato-loading">
          <div className="lato-spinner" />
        </div>
      </BrandedShell>
    );
  }

  if (phase === 'error') {
    return (
      <BrandedShell app={app} homeHref={home} back={back}>
        <div className="lato-note" style={{ maxWidth: 520, margin: '40px auto' }}>
          {error || 'Something went wrong.'}
        </div>
      </BrandedShell>
    );
  }

  // --- Select a product (multiple paid tiers) ---
  if (phase === 'select') {
    const paid = (product?.tiers ?? []).filter(
      (t) => t.enabled && t.kind === 'PAID',
    );
    return (
      <BrandedShell app={app} homeHref={home} back={back}>
        <div className="lato-intro">
          <span className="lato-eyebrow" style={{ justifyContent: 'center' }}>
            One last step
          </span>
          <h1 style={{ marginTop: 12, fontSize: '1.7rem' }}>Choose your report</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Pick a package to unlock your results and everything that comes with it.
          </p>
          <div style={{ display: 'grid', gap: 14, marginTop: 24, textAlign: 'left' }}>
            {paid.map((t) => (
              <button
                key={t.id}
                className="lato-card"
                onClick={() => {
                  setTier(t);
                  setPhase('pay');
                }}
                style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                  <strong style={{ fontWeight: 750, fontSize: '1.05rem' }}>{t.title || 'Report'}</strong>
                  <span style={{ fontWeight: 800 }}>{formatIdr(t.amount)}</span>
                </div>
                {t.description ? (
                  <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginTop: 6 }}>
                    {t.description}
                  </p>
                ) : null}
                <span className="lato-btn lato-btn--ghost" style={{ marginTop: 12 }}>
                  {t.ctaLabel || 'Choose'} →
                </span>
              </button>
            ))}
          </div>
        </div>
      </BrandedShell>
    );
  }

  // --- Redeem a voucher ---
  if (phase === 'redeem') {
    return (
      <BrandedShell app={app} homeHref={home} back={back}>
        <div className="lato-intro">
          <span className="lato-eyebrow" style={{ justifyContent: 'center' }}>
            One last step
          </span>
          <h1 style={{ marginTop: 12, fontSize: '1.7rem' }}>Redeem your voucher</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Enter the code your company shared with you to unlock your results.
          </p>
          <form onSubmit={redeem} style={{ maxWidth: 360, margin: '22px auto 0' }}>
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
              {busy ? 'Redeeming…' : 'Unlock my results'}
            </button>
          </form>
        </div>
      </BrandedShell>
    );
  }

  // --- Pay for the chosen tier (or fall back to the access cost) ---
  return (
    <BrandedShell app={app} homeHref={home} back={back}>
      <div className="lato-intro">
        <span className="lato-eyebrow" style={{ justifyContent: 'center' }}>
          One last step
        </span>
        <div className="lato-card" style={{ marginTop: 18, textAlign: 'center', maxWidth: 420, marginInline: 'auto' }}>
          <span className="lato-pill">
            <LatoIcon name="lock" size={13} /> {tier?.title || 'Unlock your results'}
          </span>
          <h3 style={{ margin: '12px 0 6px', fontWeight: 750 }}>
            Unlock for {formatIdr(cost)}
          </h3>
          {tier?.description ? (
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 6 }}>
              {tier.description}
            </p>
          ) : null}
          <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
            Your balance: {formatIdr(balance)}
          </p>
          {error ? (
            <div className="lato-note" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
          <div style={{ marginTop: 16 }}>
            {affordable ? (
              <button
                className="lato-btn lato-btn--grad lato-btn--lg"
                onClick={purchase}
                disabled={busy}
              >
                {busy ? 'Processing…' : `Pay ${formatIdr(cost)} to unlock`}
              </button>
            ) : (
              <>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 12 }}>
                  You need {formatIdr(cost - balance)} more in your balance.
                </p>
                <a
                  href={`${dashboardHref}?next=${encodeURIComponent(`/a/${assessmentId}/unlock/${attemptId}`)}`}
                  className="lato-btn lato-btn--grad lato-btn--lg"
                >
                  Top up balance
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </BrandedShell>
  );
}
