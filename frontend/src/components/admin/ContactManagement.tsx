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
import type { AdminContact, ContactStatus } from '@/types';

const STATUSES: ContactStatus[] = ['NEW', 'CONTACTED', 'CLOSED'];

export function ContactManagement() {
  const [items, setItems] = useState<AdminContact[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.listContacts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: ContactStatus) => {
    setBusyId(id);
    setError('');
    try {
      await adminApi.updateContactStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  if (error && !items) return <ErrorMessage message={error} />;
  if (!items) return <Loading />;
  if (items.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No contact messages yet.</p>
    );

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Set status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone ?? '—'}</TableCell>
              <TableCell className="max-w-xs truncate" title={c.message}>
                {c.message}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{c.status}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={c.status === s ? 'default' : 'outline'}
                      disabled={c.status === s || busyId === c.id}
                      onClick={() => setStatus(c.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
