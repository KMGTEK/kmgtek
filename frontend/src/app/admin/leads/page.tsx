'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { DownloadIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { LEAD_STATUSES, type ContactLead, type Service } from '@kmg/shared';

import { useAssignableUsers } from '@/components/admin/assignable-users';
import { DateRangePicker, type IsoDateRange } from '@/components/admin/date-range-picker';
import { DataTable, PageHeader, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
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
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
};

interface LeadFilters {
  [key: string]: unknown;
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  status?: string;
  assignedToId?: string;
  serviceId?: string;
  from?: string;
  to?: string;
}

function useServiceOptions() {
  const { data } = useQuery({
    queryKey: ['services', 'options'],
    queryFn: () => api.getData<Service[]>('/services'),
    staleTime: 5 * 60 * 1000,
  });
  return (data ?? []).map((service) => ({ label: service.title, value: service.id }));
}

function useLeadsList(filters: LeadFilters) {
  return useQuery({
    queryKey: qk.admin.leads.list(filters),
    queryFn: () => api.getList<ContactLead>('/admin/leads', { query: filters }),
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

function AssigneeCell({ lead }: { lead: ContactLead }) {
  const queryClient = useQueryClient();
  const { data: assignable } = useAssignableUsers('leads:write');

  const mutation = useMutation({
    mutationFn: (assignedToId: string) => api.patchData<ContactLead>(`/admin/leads/${lead.id}`, { assignedToId }),
    onSuccess: () => {
      toast.success('Lead assigned');
      queryClient.invalidateQueries({ queryKey: qk.admin.leads.all });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Can permission="leads:assign" fallback={<span className="text-sm">{lead.assignedTo?.name ?? 'Unassigned'}</span>}>
      <Select
        value={lead.assignedTo?.id ?? 'unassigned'}
        onValueChange={(value) => mutation.mutate(value)}
      >
        <SelectTrigger size="sm" className="w-[160px]" onClick={(event) => event.stopPropagation()}>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent onClick={(event) => event.stopPropagation()}>
          <SelectItem value="unassigned" disabled>
            Unassigned
          </SelectItem>
          {(assignable ?? []).map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Can>
  );
}

function LeadsContent() {
  const router = useRouter();
  const serviceOptions = useServiceOptions();
  const [range, setRange] = React.useState<IsoDateRange>({});
  const [filters, setFilters] = React.useState<LeadFilters>({ page: 1, pageSize: 20 });

  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to, page: 1 }));
  }, [range.from, range.to]);

  const { data, isLoading, error } = useLeadsList(filters);
  const patch = (next: Partial<LeadFilters>) => setFilters((prev) => ({ ...prev, ...next, page: 1 }));

  const exportLeads = async () => {
    try {
      const csv = await api.get<string>('/admin/leads/export', { query: filters });
      downloadCsv(`leads-${Date.now()}.csv`, csv);
      toast.success('Export ready');
    } catch (exportError) {
      toast.error(errorMessage(exportError));
    }
  };

  const columns = React.useMemo<ColumnDef<ContactLead, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <Link href={`/admin/leads/${row.original.id}`} className="font-medium hover:underline">
              {row.original.name}
            </Link>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      { accessorKey: 'company', header: 'Company', cell: ({ row }) => row.original.company ?? '—' },
      {
        id: 'service',
        header: 'Service',
        cell: ({ row }) => row.original.service?.title ?? row.original.serviceInterest ?? '—',
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge kind="lead" status={row.original.status} />,
      },
      {
        id: 'assignedTo',
        header: 'Assigned to',
        cell: ({ row }) => <AssigneeCell lead={row.original} />,
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: 'Received',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Contact form submissions and sales inquiries."
        actions={
          <Can permission="leads:read">
            <Button variant="outline" onClick={exportLeads}>
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
        searchPlaceholder="Search leads…"
        sort={filters.sort}
        onSortChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/admin/leads/${row.id}`)}
        emptyTitle="No leads found"
        emptyDescription="Try adjusting your filters."
        toolbar={
          <>
            <FilterSelect
              value={filters.status}
              onChange={(status) => patch({ status })}
              placeholder="Status"
              options={LEAD_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
            />
            <FilterSelect
              value={filters.serviceId}
              onChange={(serviceId) => patch({ serviceId })}
              placeholder="Service"
              options={serviceOptions}
            />
            <DateRangePicker value={range} onChange={setRange} />
          </>
        }
      />

      {error ? <p className="text-destructive text-sm">{errorMessage(error)}</p> : null}
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <RequireAuth permission="leads:read">
      <LeadsContent />
    </RequireAuth>
  );
}
