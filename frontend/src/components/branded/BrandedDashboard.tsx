'use client';

import { useEffect, useState } from 'react';
import { attemptApi } from '@/services/attempt.api';
import { tokenApi } from '@/services/token.api';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { MyAttempt } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

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

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    (async () => {
      try {
        const [mine, wallet] = await Promise.all([
          attemptApi.listMine(),
          tokenApi.getBalance(),
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

  const right = (
    <a href={`/a/${assessmentId}`} style={{ color: 'inherit' }}>
      {app.brand.brandName}
    </a>
  );

  if (!authLoading && !user) {
    const next = encodeURIComponent(`/a/${assessmentId}/dashboard`);
    return (
      <BrandedShell app={app} right={right}>
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

  const unlocked = attempts?.filter((a) => a.premium_unlocked).length ?? 0;
  const latest = attempts?.[0]?.score;

  return (
    <BrandedShell app={app} right={right}>
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
            <a href={`/a/${assessmentId}/start`} className="lato-btn lato-btn--grad">
              Take again
            </a>
          </div>
        </div>

        {error ? <div className="lato-note">{error}</div> : null}

        <div className="lato-kpis">
          <div className="lato-kpi">
            <div className="lato-kpi__k">Assessments taken</div>
            <div className="lato-kpi__v">{attempts === null ? '—' : attempts.length}</div>
          </div>
          <div className="lato-kpi">
            <div className="lato-kpi__k">Premium reports</div>
            <div className="lato-kpi__v">{attempts === null ? '—' : unlocked}</div>
          </div>
          <div className="lato-kpi">
            <div className="lato-kpi__k">Token balance</div>
            <div className="lato-kpi__v">{balance === null ? '—' : balance}</div>
          </div>
          <div className="lato-kpi">
            <div className="lato-kpi__k">Latest score</div>
            <div className="lato-kpi__v">{latest === undefined ? '—' : latest}</div>
          </div>
        </div>

        {attempts && attempts.length === 0 ? (
          <div className="lato-panel">
            <div className="lato-empty">
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No attempts yet</p>
              <p style={{ marginTop: 6 }}>Take the assessment to see your results here.</p>
              <a
                href={`/a/${assessmentId}/start`}
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
                  <th>Score</th>
                  <th style={{ textAlign: 'right' }}>Report</th>
                </tr>
              </thead>
              <tbody>
                {(attempts ?? []).map((a) => (
                  <tr key={a.attempt_id}>
                    <td className="n">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>{a.score}</td>
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

        {/* Recommendations */}
        <div className="lato-recs">
          <div className="lato-card">
            <div className="lato-card__i">
              <LatoIcon name="spark" />
            </div>
            <h3 style={{ fontWeight: 700 }}>Recommended next</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.92rem', marginTop: 6 }}>
              {app.assessment.meta.benefits[0] ??
                `Keep building on your ${app.brand.brandName} results with the premium blueprint.`}
            </p>
          </div>
          <div className="lato-card">
            <div className="lato-card__i">
              <LatoIcon name="download" />
            </div>
            <h3 style={{ fontWeight: 700 }}>Your reports</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.92rem', marginTop: 6 }}>
              {unlocked > 0
                ? `You have ${unlocked} premium report${unlocked > 1 ? 's' : ''}. Open one to export a branded PDF.`
                : 'Unlock a premium report to get your personalized AI blueprint and study resources.'}
            </p>
          </div>
        </div>
      </div>
    </BrandedShell>
  );
}
