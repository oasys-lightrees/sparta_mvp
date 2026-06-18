'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StatsCards } from '@/components/admin/StatsCards';
import { UserManagement } from '@/components/admin/UserManagement';
import { AssessmentManagement } from '@/components/admin/AssessmentManagement';
import { ContentManagement } from '@/components/admin/ContentManagement';
import { ContactManagement } from '@/components/admin/ContactManagement';
import { Button } from '@/components/ui/button';

const TABS = [
  'Overview',
  'Users',
  'Assessments',
  'Content',
  'Contacts',
] as const;
type Tab = (typeof TABS)[number];

function AdminHome() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div className="container py-10">
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-3">
        {TABS.map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === 'Overview' ? <StatsCards /> : null}
      {tab === 'Users' ? <UserManagement /> : null}
      {tab === 'Assessments' ? <AssessmentManagement /> : null}
      {tab === 'Content' ? <ContentManagement /> : null}
      {tab === 'Contacts' ? <ContactManagement /> : null}
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
