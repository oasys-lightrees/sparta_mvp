'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

function MentorHome() {
  const { user } = useAuth();
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Mentor Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Signed in as {user?.email}</p>
      <p className="mt-6 text-sm text-muted-foreground">
        Assessment management and results will appear here.
      </p>
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
