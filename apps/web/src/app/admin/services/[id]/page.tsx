'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';

import type { AdminService } from '../_components/service-form';
import { ServiceForm } from '../_components/service-form';

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.service(params.id),
    queryFn: () => api.getData<AdminService>(`/admin/services/${params.id}`),
  });

  return (
    <RequireAuth permission="content:write">
      <div className="space-y-6">
        <PageHeader title={data?.title ?? 'Edit service'} breadcrumbs={[{ label: 'Services', href: '/admin/services' }, { label: 'Edit' }]} />
        {isLoading ? (
          <DetailSkeleton />
        ) : error || !data ? (
          <ErrorState error={error} onAction={() => refetch()} />
        ) : (
          <ServiceForm serviceId={params.id} initialData={data} />
        )}
      </div>
    </RequireAuth>
  );
}
