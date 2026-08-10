'use client';

import { useEffect, useState } from 'react';
import { attemptApi } from '@/services/attempt.api';
import { useAuth } from '@/hooks/useAuth';
import { isDirectVideo } from '@/lib/video';
import type { AssessmentApp } from '@/types/assessment-app';
import type { AttemptReport, LearningResource } from '@/types';
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

const RESOURCE_LABEL: Record<LearningResource['type'], string> = {
  video: 'Video',
  pdf: 'PDF',
  article: 'Article',
  file: 'Download',
  link: 'Link',
  course: 'Course',
};

/** On-theme learning-resources list for the branded report surface. */
function BrandedResources({
  resources,
  lockedCount,
  profileName,
}: {
  resources: LearningResource[];
  lockedCount: number;
  profileName?: string | null;
}) {
  if (resources.length === 0 && lockedCount === 0) return null;
  return (
    <div className="lato-card" style={{ marginTop: 20 }}>
      <span className="lato-eyebrow">
        <LatoIcon name="spark" size={14} />{' '}
        {profileName ? 'Your Personalized Learning Path' : 'Learning Resources'}
      </span>
      {profileName ? (
        <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginTop: 8 }}>
          Because your result is {profileName}, here&apos;s what to explore next.
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        {resources.map((r) => {
          const embed = r.type === 'video' ? embedUrl(r.url) : null;
          return (
            <div
              key={r.id}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'space-between',
                }}
              >
                <strong style={{ fontWeight: 700 }}>{r.title}</strong>
                <span className="lato-pill" style={{ fontSize: '.7rem' }}>
                  {RESOURCE_LABEL[r.type] ?? 'Link'}
                </span>
              </div>
              {r.description ? (
                <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginTop: 4 }}>
                  {r.description}
                </p>
              ) : null}
              {embed ? (
                <div className="lato-video" style={{ marginTop: 10 }}>
                  <iframe
                    src={embed}
                    title={r.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : r.type === 'video' && isDirectVideo(r.url) ? (
                <video
                  controls
                  src={r.url}
                  style={{ width: '100%', borderRadius: 10, marginTop: 10, background: '#000' }}
                />
              ) : null}
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lato-btn lato-btn--ghost"
                style={{ marginTop: 12 }}
              >
                <LatoIcon name="play" size={14} /> Open{' '}
                {(RESOURCE_LABEL[r.type] ?? 'link').toLowerCase()}
              </a>
            </div>
          );
        })}
      </div>
      {lockedCount > 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 12 }}>
          {lockedCount} more resource{lockedCount === 1 ? '' : 's'} will unlock
          with access.
        </p>
      ) : null}
    </div>
  );
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
  // Personality/diagnostic assessments don't produce a numeric score — they
  // resolve to a result category. Hide the score ring and show the category.
  const isPersonality = Boolean(report.result_profile);
  const embed = report.study_video_url ? embedUrl(report.study_video_url) : null;

  return (
    <BrandedShell app={app} right={dashRight}>
      <div className="lato-report">
        <span className="lato-eyebrow">{app.reports.free.title}</span>
        <h2 className="lato-h" style={{ marginBottom: 20 }}>
          {report.assessment_title ?? app.brand.brandName}
        </h2>

        <div
          className="lato-rhero"
          style={isPersonality ? { gridTemplateColumns: '1fr' } : undefined}
        >
          {!isPersonality ? (
            <div className="lato-rring" style={{ ['--v' as string]: `${pct}%` }}>
              <b>
                {report.score}
                <small>/100</small>
              </b>
            </div>
          ) : null}
          <div>
            <span className="lato-pill">
              ● {isPersonality ? 'Your result' : report.level}
            </span>
            <div className="lato-rlvl">
              {isPersonality ? (report.result_profile?.name ?? 'Your result') : report.level}
            </div>
            <Prose text={report.report.content} />
          </div>
        </div>

        {/* Opening video (shown when the mentor provided one) */}
        {report.study_video_url ? (
          <div className="lato-card" style={{ marginTop: 20 }}>
            <span className="lato-eyebrow">
              <LatoIcon name="play" size={14} /> Opening video
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
            ) : (
              <a
                href={report.study_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="lato-btn lato-btn--ghost"
                style={{ marginTop: 16 }}
              >
                <LatoIcon name="play" size={15} /> Open video
              </a>
            )}
          </div>
        ) : null}

        <BrandedResources
          resources={report.learning_resources}
          lockedCount={0}
          profileName={report.result_profile?.name ?? null}
        />

        <div style={{ marginTop: 26 }}>
          <a href={`/a/${assessmentId}/dashboard`} className="lato-btn lato-btn--ghost">
            Go to my dashboard
          </a>
        </div>
      </div>
    </BrandedShell>
  );
}
