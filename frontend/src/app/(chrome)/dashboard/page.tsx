'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Wallet, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { attemptApi } from '@/services/attempt.api';
import { assessmentApi } from '@/services/assessment.api';
import { balanceApi } from '@/services/balance.api';
import { formatIdr } from '@/lib/currency';
import { voucherApi } from '@/services/voucher.api';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { AssessmentCard } from '@/components/assessment/AssessmentCard';
import { TopUpDialog } from '@/components/wallet/TopUpDialog';
import { LatoMark } from '@/components/brand/LatoMark';
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
import type { AssessmentSummary, MyAttempt, VoucherBatchSummary } from '@/types';

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
  const [batches, setBatches] = useState<VoucherBatchSummary[]>([]);
  const [voucherFor, setVoucherFor] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpError, setTopUpError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [mine, wallet] = await Promise.all([
          attemptApi.listMine(),
          balanceApi.getBalance(),
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
      // Team voucher packages (best-effort — HR users who've bought seats).
      try {
        const mineBatches = await voucherApi.listBatches();
        if (active) setBatches(mineBatches);
      } catch {
        /* ignore — the section simply stays hidden */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Confirm a purchase after returning from the Midtrans redirect. Midtrans
  // appends order_id/transaction_status to the finish URL; we poll our backend
  // (the wallet is credited by the payment webhook) and clean up the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) return;
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      try {
        const order = await balanceApi.getOrder(orderId);
        setBalance(order.balance);
        if (order.status === 'PAID') {
          setActionNotice(
            `Payment received — ${formatIdr(order.amount)} added. Balance: ${formatIdr(order.balance)}.`,
          );
        } else if (order.status === 'PENDING') {
          setActionNotice(
            'Payment is being processed. Your balance will appear once it settles.',
          );
        } else {
          setActionError(`Payment ${order.status.toLowerCase()}. No balance was added.`);
        }
      } catch {
        /* ignore — stale/foreign order id */
      }
    })();
  }, []);

  const topUp = async (amount: number) => {
    setBusy('topup');
    setTopUpError('');
    setActionError('');
    setActionNotice('');
    try {
      const result = await balanceApi.purchase(amount);
      if (result.mode === 'midtrans') {
        // Hand off to the Midtrans hosted payment page; the webhook credits the
        // wallet and we confirm on return (see the effect above).
        window.location.href = result.redirect_url;
        return;
      }
      // Demo fallback (gateway not configured): credited immediately.
      setBalance(result.balance);
      setTopUpOpen(false);
      setActionNotice(`Added ${formatIdr(amount)} — your balance is now ${formatIdr(result.balance)}.`);
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Top-up failed');
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
          <LatoMark className="h-4 w-4" withGlyph={false} />
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
              {t('dashboard.balance')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="tnum font-display text-3xl font-bold tracking-tight text-primary">
              {balance === null ? '—' : formatIdr(balance)}
            </p>
            <Button
              size="sm"
              variant="bronze"
              onClick={() => {
                setTopUpError('');
                setTopUpOpen(true);
              }}
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

      {/* Team vouchers (HR / company buyers) — buy packages + manage results */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Team vouchers</h2>
          <p className="text-sm text-muted-foreground">
            Buy a package of voucher codes for your team, hand them out, and review
            each person&apos;s result here.
          </p>
        </div>

        {/* Buy a package: pick an assessment, go to its company portal */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
              <span className="text-sm font-medium">Buy voucher codes for</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={voucherFor}
                onChange={(e) => setVoucherFor(e.target.value)}
              >
                <option value="">Select an assessment…</option>
                {(explore ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <Button asChild variant="bronze" disabled={!voucherFor}>
              {voucherFor ? (
                <Link href={`/a/${voucherFor}/company`}>Buy voucher codes</Link>
              ) : (
                <span>Buy voucher codes</span>
              )}
            </Button>
          </CardContent>
        </Card>

        {batches.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Redeemed</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.batch_id}>
                      <TableCell className="font-medium">{b.company_name}</TableCell>
                      <TableCell>{b.assessment_title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {b.redeemed}/{b.credits}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/a/${b.assessment_id}/company`}>
                            View results
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
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

      <TopUpDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onConfirm={topUp}
        submitting={busy === 'topup'}
        error={topUpError}
      />
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
