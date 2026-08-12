'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  FileText,
  LayoutTemplate,
  ListChecks,
  Share2,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';
import { mentorApi } from '@/services/mentor.api';
import { assessmentApi } from '@/services/assessment.api';
import {
  AssessmentForm,
  type AssessmentPayload,
} from '@/components/mentor/AssessmentForm';
import { QuestionEditor } from '@/components/mentor/QuestionEditor';
import { ResultsTable } from '@/components/mentor/ResultsTable';
import { ShareAssessment } from '@/components/mentor/ShareAssessment';
import { LandingPageEditor } from '@/components/mentor/LandingPageEditor';
import { ProductEditor } from '@/components/mentor/ProductEditor';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MentorAssessmentDetail, MentorResult } from '@/types';

// Sidebar sections. `count` is filled in per-render for the badges.
type SectionId =
  | 'details'
  | 'questions'
  | 'pricing'
  | 'landing'
  | 'share'
  | 'results';

const SECTIONS: { id: SectionId; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { id: 'details', labelKey: 'manage.details', icon: FileText },
  { id: 'questions', labelKey: 'manage.questions', icon: ListChecks },
  { id: 'pricing', labelKey: 'manage.pricing', icon: Tag },
  { id: 'landing', labelKey: 'manage.landing', icon: LayoutTemplate },
  { id: 'share', labelKey: 'manage.share', icon: Share2 },
  { id: 'results', labelKey: 'manage.results', icon: BarChart3 },
];
const SECTION_IDS = SECTIONS.map((s) => s.id) as string[];

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}

function DetailView({ id }: { id: string }) {
  const [detail, setDetail] = useState<MentorAssessmentDetail | null>(null);
  const { t } = useLanguage();
  const [results, setResults] = useState<MentorResult[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [section, setSectionState] = useState<SectionId>('details');

  // Deep-link the active section via the URL hash (shareable + back-button).
  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (SECTION_IDS.includes(fromHash)) setSectionState(fromHash as SectionId);
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (SECTION_IDS.includes(h)) setSectionState(h as SectionId);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTo = (next: SectionId) => {
    setSectionState(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${next}`);
    }
  };

  const loadDetail = useCallback(async () => {
    setDetail(await mentorApi.getEditingDetail(id));
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await mentorApi.getEditingDetail(id);
        if (active) setDetail(d);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Failed to load assessment',
          );
        return;
      }
      try {
        const r = await mentorApi.getResults(id);
        if (active) setResults(r);
      } catch {
        if (active) setResults([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async (payload: AssessmentPayload) => {
    setSaving(true);
    setSaveError('');
    try {
      await assessmentApi.update(id, payload);
      await loadDetail();
      setEditing(false);
      setNotice('Changes saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    setStatusBusy(true);
    setError('');
    setNotice('');
    try {
      const next = detail.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await assessmentApi.setStatus(id, next);
      await loadDetail();
      setNotice(
        next === 'PUBLISHED'
          ? 'Assessment published. Your share link is now live.'
          : 'Assessment unpublished.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusBusy(false);
    }
  };

  if (error && !detail) {
    return (
      <div className="container max-w-3xl py-10">
        <ErrorMessage message={error} />
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/mentor">{t('manage.back')}</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="container py-10">
        <Loading />
      </div>
    );
  }

  const isPersonality =
    !!detail.result_categories &&
    Object.keys(detail.result_categories).length > 0;

  const counts: Partial<Record<SectionId, number>> = {
    questions: detail.questions.length,
    results: results?.length ?? undefined,
  };

  return (
    <div className="container max-w-6xl py-8">
      {/* Header — global to the assessment */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/mentor"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {t('manage.back')}
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold">{detail.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={detail.status === 'PUBLISHED' ? 'default' : 'secondary'}
          >
            {detail.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            disabled={statusBusy}
          >
            {detail.status === 'PUBLISHED'
              ? t('mentor.unpublish')
              : t('mentor.publish')}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      ) : null}
      {notice ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Sidebar nav — horizontal scroller on mobile, sticky column on desktop */}
        <aside className="md:sticky md:top-6 md:self-start">
          <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              const count = counts[s.id];
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors md:w-full',
                    active
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(s.labelKey)}</span>
                  {count !== undefined ? (
                    <span
                      className={cn(
                        'ml-auto rounded-full px-1.5 py-0.5 text-xs',
                        active
                          ? 'bg-background text-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active section content */}
        <div className="min-w-0 space-y-6">
          {section === 'details' ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>{t('manage.detailsTitle')}</CardTitle>
                {!editing ? (
                  <Button size="sm" onClick={() => setEditing(true)}>
                    {t('manage.edit')}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {editing ? (
                  <AssessmentForm
                    submitLabel={t('manage.saveChanges')}
                    submitting={saving}
                    error={saveError}
                    initial={{
                      title: detail.title,
                      description: detail.description,
                      image_url: detail.image_url,
                      price: detail.price,
                      low_score_threshold: detail.low_score_threshold,
                      high_score_threshold: detail.high_score_threshold,
                      free_report_text: detail.free_report_text,
                      free_report_template: detail.free_report_template,
                      premium_report_description:
                        detail.premium_report_description,
                      email_template: detail.email_template,
                      base_knowledge: detail.base_knowledge,
                      ai_enabled: detail.ai_enabled,
                      result_categories: detail.result_categories,
                      study_video_url: detail.study_video_url,
                      learning_resources: detail.learning_resources,
                    }}
                    onSubmit={handleSave}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <Info
                      label={t('manage.description')}
                      value={detail.description ?? '—'}
                    />
                    {/* Score thresholds are skill-only; personality uses categories. */}
                    {isPersonality ? null : (
                      <>
                        <Info
                          label={t('manage.lowThreshold')}
                          value={detail.low_score_threshold ?? '—'}
                        />
                        <Info
                          label={t('manage.highThreshold')}
                          value={detail.high_score_threshold ?? '—'}
                        />
                      </>
                    )}
                    <Info
                      label={t('manage.freeReportText')}
                      value={detail.free_report_text ?? '—'}
                    />
                    <Info
                      label={t('manage.openingVideo')}
                      value={
                        detail.study_video_url ? (
                          <a
                            href={detail.study_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {detail.study_video_url}
                          </a>
                        ) : (
                          '—'
                        )
                      }
                    />
                  </dl>
                )}
              </CardContent>
            </Card>
          ) : null}

          {section === 'questions' ? (
            <QuestionEditor
              assessmentId={id}
              questions={detail.questions}
              categories={detail.result_categories}
              onChanged={loadDetail}
            />
          ) : null}

          {section === 'pricing' ? (
            <ProductEditor assessmentId={id} assessmentTitle={detail.title} />
          ) : null}

          {section === 'landing' ? (
            <LandingPageEditor
              assessmentId={id}
              isPublished={detail.status === 'PUBLISHED'}
            />
          ) : null}

          {section === 'share' ? (
            <ShareAssessment
              assessmentId={id}
              isPublished={detail.status === 'PUBLISHED'}
            />
          ) : null}

          {section === 'results' ? (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                {results === null ? (
                  <Loading />
                ) : (
                  <ResultsTable results={results} />
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function MentorAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProtectedRoute roles={['MENTOR']}>
      <DetailView id={id} />
    </ProtectedRoute>
  );
}
