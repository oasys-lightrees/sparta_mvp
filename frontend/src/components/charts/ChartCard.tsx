'use client';

import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';

/**
 * Shared frame for every chart card: title, description and the four render
 * states (error, loading, empty, chart). Charts render inside a fixed-height,
 * full-width box so recharts' ResponsiveContainer can size itself.
 */
export function ChartCard({
  title,
  description,
  isLoading,
  isEmpty,
  error,
  emptyLabel = 'No data yet',
  children,
}: {
  title: string;
  description?: string;
  isLoading: boolean;
  isEmpty: boolean;
  error?: string;
  emptyLabel?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorMessage message={error} />
        ) : isLoading ? (
          <Loading />
        ) : isEmpty ? (
          <EmptyState title={emptyLabel} />
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
