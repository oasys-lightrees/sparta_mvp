'use client';

import { useEffect, useState } from 'react';
import { assessmentApi } from '@/services/assessment.api';
import { AssessmentCard } from '@/components/assessment/AssessmentCard';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { AssessmentSummary } from '@/types';

export function PublishedAssessments() {
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
    <section className="container py-12">
      <h2 className="mb-6 text-2xl font-bold">Available Assessments</h2>
      {error ? (
        <ErrorMessage message={error} />
      ) : items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No assessments available yet.</p>
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
