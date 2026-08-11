'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/services/admin.api';
import { formatIdr } from '@/lib/currency';
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

  const grantBalance = async (id: string) => {
    const input = window.prompt('How much balance to grant (Rp)?', '50000');
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Amount must be a positive whole number');
      return;
    }
    setBusyId(id);
    setError('');
    try {
      await adminApi.grantBalance(id, amount);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant balance');
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
            <TableHead>Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="font-medium">{formatIdr(u.balance)}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === u.id}
                  onClick={() => grantBalance(u.id)}
                >
                  Grant Balance
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
