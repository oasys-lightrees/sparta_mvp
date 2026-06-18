'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/services/admin.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { AdminAssessment } from '@/types';

export function AssessmentManagement() {
  const [items, setItems] = useState<AdminAssessment[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.listAssessments());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load assessments',
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = (a: AdminAssessment) =>
    run(a.id, () =>
      adminApi.updateAssessment(a.id, {
        status: a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
      }),
    );

  const editPrice = (a: AdminAssessment) => {
    const input = window.prompt(`New price for "${a.title}"`, String(a.price));
    if (input === null) return;
    const price = Number(input);
    if (!Number.isInteger(price) || price < 0) {
      setError('Price must be a non-negative integer');
      return;
    }
    run(a.id, () => adminApi.updateAssessment(a.id, { price }));
  };

  const remove = (a: AdminAssessment) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    run(a.id, () => adminApi.deleteAssessment(a.id));
  };

  if (error && !items) return <ErrorMessage message={error} />;
  if (!items) return <Loading />;
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">No assessments yet.</p>;

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Mentor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell>{a.mentor_email}</TableCell>
              <TableCell>
                <Badge
                  variant={a.status === 'PUBLISHED' ? 'default' : 'secondary'}
                >
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell>{a.price > 0 ? `$${a.price}` : 'Free'}</TableCell>
              <TableCell>{a.totalAttempts}</TableCell>
              <TableCell>${a.price * a.totalAttempts}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(a)}
                    disabled={busyId === a.id}
                  >
                    {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editPrice(a)}
                    disabled={busyId === a.id}
                  >
                    Price
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(a)}
                    disabled={busyId === a.id}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
