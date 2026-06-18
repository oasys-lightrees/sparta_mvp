'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { attemptApi } from '@/services/attempt.api';
import { clearPendingAttempt } from '@/lib/storage';
import { ReportView } from '@/components/assessment/ReportView';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Button } from '@/components/ui/button';
import type { AttemptReport } from '@/types';

function ReportContent({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Claim is idempotent — assigns a guest attempt, no-op if already owned.
        await attemptApi.claim(attemptId);
        const data = await attemptApi.getReport(attemptId);
        if (!active) return;
        setReport(data);
        clearPendingAttempt();
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Failed to load report',
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (loading) return <Loading label="Preparing your report…" />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error} />
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }
  if (!report) return null;

  return (
    <div className="space-y-6">
      <ReportView data={report} />
      <Button asChild variant="outline">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}

export default function ReportPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  return (
    <ProtectedRoute>
      <div className="container max-w-2xl py-10">
        <ReportContent attemptId={attemptId} />
      </div>
    </ProtectedRoute>
  );
}
