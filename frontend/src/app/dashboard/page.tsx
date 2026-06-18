'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/common/EmptyState';

function DashboardHome() {
  const { user } = useAuth();
  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Your Dashboard</h1>
        <p className="text-muted-foreground">Signed in as {user?.email}</p>
      </div>
      <EmptyState
        title="No reports yet"
        description="Your reports and assessment history will appear here once you complete an assessment."
      />
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
