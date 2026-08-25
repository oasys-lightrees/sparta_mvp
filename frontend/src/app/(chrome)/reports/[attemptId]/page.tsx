'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, PlayCircle } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { attemptApi } from '@/services/attempt.api';
import { clearPendingAttempt } from '@/lib/storage';
import { ReportView } from '@/components/assessment/ReportView';
import { StudyVideo } from '@/components/assessment/StudyVideo';
import { LearningResources } from '@/components/assessment/LearningResources';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
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

      {/* Study video (shown when the mentor provided one) */}
      {report.study_video_url ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              {t('report.studyVideoTitle')}
            </CardTitle>
            <CardDescription>{t('report.studyVideoDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <StudyVideo url={report.study_video_url} />
          </CardContent>
        </Card>
      ) : null}

      {/* Learning Resources — curated materials matched to the taker's result. */}
      {report.learning_resources.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {report.result_profile
                ? t('report.resourcesPathTitle')
                : t('report.resourcesTitle')}
            </CardTitle>
            <CardDescription>
              {report.result_profile
                ? `Because your result is ${report.result_profile.name}, here's your personalized learning path.`
                : t('report.resourcesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LearningResources
              resources={report.learning_resources}
              lockedCount={0}
            />
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
