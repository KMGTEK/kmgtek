'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import type { CaseStudy } from '@kmg/shared';

import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';

import { CaseStudyForm } from '../_components/case-study-form';

export default function EditCaseStudyPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.caseStudy(params.id),
    queryFn: () => api.getData<CaseStudy>(`/admin/case-studies/${params.id}`),
  });

  return (
    <RequireAuth permission="content:write">
      <div className="space-y-6">
        <PageHeader title={data?.title ?? 'Edit case study'} breadcrumbs={[{ label: 'Case Studies', href: '/admin/case-studies' }, { label: 'Edit' }]} />
        {isLoading ? (
          <DetailSkeleton />
        ) : error || !data ? (
          <ErrorState error={error} onAction={() => refetch()} />
        ) : (
          <CaseStudyForm caseStudyId={params.id} initialData={data} />
        )}
      </div>
    </RequireAuth>
  );
}
