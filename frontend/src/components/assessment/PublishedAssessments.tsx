'use client';

import { useEffect, useState } from 'react';
import { assessmentApi } from '@/services/assessment.api';
import { AssessmentCard } from '@/components/assessment/AssessmentCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LatoMark } from '@/components/brand/LatoMark';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { AssessmentSummary } from '@/types';

export function PublishedAssessments() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AssessmentSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await assessmentApi.listPublished();
        if (active) setItems(data);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Failed to load assessments',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="container py-16">
      <div className="mb-8 flex items-center gap-2.5">
        <LatoMark className="h-6 w-6 text-bronze" withGlyph={false} />
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            {t('assessment.availableTitle')}
          </h2>
          <p className="text-muted-foreground">
            Accept a challenge and start right away. No sign-up needed to take
            it.
          </p>
        </div>
      </div>
      {error ? (
        <ErrorMessage message={error} />
      ) : items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          title="No assessments available yet"
          description="Check back soon. New assessments are added regularly."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <AssessmentCard key={a.id} assessment={a} />
          ))}
        </div>
      )}
    </section>
  );
}
