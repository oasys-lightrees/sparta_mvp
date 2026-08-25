'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { roleHome } from '@/lib/roles';
import { getPendingAttempt } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export function LoginForm({ admin = false }: { admin?: boolean }) {
  const { login, logout } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (admin) {
        // Admin console is gated: only administrators may enter here.
        if (user.role !== 'ADMIN') {
          logout();
          setError('This account does not have admin access.');
          setSubmitting(false);
          return;
        }
        router.replace('/admin');
        return;
      }
      // If a guest attempt is pending, continue to claim + report; else role home.
      const pending = getPendingAttempt();
      router.replace(pending ? `/reports/${pending}` : roleHome(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{admin ? 'Admin sign in' : 'Sign in'}</CardTitle>
        <CardDescription>
          {admin
            ? 'Sign in to the LATO admin console.'
            : 'Welcome back to LATO.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <ErrorMessage message={error} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
          {admin ? null : (
            <p className="text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
