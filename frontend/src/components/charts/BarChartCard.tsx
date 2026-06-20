'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './ChartCard';
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_PRIMARY,
  CHART_TOOLTIP_STYLE,
} from './chart-colors';

export function BarChartCard<T extends Record<string, unknown>>({
  title,
  description,
  data,
  xKey,
  yKey,
  error,
  emptyLabel,
}: {
  title: string;
  description?: string;
  data: T[] | null;
  xKey: string;
  yKey: string;
  error?: string;
  emptyLabel?: string;
}) {
  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={data === null}
      isEmpty={data !== null && data.length === 0}
      error={error}
      emptyLabel={emptyLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data ?? []}
          margin={{ top: 8, right: 16, bottom: 4, left: -16 }}
        >
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: CHART_AXIS }}
            stroke={CHART_AXIS}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: CHART_AXIS }}
            stroke={CHART_AXIS}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'rgba(79,70,229,0.06)' }}
            contentStyle={CHART_TOOLTIP_STYLE}
          />
          <Bar dataKey={yKey} fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
