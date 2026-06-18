'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { mentorApi } from '@/services/mentor.api';
import { assessmentApi } from '@/services/assessment.api';
import { AssessmentTable } from '@/components/mentor/AssessmentTable';
import {
  AssessmentForm,
  type AssessmentPayload,
} from '@/components/mentor/AssessmentForm';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { MentorAssessmentListItem } from '@/types';

function MentorHome() {
  const [items, setItems] = useState<MentorAssessmentListItem[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await mentorApi.listMyAssessments());
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mentor Dashboard</h1>
        {!showCreate ? (
          <Button onClick={() => setShowCreate(true)}>Create assessment</Button>
        ) : null}
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
          <p className="text-muted-foreground">
            You have no assessments yet. Create your first one above.
          </p>
        ) : (
          <AssessmentTable
            items={items}
            busyId={busyId}
            onToggleStatus={handleToggle}
            onDelete={handleDelete}
          />
        )}
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
