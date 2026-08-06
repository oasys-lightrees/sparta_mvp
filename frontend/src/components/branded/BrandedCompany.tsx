'use client';

import { useCallback, useEffect, useState } from 'react';
import { voucherApi } from '@/services/voucher.api';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { VoucherBatchDetail, VoucherBatchSummary } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

export function BrandedCompany({
  app,
  assessmentId,
}: {
  app: AssessmentApp;
  assessmentId: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [batches, setBatches] = useState<VoucherBatchSummary[] | null>(null);
  const [selected, setSelected] = useState<VoucherBatchDetail | null>(null);
  const [company, setCompany] = useState('');
  const [credits, setCredits] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const all = await voucherApi.listBatches();
    setBatches(all.filter((b) => b.assessment_id === assessmentId));
  }, [assessmentId]);

  useEffect(() => {
    if (authLoading || !user) return;
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [authLoading, user, load]);

  const open = async (batchId: string) => {
    setError('');
    try {
      setSelected(await voucherApi.getBatch(batchId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open batch');
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || credits < 1) return;
    setBusy(true);
    setError('');
    try {
      const res = await voucherApi.createBatch({
        assessment_id: assessmentId,
        company_name: company.trim(),
        credits,
      });
      setCompany('');
      await load();
      await open(res.batch_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    if (!selected) return;
    navigator.clipboard
      ?.writeText(selected.codes.map((c) => c.code).join('\n'))
      .then(() => {
        setCopied('all');
        setTimeout(() => setCopied(''), 1500);
      })
      .catch(() => {});
  };

  const right = (
    <a href={`/a/${assessmentId}`} style={{ color: 'inherit' }}>
      {app.brand.brandName}
    </a>
  );

  if (!authLoading && !user) {
    const next = encodeURIComponent(`/a/${assessmentId}/company`);
    return (
      <BrandedShell app={app} right={right}>
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

  const packs = app.products.voucherPackages;
  const a = selected?.analytics;

  return (
    <BrandedShell app={app} right={right}>
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

        {error ? <div className="lato-note" style={{ marginBottom: 16 }}>{error}</div> : null}

        {/* Buy a package */}
        <div className="lato-card">
          <h3 style={{ fontWeight: 700 }}>Buy a voucher package</h3>
          <p style={{ color: 'var(--muted)', fontSize: '.92rem', marginTop: 4 }}>
            We generate one unique code per credit. Share them with employees — each
            covers a full assessment and premium report, and results roll up here.
          </p>
          <form
            onSubmit={create}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 16 }}
          >
            <label className="lato-field" style={{ margin: 0, flex: '1 1 220px' }}>
              Company / team name
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </label>
            <label className="lato-field" style={{ margin: 0, width: 130 }}>
              Credits
              <input
                type="number"
                min={1}
                max={1000}
                value={credits}
                onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <button
              type="submit"
              className="lato-btn lato-btn--grad"
              disabled={busy || !company.trim()}
            >
              {busy ? 'Generating…' : 'Generate codes'}
            </button>
          </form>
          {packs.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {packs.map((p) => (
                <button
                  key={p.credits}
                  type="button"
                  className="lato-pill"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCredits(p.credits)}
                >
                  {p.credits} seats · {p.price}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Batches */}
        <div className="lato-panel">
          <div className="lato-panel__h">Your packages</div>
          {batches === null ? (
            <div className="lato-empty">Loading…</div>
          ) : batches.length === 0 ? (
            <div className="lato-empty">
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No packages yet</p>
              <p style={{ marginTop: 6 }}>Buy one above to get shareable voucher codes.</p>
            </div>
          ) : (
            <table className="lato-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Credits</th>
                  <th>Redeemed</th>
                  <th>Purchased</th>
                  <th style={{ textAlign: 'right' }}>Codes</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch_id}>
                    <td className="n">{b.company_name}</td>
                    <td>{b.credits}</td>
                    <td>
                      <span className="lato-st lato-st--wait">
                        {b.redeemed}/{b.credits}
                      </span>
                    </td>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => open(b.batch_id)}
                        className="lato-btn lato-btn--ghost"
                        style={{ padding: '.45em .8em', fontSize: '.82rem' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected batch: analytics + codes */}
        {selected && a ? (
          <>
            <div className="lato-dash__head" style={{ marginTop: 26, marginBottom: 14 }}>
              <div>
                <span className="lato-eyebrow">{selected.company_name}</span>
                <h1 style={{ fontSize: '1.3rem' }}>Team analytics</h1>
              </div>
            </div>
            <div className="lato-kpis">
              <div className="lato-kpi">
                <div className="lato-kpi__k">Redeemed</div>
                <div className="lato-kpi__v">
                  {a.redeemed}
                  <span style={{ fontSize: '.9rem', color: 'var(--muted)' }}>/{a.credits}</span>
                </div>
              </div>
              <div className="lato-kpi">
                <div className="lato-kpi__k">Completed</div>
                <div className="lato-kpi__v">{a.completed}</div>
              </div>
              <div className="lato-kpi">
                <div className="lato-kpi__k">Completion rate</div>
                <div className="lato-kpi__v">{a.completion_rate}%</div>
              </div>
              {/* Average score is meaningless for personality tests. */}
              {!selected.is_personality ? (
                <div className="lato-kpi">
                  <div className="lato-kpi__k">Average score</div>
                  <div className="lato-kpi__v">{a.average_score}</div>
                </div>
              ) : null}
            </div>

            {/* Per-person results */}
            <div className="lato-panel" style={{ marginTop: 16 }}>
              <div className="lato-panel__h">Individual results</div>
              {selected.redeemers.length === 0 ? (
                <div className="lato-empty">
                  <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No redemptions yet</p>
                  <p style={{ marginTop: 6 }}>
                    Once employees redeem their codes and take the assessment, their
                    results appear here.
                  </p>
                </div>
              ) : (
                <table className="lato-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Code</th>
                      <th>Redeemed</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>
                        {selected.is_personality ? 'Result' : 'Score'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.redeemers.map((r) => (
                      <tr key={r.code}>
                        <td className="n">
                          {r.name?.trim() || r.email}
                          {r.name?.trim() ? (
                            <span style={{ color: 'var(--muted)', display: 'block', fontSize: '.8rem' }}>
                              {r.email}
                            </span>
                          ) : null}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{r.code}</td>
                        <td>{r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`lato-st ${r.completed ? 'lato-st--ok' : 'lato-st--wait'}`}>
                            {r.completed ? 'Completed' : 'Not started'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {r.result ?? (r.score !== null ? r.score : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="lato-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700 }}>Voucher codes</h3>
                <button className="lato-btn lato-btn--ghost" style={{ padding: '.45em .8em', fontSize: '.82rem' }} onClick={copyAll}>
                  {copied === 'all' ? 'Copied ✓' : 'Copy all'}
                </button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: '6px 0 12px' }}>
                Share one code per employee. Each covers a full assessment and premium
                report; their score rolls up under Individual results above.
              </p>
              <div className="lato-codes">
                {selected.codes.map((c) => (
                  <span
                    key={c.code}
                    className={`lato-code${c.status === 'REDEEMED' ? ' used' : ''}`}
                    title={c.status === 'REDEEMED' ? 'Redeemed' : 'Available'}
                  >
                    {c.code}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </BrandedShell>
  );
}
