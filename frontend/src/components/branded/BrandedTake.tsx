'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentApi } from '@/services/assessment.api';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AssessmentDetail } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

type Phase = 'intro' | 'taking' | 'submitting';

export function BrandedTake({
  app,
  assessmentId,
}: {
  app: AssessmentApp;
  assessmentId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');

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
          {!user ? (
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
          <div style={{ marginTop: 24 }}>
            <button
              className="lato-btn lato-btn--grad lato-btn--lg"
              onClick={() => setPhase('taking')}
              disabled={total === 0}
            >
              {total === 0 ? 'No questions yet' : 'Begin assessment'}
            </button>
          </div>
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
