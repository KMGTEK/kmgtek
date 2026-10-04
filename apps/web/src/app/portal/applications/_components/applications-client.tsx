'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type JobApplication,
  type Paginated,
} from '@kmg/shared';

import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { formatDate } from '@/lib/utils';

const ANY_STATUS = '__any__';

const columns: ColumnDef<JobApplication, unknown>[] = [
  {
    accessorKey: 'job',
    header: 'Role',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.job.title}</p>
        <p className="text-muted-foreground text-xs">{row.original.job.location}</p>
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Applied',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge kind="application" status={row.original.status} />,
  },
];

export function ApplicationsClient() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<ApplicationStatus | undefined>(undefined);

  const params = { page, pageSize: 10, status };

  const { data, isLoading } = useQuery({
    queryKey: qk.me.applications(params),
    queryFn: () => api.getList<JobApplication>('/me/applications', { query: params }),
    placeholderData: keepPreviousData,
  });

  const result: Paginated<JobApplication> | undefined = data;

  return (
    <div className="space-y-6">
      <PageHeader title="My Applications" description="Track every role you've applied to and its current stage." />

      <DataTable
        columns={columns}
        data={result?.data ?? []}
        meta={result?.meta}
        loading={isLoading}
        onRowClick={(row) => router.push(`/portal/applications/${row.id}`)}
        onPageChange={setPage}
        hideColumnToggle
        toolbar={
          <Select
            value={status ?? ANY_STATUS}
            onValueChange={(value) => {
              setPage(1);
              setStatus(value === ANY_STATUS ? undefined : (value as ApplicationStatus));
            }}
          >
            <SelectTrigger size="sm" className="w-[170px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_STATUS}>All statuses</SelectItem>
              {APPLICATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {APPLICATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        emptyTitle="No applications yet"
        emptyDescription="Once you apply to a role, it will show up here."
        emptyAction={
          <Button asChild size="sm">
            <Link href="/careers">Browse roles</Link>
          </Button>
        }
      />
    </div>
  );
}
