'use client';

import { PageHeader } from '@/components/shared';
import { RequireAuth } from '@/lib/auth';

import { ServiceForm } from '../_components/service-form';

export default function NewServicePage() {
  return (
    <RequireAuth permission="content:write">
      <div className="space-y-6">
        <PageHeader title="New service" breadcrumbs={[{ label: 'Services', href: '/admin/services' }, { label: 'New' }]} />
        <ServiceForm />
      </div>
    </RequireAuth>
  );
}
