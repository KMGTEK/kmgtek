'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CopyIcon, EyeIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUSES,
  WORK_MODES,
  WORK_MODE_LABELS,
  type JobCategory,
  type JobSummary,
} from '@kmg/shared';

import { ConfirmDialog, DataTable, PageHeader, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', CLOSED: 'Closed', ARCHIVED: 'Archived' };

interface JobFilters {
  [key: string]: unknown;
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  status?: string;
  departmentId?: string;
  workMode?: string;
  employmentType?: string;
}

function useDepartments() {
  return useQuery({
    queryKey: qk.admin.departments,
    queryFn: () => api.getData<JobCategory[]>('/admin/job-categories'),
  });
}

function useJobsList(filters: JobFilters) {
  return useQuery({
    queryKey: qk.admin.jobs.list(filters),
    queryFn: () => api.getList<JobSummary>('/admin/jobs', { query: filters }),
    placeholderData: (previous) => previous,
  });
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  return (
    <Select value={value ?? 'all'} onValueChange={(next) => onChange(next === 'all' ? undefined : next)}>
      <SelectTrigger size="sm" className="w-[160px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function JobsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const [filters, setFilters] = React.useState<JobFilters>({ page: 1, pageSize: 20 });

  const { data, isLoading, error } = useJobsList(filters);

  const patch = (next: Partial<JobFilters>) => setFilters((prev) => ({ ...prev, ...next, page: 1 }));

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.postData(`/admin/jobs/${id}/duplicate`),
    onSuccess: () => {
      toast.success('Job duplicated as a draft');
      queryClient.invalidateQueries({ queryKey: qk.admin.jobs.all });
      revalidatePublicSite('jobs', 'sitemap');
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/jobs/${id}`),
    onSuccess: () => {
      toast.success('Job deleted');
      queryClient.invalidateQueries({ queryKey: qk.admin.jobs.all });
      revalidatePublicSite('jobs', 'sitemap');
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  const columns = React.useMemo<ColumnDef<JobSummary, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <Link href={`/admin/jobs/${row.original.id}`} className="font-medium hover:underline">
              {row.original.title}
            </Link>
            <p className="text-muted-foreground text-xs">{row.original.department?.name ?? 'No department'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.location}</p>
            <p className="text-muted-foreground text-xs">
              {WORK_MODE_LABELS[row.original.workMode]} · {EMPLOYMENT_TYPE_LABELS[row.original.employmentType]}
            </p>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge kind="job" status={row.original.status} />,
      },
      {
        id: 'applicationCount',
        header: 'Applicants',
        cell: ({ row }) => (
          <Link
            href={`/admin/applications?jobId=${row.original.id}`}
            className="hover:text-primary-text inline-flex items-center gap-1 text-sm"
          >
            <UsersIcon className="size-3.5" />
            {row.original.applicationCount ?? 0}
          </Link>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'closingDate',
        header: 'Closing',
        cell: ({ row }) => formatDate(row.original.closingDate),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="View applications" asChild>
              <Link href={`/admin/applications?jobId=${row.original.id}`}>
                <EyeIcon className="size-4" />
              </Link>
            </Button>
            <Can permission="jobs:write">
              <Button variant="ghost" size="icon-sm" aria-label="Edit job" asChild>
                <Link href={`/admin/jobs/${row.original.id}`}>
                  <PencilIcon className="size-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Duplicate job"
                onClick={() => duplicateMutation.mutate(row.original.id)}
              >
                <CopyIcon className="size-4" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Delete job">
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                }
                title={`Delete "${row.original.title}"?`}
                description="This removes the posting. Existing applications keep their history."
                variant="destructive"
                confirmLabel="Delete"
                onConfirm={() => deleteMutation.mutateAsync(row.original.id)}
              />
            </Can>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duplicateMutation, deleteMutation],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Manage open roles, drafts and closed positions."
        actions={
          <Can permission="jobs:write">
            <Button onClick={() => router.push('/admin/jobs/new')}>
              <PlusIcon className="size-4" />
              New job
            </Button>
          </Can>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={filters.search}
        onSearchChange={(search) => patch({ search: search || undefined })}
        searchPlaceholder="Search jobs…"
        sort={filters.sort}
        onSortChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
        getRowId={(row) => row.id}
        emptyTitle="No jobs found"
        emptyDescription="Try adjusting your filters, or create a new job posting."
        toolbar={
          <>
            <FilterSelect
              value={filters.status}
              onChange={(status) => patch({ status })}
              placeholder="Status"
              options={JOB_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
            />
            <FilterSelect
              value={filters.departmentId}
              onChange={(departmentId) => patch({ departmentId })}
              placeholder="Department"
              options={(departments ?? []).map((department) => ({ label: department.name, value: department.id }))}
            />
            <FilterSelect
              value={filters.workMode}
              onChange={(workMode) => patch({ workMode })}
              placeholder="Work mode"
              options={WORK_MODES.map((mode) => ({ label: WORK_MODE_LABELS[mode], value: mode }))}
            />
            <FilterSelect
              value={filters.employmentType}
              onChange={(employmentType) => patch({ employmentType })}
              placeholder="Employment type"
              options={EMPLOYMENT_TYPES.map((type) => ({ label: EMPLOYMENT_TYPE_LABELS[type], value: type }))}
            />
          </>
        }
      />

      {error ? <p className="text-destructive text-sm">{errorMessage(error)}</p> : null}
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <RequireAuth permission="jobs:read">
      <JobsContent />
    </RequireAuth>
  );
}
