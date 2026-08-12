'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { assessmentApi } from '@/services/assessment.api';
import { productApi } from '@/services/product.api';
import { formatIdr } from '@/lib/currency';
import { isDirectVideo, toEmbedUrl } from '@/lib/video';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AccessState, AssessmentDetail, PricingTier, PublicProduct } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

type Phase = 'intro' | 'taking' | 'submitting';

/** Access gate shown in the intro when a gated mode (PAID/VOUCHER) needs a grant. */
function AccessGate({
  access,
  needsAuth,
  purchasing,
  error,
  assessmentId,
  cost,
  tierTitle,
  tierId,
  onPurchase,
}: {
  access: AccessState | null;
  needsAuth: boolean;
  purchasing: boolean;
  error: string;
  assessmentId: string;
  // The price to charge — the selected paid tier's amount, or the assessment's
  // access cost as a fallback.
  cost: number;
  // The selected paid tier's title, shown so buyers know what they're buying.
  tierTitle?: string | null;
  // The selected paid tier's id, preserved across the login round-trip.
  tierId?: string | null;
  onPurchase: () => void;
}) {
  if (!access) return null;
  const next = encodeURIComponent(
    `/a/${assessmentId}/start${tierId ? `?tier=${encodeURIComponent(tierId)}` : ''}`,
  );

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

  // PAID: purchase the selected tier from wallet balance.
  const balance = access.balance ?? 0;
  const affordable = balance >= cost;
  return (
    <div className="lato-card" style={{ marginTop: 24, textAlign: 'center' }}>
      <span className="lato-pill">
        <LatoIcon name="lock" size={13} /> {tierTitle || 'Paid assessment'}
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
            <a
              href={`/a/${assessmentId}/dashboard`}
              className="lato-btn lato-btn--grad lato-btn--lg"
            >
              Top up balance
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/** The expert's opening video, embedded on the intro (before answering). */
function OpeningVideo({ url }: { url: string }) {
  const embed = toEmbedUrl(url);
  return (
    <div className="lato-card" style={{ marginTop: 20, textAlign: 'left' }}>
      <span className="lato-eyebrow">
        <LatoIcon name="play" size={14} /> Watch this first
      </span>
      {embed ? (
        <div className="lato-video" style={{ marginTop: 14 }}>
          <iframe
            src={embed}
            title="Opening video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isDirectVideo(url) ? (
        <video
          controls
          src={url}
          style={{ width: '100%', borderRadius: 10, marginTop: 14, background: '#000' }}
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="lato-btn lato-btn--ghost"
          style={{ marginTop: 14 }}
        >
          <LatoIcon name="play" size={15} /> Open video
        </a>
      )}
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
  const searchParams = useSearchParams();
  const tierParam = searchParams.get('tier');
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
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
    productApi
      .getPublic(assessmentId)
      .then((p) => active && setProduct(p))
      .catch(() => {
        /* non-fatal: no product tiers, fall back to the assessment access cost */
      });
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

  // Resolve which paid tier this visit is buying. A `?tier=` from a landing card
  // selects that tier; otherwise, a gated assessment defaults to the first paid
  // tier so a direct /start visit still has a price to charge.
  const paidTiers = (product?.tiers ?? []).filter(
    (t) => t.enabled && t.kind === 'PAID',
  );
  const selectedTier: PricingTier | null =
    (tierParam ? paidTiers.find((t) => t.id === tierParam) : undefined) ?? null;
  const gatedNoGrant = Boolean(
    access?.start_requires_grant && !access?.has_access,
  );
  const effectiveTier: PricingTier | null =
    selectedTier ?? (gatedNoGrant ? paidTiers[0] ?? null : null);
  const purchasedTiers = access?.purchased_tiers ?? [];
  // A chosen paid tier the user hasn't bought must be purchased even when the
  // assessment itself is free to take (the tier sells its own bonus content).
  const needsTierPurchase = Boolean(
    selectedTier && !purchasedTiers.includes(selectedTier.id),
  );
  const purchaseCost = effectiveTier?.amount ?? access?.access_cost ?? 0;

  const purchaseAccess = async () => {
    setPurchasing(true);
    setAccessError('');
    try {
      const result = await assessmentApi.purchaseAccess(
        assessmentId,
        effectiveTier?.id,
      );
      setAccess(result);
    } catch (e) {
      setAccessError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  // Gate: gated modes (PAID/VOUCHER) need a grant, or a selected paid tier still
  // needs buying.
  const gated = gatedNoGrant || needsTierPurchase;
  const needsAuth = Boolean(
    (access?.requires_auth_to_start || needsTierPurchase) && !user,
  );

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

  const home = `/a/${assessmentId}`;
  const exitBack = { href: home, label: 'Exit' };

  // loading / error
  if (error && !detail) {
    return (
      <BrandedShell app={app} homeHref={home} back={exitBack}>
        <div className="lato-note" style={{ maxWidth: 520, margin: '40px auto' }}>
          {error}
        </div>
      </BrandedShell>
    );
  }
  if (!detail) {
    return (
      <BrandedShell app={app} homeHref={home} back={exitBack}>
        <div className="lato-loading">
          <div className="lato-spinner" />
        </div>
      </BrandedShell>
    );
  }

  // submitting / completion
  if (phase === 'submitting') {
    return (
      <BrandedShell app={app} homeHref={home} back={exitBack}>
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
      <BrandedShell app={app} homeHref={home} back={exitBack}>
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

          {/* Opening video — shown on the intro, before answering. */}
          {detail.studyVideoUrl ? (
            <OpeningVideo url={detail.studyVideoUrl} />
          ) : null}

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
              cost={purchaseCost}
              tierTitle={effectiveTier?.title ?? null}
              tierId={effectiveTier?.id ?? null}
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
    <BrandedShell app={app} homeHref={home} back={exitBack}>
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
