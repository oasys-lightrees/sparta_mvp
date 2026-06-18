'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

function DashboardHome() {
  const { user } = useAuth();
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Your Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Signed in as {user?.email}</p>
      <p className="mt-6 text-sm text-muted-foreground">
        Your reports and assessment history will appear here.
      </p>
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
