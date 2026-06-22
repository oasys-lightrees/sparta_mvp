'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Coins, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { attemptApi } from '@/services/attempt.api';
import { assessmentApi } from '@/services/assessment.api';
import { tokenApi } from '@/services/token.api';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { AssessmentCard } from '@/components/assessment/AssessmentCard';
import { ShieldMark } from '@/components/brand/ShieldMark';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssessmentSummary, MyAttempt } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof ClipboardList;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="tnum font-display text-3xl font-bold tracking-tight">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState<MyAttempt[] | null>(null);
  const [attemptsError, setAttemptsError] = useState('');
  const [explore, setExplore] = useState<AssessmentSummary[] | null>(null);
  const [exploreError, setExploreError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const loadWallet = useCallback(async () => {
    const [mine, wallet] = await Promise.all([
      attemptApi.listMine(),
      tokenApi.getBalance(),
    ]);
    setAttempts(mine);
    setBalance(wallet.balance);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [mine, wallet] = await Promise.all([
          attemptApi.listMine(),
          tokenApi.getBalance(),
        ]);
        if (!active) return;
        setAttempts(mine);
        setBalance(wallet.balance);
      } catch (err) {
        if (active)
          setAttemptsError(
            err instanceof Error ? err.message : 'Failed to load your dashboard',
          );
      }
      try {
        const published = await assessmentApi.listPublished();
        if (active) setExplore(published);
      } catch (err) {
        if (active)
          setExploreError(
            err instanceof Error ? err.message : 'Failed to load assessments',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const topUp = async () => {
    const input = window.prompt('How many tokens would you like to top up?', '10');
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isInteger(amount) || amount <= 0) {
      setActionError('Top-up amount must be a positive whole number');
      return;
    }
    setBusy('topup');
    setActionError('');
    setActionNotice('');
    try {
      const wallet = await tokenApi.topupDemo(amount);
      setBalance(wallet.balance);
      setActionNotice(`Added ${amount} tokens — your balance is now ${wallet.balance}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Top-up failed');
    } finally {
      setBusy(null);
    }
  };

  const unlock = async (reportId: string) => {
    setBusy(reportId);
    setActionError('');
    setActionNotice('');
    try {
      await attemptApi.unlockPremium(reportId);
      await loadWallet();
      setActionNotice('Premium report unlocked — open it to see your full analysis.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setBusy(null);
    }
  };

  const total = attempts?.length ?? 0;
  const reportsAvailable = attempts?.filter((a) => a.report_id).length ?? 0;

  return (
    <div className="container space-y-10 py-10">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-bronze">
          <ShieldMark className="h-4 w-4" withGlyph={false} />
          <span className="font-display text-xs font-semibold uppercase tracking-[0.22em]">
            {t('dashboard.commandCenter')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('dashboard.welcome')}
          {user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.overview')}</p>
      </div>

      {/* Wallet + statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/30 bg-accent/40">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent-foreground">
              {t('dashboard.tokenBalance')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Coins className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="tnum font-display text-3xl font-bold tracking-tight text-primary">
              {balance === null ? '—' : `${balance} Tokens`}
            </p>
            <Button
              size="sm"
              variant="bronze"
              onClick={topUp}
              disabled={busy === 'topup'}
            >
              {busy === 'topup' ? t('dashboard.toppingUp') : t('dashboard.topUp')}
            </Button>
          </CardContent>
        </Card>
        <StatCard
          label={t('dashboard.assessmentsTaken')}
          value={attempts === null ? '—' : total}
          icon={ClipboardList}
        />
        <StatCard
          label={t('dashboard.reportsAvailable')}
          value={attempts === null ? '—' : reportsAvailable}
          icon={FileText}
        />
      </div>

      {/* My Assessments */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('dashboard.myAssessments')}
        </h2>
        <ErrorMessage message={actionError} />
        {actionNotice ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionNotice}
          </p>
        ) : null}
        {attemptsError ? (
          <ErrorMessage message={attemptsError} />
        ) : attempts === null ? (
          <Loading />
        ) : attempts.length === 0 ? (
          <EmptyState
            title="Complete an assessment to receive insights"
            description="Take an assessment below and your personalized results and reports will show up here."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.colAssessment')}</TableHead>
                    <TableHead>{t('dashboard.colScore')}</TableHead>
                    <TableHead>{t('dashboard.colDate')}</TableHead>
                    <TableHead>{t('dashboard.colPremium')}</TableHead>
                    <TableHead className="text-right">
                      {t('dashboard.colReport')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.attempt_id}>
                      <TableCell className="font-medium">
                        {a.assessment_title}
                      </TableCell>
                      <TableCell>{a.score}</TableCell>
                      <TableCell>
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {a.premium_unlocked ? (
                          <Badge variant="secondary">
                            {t('dashboard.unlocked')}
                          </Badge>
                        ) : a.premium_token_cost > 0 && a.report_id ? (
                          <Button
                            size="sm"
                            variant="bronze"
                            onClick={() => unlock(a.report_id as string)}
                            disabled={busy === a.report_id}
                          >
                            🔒 Unlock ({a.premium_token_cost})
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/reports/${a.attempt_id}`}>
                            {t('dashboard.viewReport')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Explore Assessments */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t('dashboard.exploreAssessments')}
        </h2>
        {exploreError ? (
          <ErrorMessage message={exploreError} />
        ) : explore === null ? (
          <Loading />
        ) : explore.length === 0 ? (
          <EmptyState title="No assessments available yet" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardHome />
    </ProtectedRoute>
  );
}
