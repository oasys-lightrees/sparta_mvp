'use client';

import { useEffect, useState } from 'react';
import { Activity, DollarSign, FileText, Users } from 'lucide-react';
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
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    {
      label: 'Total Assessments',
      value: stats.totalAssessments,
      icon: FileText,
    },
    { label: 'Total Attempts', value: stats.totalAttempts, icon: Activity },
    {
      label: 'Potential Revenue',
      value: `$${stats.potentialRevenue}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="tnum font-display text-3xl font-bold tracking-tight">
                {c.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
