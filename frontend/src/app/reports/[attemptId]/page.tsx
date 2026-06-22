'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { attemptApi } from '@/services/attempt.api';
import { clearPendingAttempt } from '@/lib/storage';
import { ReportView } from '@/components/assessment/ReportView';
import { PremiumReportView } from '@/components/assessment/PremiumReportView';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
  const { t } = useLanguage();
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [premiumError, setPremiumError] = useState('');
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

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
      setUnlockedJustNow(true);
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <Loading label={t('report.preparing')} />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error} />
        <Button asChild variant="outline">
          <Link href="/">{t('report.backHome')}</Link>
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
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('report.premiumReport')}
              </CardTitle>
              <Badge>PREMIUM</Badge>
            </div>
            {unlockedJustNow ? (
              <CardDescription className="font-medium text-emerald-600">
                {t('report.premiumUnlockedNote')}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <PremiumReportView content={report.premium.content ?? ''} />
          </CardContent>
        </Card>
      ) : report.premium.cost > 0 ? (
        <Card className="border-2 border-dashed border-primary/30 bg-accent/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                {t('report.premiumReport')}
              </CardTitle>
              <Badge variant="outline">{report.premium.cost} Tokens</Badge>
            </div>
            <CardDescription>{t('report.premiumDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.premium.description ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {report.premium.description}
              </p>
            ) : null}
            <ErrorMessage message={premiumError} />
            <Button
              onClick={unlock}
              disabled={unlocking}
              size="lg"
              variant="bronze"
            >
              {unlocking ? (
                t('report.unlocking')
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('report.unlockCta')} ({report.premium.cost} tokens)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="outline">
        <Link href="/dashboard">{t('report.goDashboard')}</Link>
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
