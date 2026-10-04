'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DownloadIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type JobApplication,
  type JobSummary,
} from '@kmg/shared';

import { DateRangePicker, type IsoDateRange } from '@/components/admin/date-range-picker';
import { RatingStars } from '@/components/admin/rating-stars';
import { ConfirmDialog, DataTable, PageHeader, StatusBadge } from '@/components/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api/client';
import { downloadCsv } from '@/lib/csv';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { formatDate, initials } from '@/lib/utils';
import { FullPageLoader } from '@/components/shared';

interface ApplicationFilters {
  [key: string]: unknown;
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  jobId?: string;
  status?: string;
  minRating?: number;
  source?: string;
  from?: string;
  to?: string;
}

function useJobOptions() {
  const { data } = useQuery({
    queryKey: qk.admin.jobs.list({ pageSize: 100 }),
    queryFn: () => api.getList<JobSummary>('/admin/jobs', { query: { pageSize: 100 } }),
  });
  return (data?.data ?? []).map((job) => ({ label: job.title, value: job.id }));
}

function useApplicationsList(filters: ApplicationFilters) {
  return useQuery({
    queryKey: qk.admin.applications.list(filters),
    queryFn: () => api.getList<JobApplication>('/admin/applications', { query: filters }),
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
      <SelectTrigger size="sm" className="w-[170px]">
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

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const jobOptions = useJobOptions();
  const [filters, setFilters] = React.useState<ApplicationFilters>({
    page: 1,
    pageSize: 20,
    jobId: searchParams.get('jobId') ?? undefined,
  });
  const [range, setRange] = React.useState<IsoDateRange>({});
  const [bulkStatus, setBulkStatus] = React.useState<string>(APPLICATION_STATUSES[0]);

  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to, page: 1 }));
  }, [range.from, range.to]);

  const { data, isLoading, error } = useApplicationsList(filters);
  const patch = (next: Partial<ApplicationFilters>) => setFilters((prev) => ({ ...prev, ...next, page: 1 }));

  const bulkMutation = useMutation({
    mutationFn: (payload: { ids: string[]; action: 'status' | 'delete' | 'export'; status?: string }) =>
      api.post<string>('/admin/applications/bulk', payload),
    onSuccess: (result, variables) => {
      if (variables.action === 'export') {
        downloadCsv(`applications-${Date.now()}.csv`, result);
        toast.success('Export ready');
      } else {
        toast.success(variables.action === 'delete' ? 'Applications deleted' : 'Status updated');
      }
      queryClient.invalidateQueries({ queryKey: qk.admin.applications.all });
    },
    onError: (mutationError) => toast.error(errorMessage(mutationError)),
  });

  const exportFiltered = async () => {
    try {
      const csv = await api.get<string>('/admin/applications/export', { query: filters });
      downloadCsv(`applications-${Date.now()}.csv`, csv);
      toast.success('Export ready');
    } catch (exportError) {
      toast.error(errorMessage(exportError));
    }
  };

  const columns = React.useMemo<ColumnDef<JobApplication, unknown>[]>(
    () => [
      {
        id: 'candidate',
        header: 'Candidate',
        cell: ({ row }) => (
          <Link href={`/admin/applications/${row.original.id}`} className="flex items-center gap-3 hover:underline">
            <Avatar size="sm">
              <AvatarFallback>{initials(row.original.candidate.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.candidate.name}</p>
              <p className="text-muted-foreground text-xs">{row.original.candidate.email}</p>
            </div>
          </Link>
        ),
        enableSorting: false,
      },
      {
        id: 'job',
        header: 'Job',
        cell: ({ row }) => <span className="text-sm">{row.original.job.title}</span>,
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge kind="application" status={row.original.status} />,
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => <RatingStars value={row.original.rating ?? 0} size="sm" />,
        enableSorting: false,
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => row.original.source ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Applied',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Every candidate application across all open roles."
        actions={
          <Can permission="applications:read">
            <Button variant="outline" onClick={exportFiltered}>
              <DownloadIcon className="size-4" />
              Export CSV
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
        searchPlaceholder="Search candidates…"
        sort={filters.sort}
        onSortChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
        selectable
        getRowId={(row) => row.id}
        emptyTitle="No applications found"
        emptyDescription="Try adjusting your filters."
        onRowClick={(row) => router.push(`/admin/applications/${row.id}`)}
        toolbar={
          <>
            <FilterSelect value={filters.jobId} onChange={(jobId) => patch({ jobId })} placeholder="Job" options={jobOptions} />
            <FilterSelect
              value={filters.status}
              onChange={(status) => patch({ status })}
              placeholder="Status"
              options={APPLICATION_STATUSES.map((status) => ({ label: APPLICATION_STATUS_LABELS[status], value: status }))}
            />
            <FilterSelect
              value={filters.minRating ? String(filters.minRating) : undefined}
              onChange={(minRating) => patch({ minRating: minRating ? Number(minRating) : undefined })}
              placeholder="Min rating"
              options={[1, 2, 3, 4, 5].map((n) => ({ label: `${n}+`, value: String(n) }))}
            />
            <Input
              value={filters.source ?? ''}
              onChange={(event) => patch({ source: event.target.value || undefined })}
              placeholder="Source"
              className="h-8 w-32"
            />
            <DateRangePicker value={range} onChange={setRange} className="h-8" />
          </>
        }
        bulkActions={(ids, clear) => (
          <Can permission="applications:write">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {APPLICATION_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkMutation.mutate({ ids, action: 'status', status: bulkStatus }, { onSuccess: () => clear() })
              }
            >
              Apply status
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMutation.mutate({ ids, action: 'export' })}
            >
              <DownloadIcon className="size-4" />
              Export selected
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline" className="text-destructive">
                  <Trash2Icon className="size-4" />
                  Delete
                </Button>
              }
              title={`Delete ${ids.length} application(s)?`}
              description="This cannot be undone."
              variant="destructive"
              confirmLabel="Delete"
              onConfirm={() => bulkMutation.mutateAsync({ ids, action: 'delete' }).then(() => clear())}
            />
          </Can>
        )}
      />

      {error ? <p className="text-destructive text-sm">{errorMessage(error)}</p> : null}
    </div>
  );
}

export default function AdminApplicationsPage() {
  return (
    <React.Suspense fallback={<FullPageLoader />}>
      <RequireAuth permission="applications:read">
        <ApplicationsContent />
      </RequireAuth>
    </React.Suspense>
  );
}
