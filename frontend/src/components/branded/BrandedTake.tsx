'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/services/assessment.api';
import { formatIdr } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AccessState, AssessmentDetail } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

type Phase = 'intro' | 'taking' | 'submitting';

/** Access gate shown in the intro when a gated mode (PAID/VOUCHER) needs a grant. */
function AccessGate({
  access,
  needsAuth,
  purchasing,
  error,
  assessmentId,
  onPurchase,
}: {
  access: AccessState | null;
  needsAuth: boolean;
  purchasing: boolean;
  error: string;
  assessmentId: string;
  onPurchase: () => void;
}) {
  if (!access) return null;
  const next = encodeURIComponent(`/a/${assessmentId}/start`);

  // Must be logged in to pay/redeem.
  if (needsAuth) {
    return (
      <div className="lato-card" style={{ marginTop: 24, textAlign: 'center' }}>
        <span className="lato-pill">
          <LatoIcon name="lock" size={13} /> Sign in required
        </span>
        <p style={{ color: 'var(--muted)', margin: '12px 0 16px' }}>
          {access.grant_via === 'voucher'
            ? 'Log in to redeem your voucher and start this assessment.'
            : 'Log in to get access and start this assessment.'}
        </p>
        <a href={`/login?next=${next}`} className="lato-btn lato-btn--grad lato-btn--lg">
          Log in to continue
        </a>
      </div>
    );
  }

  // VOUCHER: redeem a code to gain access.
  if (access.grant_via === 'voucher') {
    return (
      <div className="lato-card" style={{ marginTop: 24, textAlign: 'center' }}>
        <span className="lato-pill">
          <LatoIcon name="lock" size={13} /> Voucher required
        </span>
        <p style={{ color: 'var(--muted)', margin: '12px 0 16px' }}>
          This assessment is unlocked with a voucher code. Redeem yours to start.
        </p>
        <a
          href={`/a/${assessmentId}/redeem`}
          className="lato-btn lato-btn--grad lato-btn--lg"
        >
          Redeem a voucher
        </a>
      </div>
    );
  }

  // PAID: purchase access from wallet balance.
  const cost = access.access_cost;
  const balance = access.balance ?? 0;
  const affordable = balance >= cost;
  return (
    <div className="lato-card" style={{ marginTop: 24, textAlign: 'center' }}>
      <span className="lato-pill">
        <LatoIcon name="lock" size={13} /> Paid assessment
      </span>
      <h3 style={{ margin: '12px 0 6px', fontWeight: 750 }}>
        Get access for {formatIdr(cost)}
      </h3>
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
            onClick={onPurchase}
            disabled={purchasing}
          >
            {purchasing ? 'Processing…' : `Pay ${formatIdr(cost)} to start`}
          </button>
        ) : (
          <>
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 12 }}>
              You need {formatIdr(cost - balance)} more in your balance.
            </p>
            <a href="/dashboard" className="lato-btn lato-btn--grad lato-btn--lg">
              Top up balance
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export function BrandedTake({
  app,
  assessmentId,
}: {
  app: AssessmentApp;
  assessmentId: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState<AccessState | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    let active = true;
    assessmentApi
      .getPublic(assessmentId)
      .then((d) => active && setDetail(d))
      .catch(
        (e) => active && setError(e instanceof Error ? e.message : 'Failed to load'),
      );
    return () => {
      active = false;
    };
  }, [assessmentId]);

  // Resolve the viewer's access state (re-run once auth settles / user changes,
  // and after redeeming/purchasing on return to this page).
  const loadAccess = useCallback(async () => {
    try {
      const a = await assessmentApi.getAccess(assessmentId);
      setAccess(a);
    } catch {
      /* non-fatal: fall back to the ungated flow, backend still enforces */
    }
  }, [assessmentId]);

  useEffect(() => {
    if (authLoading) return;
    void loadAccess();
  }, [authLoading, user, loadAccess]);

  const purchaseAccess = async () => {
    setPurchasing(true);
    setAccessError('');
    try {
      const result = await assessmentApi.purchaseAccess(assessmentId);
      setAccess(result);
    } catch (e) {
      setAccessError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  // Gate: gated modes (PAID/VOUCHER) need a grant before starting.
  const gated = Boolean(access?.start_requires_grant && !access?.has_access);
  const needsAuth = Boolean(access?.requires_auth_to_start && !user);

  const questions = detail?.questions ?? [];
  const total = questions.length;
  const current = questions[step];
  const answeredAll = questions.every((q) => answers[q.id]);

  const submit = async () => {
    if (!detail) return;
    setPhase('submitting');
    setError('');
    try {
      const res = await assessmentApi.submit(assessmentId, {
        answers: questions.map((q) => ({
          question_id: q.id,
          choice_id: answers[q.id],
        })),
        guest_email: user ? undefined : email.trim() || undefined,
        language: 'en',
      });
      router.push(`/a/${assessmentId}/report/${res.attempt_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
      setPhase('taking');
    }
  };

  const backToStart = (
    <a href={`/a/${assessmentId}`} className="lato-topbar__r" style={{ color: 'inherit' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <LatoIcon name="arrowLeft" size={15} /> Exit
      </span>
    </a>
  );

  // loading / error
  if (error && !detail) {
    return (
      <BrandedShell app={app}>
        <div className="lato-note" style={{ maxWidth: 520, margin: '40px auto' }}>
          {error}
        </div>
      </BrandedShell>
    );
  }
  if (!detail) {
    return (
      <BrandedShell app={app}>
        <div className="lato-loading">
          <div className="lato-spinner" />
        </div>
      </BrandedShell>
    );
  }

  // submitting / completion
  if (phase === 'submitting') {
    return (
      <BrandedShell app={app} right={backToStart}>
        <div className="lato-loading">
          <div className="lato-spinner" />
          <h3 style={{ fontSize: '1.3rem' }}>{app.assessment.completion.title}</h3>
          {app.assessment.completion.body ? (
            <p className="lato-sub" style={{ marginInline: 'auto' }}>
              {app.assessment.completion.body}
            </p>
          ) : null}
        </div>
      </BrandedShell>
    );
  }

  // intro
  if (phase === 'intro') {
    return (
      <BrandedShell app={app} right={backToStart}>
        <div className="lato-intro">
          <span className="lato-eyebrow" style={{ justifyContent: 'center' }}>
            {app.brand.brandName}
          </span>
          <h1 style={{ marginTop: 12 }}>{app.assessment.intro.title}</h1>
          {app.assessment.intro.body ? (
            <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 12 }}>
              {app.assessment.intro.body}
            </p>
          ) : null}
          <div className="lato-intro__meta">
            <span>
              <LatoIcon name="clock" size={15} /> <b>{app.assessment.meta.estimatedMinutes} min</b>
            </span>
            <span>
              <LatoIcon name="check" size={15} /> <b>{total} questions</b>
            </span>
            <span>{app.assessment.meta.audience}</span>
          </div>
          {!user && !gated ? (
            <label className="lato-field">
              Email for your results (optional)
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          ) : null}
          {gated ? (
            <AccessGate
              access={access}
              needsAuth={needsAuth}
              purchasing={purchasing}
              error={accessError}
              assessmentId={assessmentId}
              onPurchase={purchaseAccess}
            />
          ) : (
            <div style={{ marginTop: 24 }}>
              <button
                className="lato-btn lato-btn--grad lato-btn--lg"
                onClick={() => setPhase('taking')}
                disabled={total === 0}
              >
                {total === 0 ? 'No questions yet' : 'Begin assessment'}
              </button>
            </div>
          )}
        </div>
      </BrandedShell>
    );
  }

  // taking
  return (
    <BrandedShell app={app} right={backToStart}>
      <div className="lato-take">
        <div className="lato-take__bar">
          <div className="lato-prog">
            <div className="lato-prog__f" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <span className="lato-take__c">
            {step + 1} / {total}
          </span>
        </div>

        <div className="lato-qcard">
          <span className="lato-eyebrow">Question {step + 1}</span>
          <h3>{current.question}</h3>
          <div className="lato-opts" role="group" aria-label="Answer options">
            {current.choices.map((ch, i) => {
              const checked = answers[current.id] === ch.id;
              return (
                <button
                  key={ch.id}
                  className="lato-opt"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [current.id]: ch.id }))
                  }
                >
                  <span className="lato-opt__k">{'ABCDEFGH'[i] ?? i + 1}</span>
                  {ch.text}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="lato-note" style={{ marginTop: 16 }}>
            {error}
          </div>
        ) : null}

        <div className="lato-take__nav">
          <button
            className="lato-btn lato-btn--ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Back
          </button>
          {step < total - 1 ? (
            <button
              className="lato-btn lato-btn--grad"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              disabled={!answers[current.id]}
            >
              Next →
            </button>
          ) : (
            <button
              className="lato-btn lato-btn--grad"
              onClick={submit}
              disabled={!answeredAll}
            >
              Finish ✓
            </button>
          )}
        </div>
        <div className="lato-autosave">
          <span className="lato-dot" /> Your progress is kept on this device
        </div>
      </div>
    </BrandedShell>
  );
}
