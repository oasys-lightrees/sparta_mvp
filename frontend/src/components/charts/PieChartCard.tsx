'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_COLORS, CHART_TOOLTIP_STYLE } from './chart-colors';
import type { ChartPoint } from '@/types';

export function PieChartCard({
  title,
  description,
  data,
  error,
  emptyLabel,
}: {
  title: string;
  description?: string;
  data: ChartPoint[] | null;
  error?: string;
  emptyLabel?: string;
}) {
  // Treat an all-zero dataset as empty so the chart never renders a blank ring.
  const hasValues =
    data !== null && data.some((d) => d.value > 0);

  return (
    <ChartCard
      title={title}
      description={description}
      isLoading={data === null}
      isEmpty={data !== null && !hasValues}
      error={error}
      emptyLabel={emptyLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data ?? []}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {(data ?? []).map((entry, i) => (
              <Cell
                key={entry.name}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend
            verticalAlign="bottom"
            height={24}
            iconType="circle"
            wrapperStyle={{ fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
