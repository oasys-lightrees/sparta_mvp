'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, FileText } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { attemptApi } from '@/services/attempt.api';
import { assessmentApi } from '@/services/assessment.api';
import { AssessmentCard } from '@/components/assessment/AssessmentCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Button } from '@/components/ui/button';
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
import type { AssessmentSummary, MyAttempt } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof ClipboardList;
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

function DashboardHome() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<MyAttempt[] | null>(null);
  const [attemptsError, setAttemptsError] = useState('');
  const [explore, setExplore] = useState<AssessmentSummary[] | null>(null);
  const [exploreError, setExploreError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mine = await attemptApi.listMine();
        if (active) setAttempts(mine);
      } catch (err) {
        if (active)
          setAttemptsError(
            err instanceof Error ? err.message : 'Failed to load your attempts',
          );
      }
      try {
        const published = await assessmentApi.listPublished();
        if (active) setExplore(published);
      } catch (err) {
        if (active)
          setExploreError(
            err instanceof Error ? err.message : 'Failed to load assessments',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const total = attempts?.length ?? 0;
  const reportsAvailable = attempts?.filter((a) => a.report_id).length ?? 0;

  return (
    <div className="container space-y-10 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user?.email ? `, ${user.email}` : ''}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your assessments and reports.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <StatCard
          label="Assessments taken"
          value={attempts === null ? '—' : total}
          icon={ClipboardList}
        />
        <StatCard
          label="Reports available"
          value={attempts === null ? '—' : reportsAvailable}
          icon={FileText}
        />
      </div>

      {/* My Assessments */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">My Assessments</h2>
        {attemptsError ? (
          <ErrorMessage message={attemptsError} />
        ) : attempts === null ? (
          <Loading />
        ) : attempts.length === 0 ? (
          <EmptyState
            title="No assessments yet"
            description="Take an assessment below and your results will show up here."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.attempt_id}>
                      <TableCell className="font-medium">
                        {a.assessment_title}
                      </TableCell>
                      <TableCell>{a.score}</TableCell>
                      <TableCell>
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/reports/${a.attempt_id}`}>
                            View Report
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Explore Assessments */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Explore Assessments
        </h2>
        {exploreError ? (
          <ErrorMessage message={exploreError} />
        ) : explore === null ? (
          <Loading />
        ) : explore.length === 0 ? (
          <EmptyState title="No assessments available yet" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((a) => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardHome />
    </ProtectedRoute>
  );
}
