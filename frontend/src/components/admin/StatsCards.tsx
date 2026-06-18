'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/services/admin.api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { AdminStats } from '@/types';

export function StatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await adminApi.getStats();
        if (active) setStats(data);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : 'Failed to load stats');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorMessage message={error} />;
  if (!stats) return <Loading />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Total Assessments', value: stats.totalAssessments },
    { label: 'Total Attempts', value: stats.totalAttempts },
    { label: 'Potential Revenue', value: `$${stats.potentialRevenue}` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
