'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { mentorApi } from '@/services/mentor.api';
import { assessmentApi } from '@/services/assessment.api';
import {
  AssessmentForm,
  type AssessmentPayload,
} from '@/components/mentor/AssessmentForm';
import { QuestionEditor } from '@/components/mentor/QuestionEditor';
import { ResultsTable } from '@/components/mentor/ResultsTable';
import { ShareAssessment } from '@/components/mentor/ShareAssessment';
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
import type { MentorAssessmentDetail, MentorResult } from '@/types';

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
  const [results, setResults] = useState<MentorResult[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [notice, setNotice] = useState('');

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
          ? 'Assessment published — your share link is now live.'
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
            <Link href="/mentor">Back to dashboard</Link>
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

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/mentor"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{detail.title}</h1>
        </div>
        <Badge variant={detail.status === 'PUBLISHED' ? 'default' : 'secondary'}>
          {detail.status}
        </Badge>
      </div>

      <ErrorMessage message={error} />
      {notice ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Assessment details</CardTitle>
          {!editing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleStatus}
                disabled={statusBusy}
              >
                {detail.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </Button>
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {editing ? (
            <AssessmentForm
              submitLabel="Save changes"
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
                premium_token_cost: detail.premium_token_cost,
                free_report_template: detail.free_report_template,
                premium_report_description: detail.premium_report_description,
                email_template: detail.email_template,
                base_knowledge: detail.base_knowledge,
                ai_enabled: detail.ai_enabled,
                result_categories: detail.result_categories,
                study_video_url: detail.study_video_url,
              }}
              onSubmit={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Info label="Description" value={detail.description ?? '—'} />
              <Info
                label="Price"
                value={detail.price > 0 ? `$${detail.price}` : 'Free'}
              />
              <Info
                label="Premium cost"
                value={
                  detail.premium_token_cost > 0
                    ? `${detail.premium_token_cost} tokens`
                    : '—'
                }
              />
              <Info
                label="Low threshold"
                value={detail.low_score_threshold ?? '—'}
              />
              <Info
                label="High threshold"
                value={detail.high_score_threshold ?? '—'}
              />
              <Info
                label="Free report text"
                value={detail.free_report_text ?? '—'}
              />
              <Info
                label="Study video"
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

      <ShareAssessment
        assessmentId={id}
        isPublished={detail.status === 'PUBLISHED'}
      />

      <QuestionEditor
        assessmentId={id}
        questions={detail.questions}
        categories={detail.result_categories}
        onChanged={loadDetail}
      />

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results === null ? <Loading /> : <ResultsTable results={results} />}
        </CardContent>
      </Card>
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
