'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/services/admin.api';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import type { AdminAnalytics as AdminAnalyticsData } from '@/types';

export function AdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const analytics = await adminApi.getAnalytics();
        if (active) setData(analytics);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Failed to load analytics',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Platform growth"
          description="Users, experts and assessments"
          data={data ? data.platformGrowth : null}
          xKey="name"
          yKey="value"
          error={error}
          emptyLabel="No data yet"
        />
        <BarChartCard
          title="Revenue overview"
          description="Token transactions and paid unlocks"
          data={data ? data.revenueOverview : null}
          xKey="name"
          yKey="value"
          error={error}
          emptyLabel="No transactions yet"
        />
        <div className="lg:col-span-2">
          <LineChartCard
            title="Activity over time"
            description="Submissions per day"
            data={data ? data.activityOverTime : null}
            xKey="date"
            yKey="submissions"
            error={error}
            emptyLabel="No submissions yet"
          />
        </div>
      </div>
    </section>
  );
}
