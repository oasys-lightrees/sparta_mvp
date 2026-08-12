'use client';

import { useEffect, useState } from 'react';
import { mentorApi } from '@/services/mentor.api';
import { BarChartCard } from '@/components/charts/BarChartCard';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { MentorAnalytics as MentorAnalyticsData } from '@/types';

export function MentorAnalytics() {
  const { t } = useLanguage();
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
      <h2 className="text-xl font-semibold tracking-tight">{t('analytics.title')}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard
          title={t('analytics.boughtTitle')}
          description={t('analytics.boughtDesc')}
          data={data ? data.purchasesByDate : null}
          xKey="date"
          yKey="count"
          error={error}
          emptyLabel={t('analytics.emptyBought')}
        />
        <LineChartCard
          title={t('analytics.revenueTitle')}
          description={t('analytics.revenueDesc')}
          data={data ? data.revenueByDate : null}
          xKey="date"
          yKey="amount"
          error={error}
          emptyLabel={t('analytics.emptyRevenue')}
        />
      </div>
    </section>
  );
}
