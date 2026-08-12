'use client';

import { useEffect, useState } from 'react';
import { Wallet, Lock } from 'lucide-react';
import { mentorApi } from '@/services/mentor.api';
import { formatIdr } from '@/lib/currency';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { MentorRevenue } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Wallet;
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

export function RevenueSection() {
  const { t } = useLanguage();
  const [data, setData] = useState<MentorRevenue | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const revenue = await mentorApi.getRevenue();
        if (active) setData(revenue);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : 'Failed to load revenue');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{t('revenue.title')}</h2>
      {error ? (
        <ErrorMessage message={error} />
      ) : data === null ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <StatCard
              label={t('revenue.total')}
              value={formatIdr(data.totalRevenue)}
              icon={Wallet}
            />
            <StatCard
              label={t('revenue.bought')}
              value={data.paidUnlocks}
              icon={Lock}
            />
          </div>
          {data.transactions.length === 0 ? (
            <EmptyState
              title={t('revenue.emptyTitle')}
              description={t('revenue.emptyDesc')}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('revenue.colAssessment')}</TableHead>
                      <TableHead>{t('revenue.colTier')}</TableHead>
                      <TableHead>{t('revenue.colAmount')}</TableHead>
                      <TableHead>{t('revenue.colDate')}</TableHead>
                      <TableHead>{t('revenue.colBuyer')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {t.assessmentTitle ?? '—'}
                        </TableCell>
                        <TableCell>{t.tierLabel ?? '—'}</TableCell>
                        <TableCell>{formatIdr(t.amount)}</TableCell>
                        <TableCell>
                          {new Date(t.date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {t.buyerName?.trim() ? (
                            <div>
                              <div>{t.buyerName}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.buyerEmail ?? ''}
                              </div>
                            </div>
                          ) : (
                            t.buyerEmail ?? '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
