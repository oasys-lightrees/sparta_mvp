'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/services/admin.api';
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
import type { AdminUser, Role } from '@/types';

const ROLES: Role[] = ['USER', 'MENTOR', 'ADMIN'];

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await adminApi.listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (id: string, role: Role) => {
    setBusyId(id);
    setError('');
    try {
      await adminApi.changeUserRole(id, role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setBusyId(null);
    }
  };

  if (error && !users) return <ErrorMessage message={error} />;
  if (!users) return <Loading />;
  if (users.length === 0)
    return <p className="text-sm text-muted-foreground">No users yet.</p>;

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {ROLES.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={u.role === r ? 'default' : 'outline'}
                      disabled={u.role === r || busyId === u.id}
                      onClick={() => changeRole(u.id, r)}
                    >
                      {r}
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
