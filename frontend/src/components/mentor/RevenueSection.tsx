'use client';

import { useEffect, useState } from 'react';
import { Coins, Lock } from 'lucide-react';
import { mentorApi } from '@/services/mentor.api';
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
  value: number;
  icon: typeof Coins;
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
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export function RevenueSection() {
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
      <h2 className="text-xl font-semibold tracking-tight">Revenue</h2>
      {error ? (
        <ErrorMessage message={error} />
      ) : data === null ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <StatCard
              label="Total Token Revenue"
              value={data.totalRevenue}
              icon={Coins}
            />
            <StatCard
              label="Premium Reports Sold"
              value={data.premiumUnlocks}
              icon={Lock}
            />
          </div>
          {data.transactions.length === 0 ? (
            <EmptyState title="No premium unlocks yet" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {t.assessmentTitle ?? '—'}
                        </TableCell>
                        <TableCell>{t.amount}</TableCell>
                        <TableCell>
                          {new Date(t.date).toLocaleString()}
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
