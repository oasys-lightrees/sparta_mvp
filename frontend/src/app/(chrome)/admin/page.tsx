'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { StatsCards } from '@/components/admin/StatsCards';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { UserManagement } from '@/components/admin/UserManagement';
import { AssessmentManagement } from '@/components/admin/AssessmentManagement';
import { ContentManagement } from '@/components/admin/ContentManagement';
import { ContactManagement } from '@/components/admin/ContactManagement';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TABS = [
  'Overview',
  'Users',
  'Assessments',
  'Content',
  'Contacts',
] as const;
type Tab = (typeof TABS)[number];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function AdminHome() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, assessments, content and contact messages.
        </p>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((t) => (
          <Button
            key={t}
            variant="ghost"
            size="sm"
            onClick={() => setTab(t)}
            className={cn(
              'data-[active=true]:bg-background data-[active=true]:shadow-sm',
            )}
            data-active={tab === t}
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <div className="space-y-8">
          <StatsCards />
          <AdminAnalytics />
        </div>
      ) : null}
      {tab === 'Users' ? (
        <Section title="User Management">
          <UserManagement />
        </Section>
      ) : null}
      {tab === 'Assessments' ? (
        <Section title="Assessment Management">
          <AssessmentManagement />
        </Section>
      ) : null}
      {tab === 'Content' ? (
        <Section title="Content Management">
          <ContentManagement />
        </Section>
      ) : null}
      {tab === 'Contacts' ? (
        <Section title="Contact Messages">
          <ContactManagement />
        </Section>
      ) : null}
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
