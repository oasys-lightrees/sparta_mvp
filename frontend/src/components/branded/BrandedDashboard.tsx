'use client';

import { useEffect, useState } from 'react';
import { attemptApi } from '@/services/attempt.api';
import { balanceApi } from '@/services/balance.api';
import { formatIdr } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import { TopUpDialog } from '@/components/wallet/TopUpDialog';
import type { AssessmentApp } from '@/types/assessment-app';
import type { MyAttempt } from '@/types';
import { BrandedShell, LatoIcon } from './shell';
import { CompanyVouchers } from './CompanyVouchers';

export function BrandedDashboard({
  app,
  assessmentId,
}: {
  app: AssessmentApp;
  assessmentId: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<MyAttempt[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    (async () => {
      try {
        const [mine, wallet] = await Promise.all([
          attemptApi.listMine(),
          balanceApi.getBalance(),
        ]);
        if (!active) return;
        setAttempts(mine.filter((a) => a.assessment_id === assessmentId));
        setBalance(wallet.balance);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading, assessmentId]);

  const home = `/a/${assessmentId}`;
  const homeBack = { href: home, label: 'Home' };

  // Confirm a top-up after returning from the Midtrans redirect (order_id in
  // the query), then clean the URL — mirrors the platform dashboard.
  useEffect(() => {
    if (authLoading || !user) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) return;
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      try {
        const order = await balanceApi.getOrder(orderId);
        setBalance(order.balance);
        if (order.status === 'PAID') {
          setNotice(
            `Payment received. ${formatIdr(order.amount)} added to your balance.`,
          );
        } else if (order.status === 'PENDING') {
          setNotice(
            'Payment is being processed. Your balance will update once it settles.',
          );
        }
      } catch {
        /* stale/foreign order id — ignore */
      }
    })();
  }, [authLoading, user]);

  const topUp = async (amount: number) => {
    setBusy(true);
    setTopUpError('');
    setNotice('');
    try {
      const result = await balanceApi.purchase(
        amount,
        `${window.location.origin}/a/${assessmentId}/dashboard`,
      );
      if (result.mode === 'midtrans') {
        window.location.href = result.redirect_url;
        return;
      }
      setBalance(result.balance);
      setTopUpOpen(false);
      setNotice(`Added ${formatIdr(amount)} to your balance.`);
    } catch (e) {
      setTopUpError(e instanceof Error ? e.message : 'Top-up failed');
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && !user) {
    const next = encodeURIComponent(`/a/${assessmentId}/dashboard`);
    return (
      <BrandedShell app={app} homeHref={home} back={homeBack}>
        <div className="lato-intro">
          <div className="lato-card__i" style={{ margin: '0 auto 16px' }}>
            <LatoIcon name="lock" />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>Your dashboard</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Log in to see your assessment history and reports.
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

  // Personality assessments resolve to a result category, not a numeric score.
  const isPersonality = Boolean(attempts?.some((a) => a.result_profile));

  return (
    <BrandedShell app={app} homeHref={home} back={homeBack}>
      <div className="lato-dash">
        <div className="lato-dash__head">
          <div>
            <span className="lato-eyebrow">{app.brand.brandName}</span>
            <h1>Your dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={`/a/${assessmentId}/redeem`} className="lato-btn lato-btn--ghost">
              Redeem voucher
            </a>
          </div>
        </div>

        {error ? <div className="lato-note">{error}</div> : null}
        {notice ? (
          <div className="lato-note lato-note--ok">{notice}</div>
        ) : null}

        <div className="lato-kpis">
          <div className="lato-kpi">
            <div className="lato-kpi__k">Wallet balance</div>
            <div className="lato-kpi__v">{balance === null ? '—' : formatIdr(balance)}</div>
            <button
              type="button"
              className="lato-btn lato-btn--ghost"
              style={{ marginTop: 10, padding: '.4em .8em', fontSize: '.82rem' }}
              onClick={() => {
                setTopUpError('');
                setTopUpOpen(true);
              }}
            >
              Top up
            </button>
          </div>
          <div className="lato-kpi">
            <div className="lato-kpi__k">Assessments taken</div>
            <div className="lato-kpi__v">{attempts === null ? '—' : attempts.length}</div>
          </div>
        </div>

        {attempts && attempts.length === 0 ? (
          <div className="lato-panel">
            <div className="lato-empty">
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No attempts yet</p>
              <p style={{ marginTop: 6 }}>Take the assessment to see your results here.</p>
              <a
                href={`/a/${assessmentId}#products`}
                className="lato-btn lato-btn--grad"
                style={{ marginTop: 16 }}
              >
                Start assessment
              </a>
            </div>
          </div>
        ) : (
          <div className="lato-panel">
            <div className="lato-panel__h">Assessment history</div>
            <table className="lato-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{isPersonality ? 'Result' : 'Score'}</th>
                  <th style={{ textAlign: 'right' }}>Report</th>
                </tr>
              </thead>
              <tbody>
                {(attempts ?? []).map((a) => (
                  <tr key={a.attempt_id}>
                    <td className="n">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>{isPersonality ? a.result_profile?.name ?? '—' : a.score}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={`/a/${assessmentId}/report/${a.attempt_id}`}
                        className="lato-btn lato-btn--ghost"
                        style={{ padding: '.45em .8em', fontSize: '.82rem' }}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Team vouchers — the company portal, embedded in the dashboard */}
        <div id="company" style={{ marginTop: 30 }}>
          <div className="lato-dash__head" style={{ marginBottom: 14 }}>
            <div>
              <span className="lato-eyebrow">For teams</span>
              <h1 style={{ fontSize: '1.3rem' }}>Team vouchers</h1>
            </div>
          </div>
          <CompanyVouchers assessmentId={assessmentId} />
        </div>
      </div>

      <TopUpDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onConfirm={topUp}
        submitting={busy}
        error={topUpError}
      />
    </BrandedShell>
  );
}
