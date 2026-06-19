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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AttemptReport } from '@/types';

function ReportContent({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [premiumError, setPremiumError] = useState('');

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

  const unlock = async () => {
    if (!report) return;
    setUnlocking(true);
    setPremiumError('');
    try {
      await attemptApi.unlockPremium(report.report_id);
      const fresh = await attemptApi.getReport(attemptId);
      setReport(fresh);
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

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

      {/* Premium report */}
      {report.premium.unlocked ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Premium Report</CardTitle>
              <Badge>PREMIUM</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {report.premium.content}
            </p>
          </CardContent>
        </Card>
      ) : report.premium.cost > 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Premium Report 🔒</CardTitle>
              <Badge variant="outline">{report.premium.cost} Tokens</Badge>
            </div>
            <CardDescription>
              Unlock a deeper, personalized analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.premium.description ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {report.premium.description}
              </p>
            ) : null}
            <ErrorMessage message={premiumError} />
            <Button onClick={unlock} disabled={unlocking}>
              {unlocking
                ? 'Unlocking…'
                : `Unlock Premium (${report.premium.cost} tokens)`}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
