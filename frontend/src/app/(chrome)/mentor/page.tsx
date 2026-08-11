'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, FileText, Users } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { mentorApi } from '@/services/mentor.api';
import { assessmentApi } from '@/services/assessment.api';
import { AssessmentTable } from '@/components/mentor/AssessmentTable';
import { MentorAnalytics } from '@/components/mentor/MentorAnalytics';
import { RevenueSection } from '@/components/mentor/RevenueSection';
import {
  AssessmentForm,
  type AssessmentPayload,
} from '@/components/mentor/AssessmentForm';
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
import type { MentorAssessmentListItem, MentorStats } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof FileText;
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
        <p className="tnum font-display text-3xl font-bold tracking-tight">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function MentorHome() {
  const [items, setItems] = useState<MentorAssessmentListItem[] | null>(null);
  const [stats, setStats] = useState<MentorStats | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, mentorStats] = await Promise.all([
        mentorApi.listMyAssessments(),
        mentorApi.getStats(),
      ]);
      setItems(list);
      setStats(mentorStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (payload: AssessmentPayload) => {
    setCreating(true);
    setCreateError('');
    try {
      await assessmentApi.create(payload);
      setShowCreate(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (item: MentorAssessmentListItem) => {
    setBusyId(item.id);
    setError('');
    try {
      await assessmentApi.setStatus(
        item.id,
        item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: MentorAssessmentListItem) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(item.id);
    setError('');
    try {
      await assessmentApi.remove(item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Expert Dashboard
          </h1>
          <p className="text-muted-foreground">
            Create and manage your assessments, questions and results.
          </p>
        </div>
        {!showCreate ? (
          <Button variant="bronze" onClick={() => setShowCreate(true)}>
            Create assessment
          </Button>
        ) : null}
      </div>

      {/* Overview analytics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Assessments"
          value={stats === null ? '—' : stats.totalAssessments}
          icon={FileText}
        />
        <StatCard
          label="Published Assessments"
          value={stats === null ? '—' : stats.publishedAssessments}
          icon={CheckCircle2}
        />
        <StatCard
          label="Total People Taken Tests"
          value={stats === null ? '—' : stats.totalAttempts}
          icon={Users}
        />
        <StatCard
          label="Average Score"
          value={stats === null ? '—' : stats.averageScore}
          icon={BarChart3}
        />
      </div>

      {showCreate ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <AssessmentForm
              submitLabel="Create"
              submitting={creating}
              error={createError}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      <ErrorMessage message={error} />

      <div className="mt-4">
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState
            title="Create your first assessment"
            description="Build an assessment, add your questions, and start collecting responses and revenue."
            action={
              !showCreate ? (
                <Button variant="bronze" onClick={() => setShowCreate(true)}>
                  Create assessment
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <AssessmentTable
                items={items}
                busyId={busyId}
                onToggleStatus={handleToggle}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-10">
        <MentorAnalytics />
      </div>

      <div className="mt-10">
        <RevenueSection />
      </div>
    </div>
  );
}

export default function MentorPage() {
  return (
    <ProtectedRoute roles={['MENTOR']}>
      <MentorHome />
    </ProtectedRoute>
  );
}
