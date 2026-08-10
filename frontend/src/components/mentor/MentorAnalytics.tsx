'use client';

import { useEffect, useState } from 'react';
import { mentorApi } from '@/services/mentor.api';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { PieChartCard } from '@/components/charts/PieChartCard';
import type { MentorAnalytics as MentorAnalyticsData } from '@/types';

export function MentorAnalytics() {
  const [data, setData] = useState<MentorAnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const analytics = await mentorApi.getAnalytics();
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
          title="Assessment performance"
          description="Attempts per assessment"
          data={data ? data.assessmentPerformance : null}
          xKey="name"
          yKey="attempts"
          error={error}
          emptyLabel="No attempts yet"
        />
        <LineChartCard
          title="Revenue over time"
          description="Balance (Rp) earned per day"
          data={data ? data.revenueByDate : null}
          xKey="date"
          yKey="amount"
          error={error}
          emptyLabel="No paid revenue yet"
        />
        <PieChartCard
          title="Score distribution"
          description="Beginner · Intermediate · Advanced"
          data={data ? data.scoreDistribution : null}
          error={error}
          emptyLabel="No attempts yet"
        />
        <BarChartCard
          title="Conversion funnel"
          description="Submissions to paid unlocks"
          data={data ? data.conversionFunnel : null}
          xKey="stage"
          yKey="value"
          error={error}
          emptyLabel="No activity yet"
        />
      </div>
    </section>
  );
}
