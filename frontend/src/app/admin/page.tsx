'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

function AdminHome() {
  const { user } = useAuth();
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Signed in as {user?.email}</p>
      <p className="mt-6 text-sm text-muted-foreground">
        Overview, users, content and contacts will appear here.
      </p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute roles={['ADMIN']}>
      <AdminHome />
    </ProtectedRoute>
  );
}
