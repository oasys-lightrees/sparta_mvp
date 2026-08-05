'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentApi } from '@/services/assessment.api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { setPendingAttempt } from '@/lib/storage';
import { QuestionStep } from '@/components/assessment/QuestionStep';
import { AccessGate } from '@/components/assessment/AccessGate';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AccessState, AssessmentDetail } from '@/types';

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [access, setAccess] = useState<AccessState | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [data, acc] = await Promise.all([
          assessmentApi.getPublic(id),
          assessmentApi.getAccess(id).catch(() => null),
        ]);
        if (!active) return;
        setAssessment(data);
        setAccess(acc);
      } catch (err) {
        if (active)
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load assessment',
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const purchaseAccess = async () => {
    setPurchasing(true);
    setAccessError('');
    try {
      setAccess(await assessmentApi.purchaseAccess(id));
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <Loading />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="container max-w-2xl py-10">
        <ErrorMessage message={loadError} />
      </div>
    );
  }
  if (!assessment) return null;

  const questions = assessment.questions;
  if (questions.length === 0) {
    return (
      <div className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              This assessment has no questions yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Access gate: gated modes (PAID/VOUCHER) need a grant before starting.
  if (access && access.start_requires_grant && !access.has_access) {
    return (
      <div className="container max-w-2xl py-10">
        <h1 className="mb-4 text-2xl font-bold">{assessment.title}</h1>
        <AccessGate
          access={access}
          assessmentId={id}
          isLoggedIn={Boolean(user)}
          purchasing={purchasing}
          error={accessError}
          onPurchase={purchaseAccess}
        />
      </div>
    );
  }

  const current = questions[index];
  const selected = answers[current.id];
  const isLast = index === questions.length - 1;

  const onSelect = (choiceId: string) =>
    setAnswers((prev) => ({ ...prev, [current.id]: choiceId }));
  const onPrev = () => setIndex((i) => Math.max(0, i - 1));
  const onNext = () => setIndex((i) => Math.min(questions.length - 1, i + 1));

  const onSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const { attempt_id } = await assessmentApi.submit(id, {
        answers: questions.map((q) => ({
          question_id: q.id,
          choice_id: answers[q.id],
        })),
        language: lang,
      });
      setPendingAttempt(attempt_id);
      // Logged in -> straight to report (claim happens there). Otherwise the
      // login page will send the user back to the report after authenticating.
      router.replace(user ? `/reports/${attempt_id}` : '/login');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit');
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="mb-1 text-2xl font-bold">{assessment.title}</h1>
      {assessment.description ? (
        <p className="mb-6 text-muted-foreground">{assessment.description}</p>
      ) : (
        <div className="mb-6" />
      )}
      <QuestionStep
        question={current}
        index={index}
        total={questions.length}
        selectedChoiceId={selected}
        onSelect={onSelect}
        onPrev={onPrev}
        onNext={onNext}
        isFirst={index === 0}
        isLast={isLast}
        submitting={submitting}
        onSubmit={onSubmit}
      />
      {submitError ? (
        <div className="mt-4">
          <ErrorMessage message={submitError} />
        </div>
      ) : null}
    </div>
  );
}
