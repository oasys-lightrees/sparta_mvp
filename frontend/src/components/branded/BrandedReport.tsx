'use client';

import { useEffect, useState } from 'react';
import { attemptApi } from '@/services/attempt.api';
import { useAuth } from '@/hooks/useAuth';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AttemptReport } from '@/types';
import { BrandedShell, LatoIcon } from './shell';

/** Minimal markdown → elements (headings, bullets, paragraphs). */
function Prose({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (list.length) {
      out.push(
        <ul key={`u${k}`} style={{ margin: '8px 0', paddingLeft: 20 }}>
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      flush(i);
      const level = line.startsWith('### ') ? 3 : 2;
      const txt = line.replace(/^#{1,3}\s/, '');
      out.push(level === 3 ? <h3 key={i}>{txt}</h3> : <h2 key={i}>{txt}</h2>);
    } else if (/^[-*]\s/.test(line)) {
      list.push(line.replace(/^[-*]\s/, ''));
    } else if (line === '') {
      flush(i);
    } else {
      flush(i);
      out.push(<p key={i} style={{ marginTop: 8 }}>{line}</p>);
    }
  });
  flush(lines.length);
  return <div className="lato-prose">{out}</div>;
}

function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (h.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v');
        return v ? `https://www.youtube.com/embed/${v}` : null;
      }
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    }
    if (h === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function BrandedReport({
  app,
  assessmentId,
  attemptId,
}: {
  app: AssessmentApp;
  assessmentId: string;
  attemptId: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        await attemptApi.claim(attemptId);
        const data = await attemptApi.getReport(attemptId);
        if (active) setReport(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attemptId, user, authLoading]);

  const unlock = async () => {
    if (!report) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      await attemptApi.unlockPremium(report.report_id);
      setReport(await attemptApi.getReport(attemptId));
    } catch (e) {
      setUnlockError(e instanceof Error ? e.message : 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  const dashRight = (
    <a href={`/a/${assessmentId}`} style={{ color: 'inherit' }}>
      {app.brand.brandName}
    </a>
  );

  // auth gate (report is tied to an account)
  if (!authLoading && !user) {
    const next = encodeURIComponent(`/a/${assessmentId}/report/${attemptId}`);
    return (
      <BrandedShell app={app} right={dashRight}>
        <div className="lato-intro">
          <div className="lato-card__i" style={{ margin: '0 auto 16px' }}>
            <LatoIcon name="lock" />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>Your report is ready</h1>
          <p className="lato-sub" style={{ marginInline: 'auto', marginTop: 10 }}>
            Create a free account or log in to view your results and keep them in your dashboard.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href={`/login?next=${next}`} className="lato-btn lato-btn--grad lato-btn--lg">
              Log in to view
            </a>
            <a href={`/register?next=${next}`} className="lato-btn lato-btn--ghost lato-btn--lg">
              Create account
            </a>
          </div>
        </div>
      </BrandedShell>
    );
  }

  if (loading) {
    return (
      <BrandedShell app={app} right={dashRight}>
        <div className="lato-loading">
          <div className="lato-spinner" />
        </div>
      </BrandedShell>
    );
  }
  if (error || !report) {
    return (
      <BrandedShell app={app} right={dashRight}>
        <div className="lato-note" style={{ maxWidth: 520, margin: '40px auto' }}>
          {error || 'Report not found.'}
        </div>
      </BrandedShell>
    );
  }

  const pct = Math.max(0, Math.min(100, report.score));
  const premium = report.premium;
  const embed = premium.study_video_url ? embedUrl(premium.study_video_url) : null;

  return (
    <BrandedShell app={app} right={dashRight}>
      <div className="lato-report">
        <span className="lato-eyebrow">{app.reports.free.title}</span>
        <h2 className="lato-h" style={{ marginBottom: 20 }}>
          {report.assessment_title ?? app.brand.brandName}
        </h2>

        <div className="lato-rhero">
          <div className="lato-rring" style={{ ['--v' as string]: `${pct}%` }}>
            <b>
              {report.score}
              <small>/100</small>
            </b>
          </div>
          <div>
            <span className="lato-pill">● {report.level}</span>
            <div className="lato-rlvl">{report.level}</div>
            <Prose text={report.report.content} />
          </div>
        </div>

        {/* Premium */}
        {premium.unlocked ? (
          <div className="lato-card" style={{ marginTop: 20 }}>
            <span className="lato-eyebrow">
              <LatoIcon name="spark" size={14} /> {app.reports.premium.title}
            </span>
            <div style={{ marginTop: 14 }}>
              <Prose text={premium.content ?? ''} />
            </div>
            {embed ? (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Study video</h3>
                <div className="lato-video">
                  <iframe
                    src={embed}
                    title="Study video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : premium.study_video_url ? (
              <a
                href={premium.study_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="lato-btn lato-btn--ghost"
                style={{ marginTop: 16 }}
              >
                <LatoIcon name="play" size={15} /> Open study video
              </a>
            ) : null}
          </div>
        ) : premium.cost > 0 ? (
          <div className="lato-locked">
            <div className="lato-locked__b">
              <h3 style={{ fontWeight: 750 }}>{app.reports.premium.title}</h3>
              <p style={{ color: 'var(--muted)', marginTop: 8 }}>
                {premium.description ??
                  'A personalized deep-dive into your strengths, gaps, recommendations, and a roadmap generated from your answers…'}
              </p>
            </div>
            <div className="lato-locked__o">
              <div className="lato-locked__c">
                <span className="lato-pill">
                  <LatoIcon name="lock" size={13} /> Premium
                </span>
                <h3 style={{ margin: '14px 0 6px', fontWeight: 750 }}>
                  Unlock your {app.reports.premium.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
                  {premium.cost} tokens · personalized AI analysis
                </p>
                {unlockError ? (
                  <div className="lato-note" style={{ marginTop: 12 }}>
                    {unlockError}
                  </div>
                ) : null}
                <div className="lato-unlockrow">
                  <button
                    className="lato-btn lato-btn--grad"
                    onClick={unlock}
                    disabled={unlocking}
                  >
                    {unlocking ? 'Unlocking…' : `Unlock (${premium.cost} tokens)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 26 }}>
          <a href="/dashboard" className="lato-btn lato-btn--ghost">
            Go to my dashboard
          </a>
        </div>
      </div>
    </BrandedShell>
  );
}
