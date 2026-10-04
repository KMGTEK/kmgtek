'use client';

import { PageHeader } from '@/components/shared';
import { RequireAuth } from '@/lib/auth';

import { CaseStudyForm } from '../_components/case-study-form';

export default function NewCaseStudyPage() {
  return (
    <RequireAuth permission="content:write">
      <div className="space-y-6">
        <PageHeader title="New case study" breadcrumbs={[{ label: 'Case Studies', href: '/admin/case-studies' }, { label: 'New' }]} />
        <CaseStudyForm />
      </div>
    </RequireAuth>
  );
}
