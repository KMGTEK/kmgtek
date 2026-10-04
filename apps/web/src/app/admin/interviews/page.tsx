'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { LayoutListIcon, PlusIcon, Rows3Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { INTERVIEW_ROUNDS, INTERVIEW_STATUSES, type Interview } from '@kmg/shared';

import { useAssignableUsers } from '@/components/admin/assignable-users';
import { DateRangePicker, type IsoDateRange } from '@/components/admin/date-range-picker';
import { InterviewFormDialog } from '@/components/admin/interview-form-dialog';
import { DataTable, EmptyState, PageHeader, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth/guards';
import { formatDate } from '@/lib/utils';

const ROUND_LABELS: Record<string, string> = {
  SCREENING: 'Screening',
  TECHNICAL: 'Technical',
  MANAGERIAL: 'Managerial',
  HR: 'HR',
  CLIENT: 'Client',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  RESCHEDULED: 'Rescheduled',
};

interface InterviewFilters {
  [key: string]: unknown;
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  status?: string;
  interviewerId?: string;
  from?: string;
  to?: string;
  mine?: boolean;
}

function useInterviewsList(filters: InterviewFilters) {
  return useQuery({
    queryKey: qk.admin.interviews.list(filters),
    queryFn: () => api.getList<Interview>('/admin/interviews', { query: filters }),
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

function groupByDay(interviews: Interview[]) {
  const groups = new Map<string, Interview[]>();
  for (const interview of interviews) {
    const key = formatDate(interview.scheduledAt, 'long');
    groups.set(key, [...(groups.get(key) ?? []), interview]);
  }
  return Array.from(groups.entries());
}

function ByDayView({ interviews }: { interviews: Interview[] }) {
  if (interviews.length === 0) return <EmptyState title="No interviews found" description="Try adjusting your filters." />;
  return (
    <div className="space-y-6">
      {groupByDay(interviews).map(([day, items]) => (
        <div key={day}>
          <h3 className="font-display mb-2 text-sm font-semibold">{day}</h3>
          <ul className="divide-border divide-y rounded-xl border">
            {items.map((interview) => (
              <li key={interview.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <Link href={`/admin/interviews/${interview.id}`} className="font-medium hover:underline">
                    {interview.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(interview.scheduledAt, 'time')} · {ROUND_LABELS[interview.round]} ·{' '}
                    {interview.interviewers.map((person) => person.name).join(', ')}
                  </p>
                </div>
                <StatusBadge kind="interview" status={interview.status} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function InterviewsContent() {
  const router = useRouter();
  const { data: interviewers } = useAssignableUsers('interviews:feedback');
  const [view, setView] = React.useState<'list' | 'day'>('list');
  const [range, setRange] = React.useState<IsoDateRange>({});
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<InterviewFilters>({ page: 1, pageSize: 20 });

  React.useEffect(() => {
    setFilters((prev) => ({ ...prev, from: range.from, to: range.to, page: 1 }));
  }, [range.from, range.to]);

  const { data, isLoading, error } = useInterviewsList(filters);
  const patch = (next: Partial<InterviewFilters>) => setFilters((prev) => ({ ...prev, ...next, page: 1 }));

  const columns = React.useMemo<ColumnDef<Interview, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <Link href={`/admin/interviews/${row.original.id}`} className="font-medium hover:underline">
              {row.original.title}
            </Link>
            {row.original.candidate ? (
              <p className="text-muted-foreground text-xs">
                {row.original.candidate.name} · {row.original.job?.title}
              </p>
            ) : null}
          </div>
        ),
      },
      { accessorKey: 'round', header: 'Round', cell: ({ row }) => ROUND_LABELS[row.original.round] },
      {
        accessorKey: 'scheduledAt',
        header: 'When',
        cell: ({ row }) => formatDate(row.original.scheduledAt, 'datetime'),
      },
      {
        id: 'interviewers',
        header: 'Interviewers',
        cell: ({ row }) => row.original.interviewers.map((person) => person.name).join(', ') || '—',
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge kind="interview" status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Schedule and track candidate interviews."
        actions={
          <Can permission="interviews:write">
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              Schedule interview
            </Button>
          </Can>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={filters.status}
          onChange={(status) => patch({ status })}
          placeholder="Status"
          options={INTERVIEW_STATUSES.map((status) => ({ label: STATUS_LABELS[status], value: status }))}
        />
        <FilterSelect
          value={filters.interviewerId}
          onChange={(interviewerId) => patch({ interviewerId })}
          placeholder="Interviewer"
          options={(interviewers ?? []).map((user) => ({ label: user.name, value: user.id }))}
        />
        <DateRangePicker value={range} onChange={setRange} />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={Boolean(filters.mine)} onCheckedChange={(checked) => patch({ mine: checked || undefined })} />
          Mine only
        </label>
        <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'list' | 'day')} className="ml-auto">
          <ToggleGroupItem value="list" aria-label="List view">
            <Rows3Icon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="day" aria-label="Group by day">
            <LayoutListIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === 'day' ? (
        <ByDayView interviews={data?.data ?? []} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          meta={data?.meta}
          loading={isLoading}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setFilters((prev) => ({ ...prev, pageSize, page: 1 }))}
          sort={filters.sort}
          onSortChange={(sort) => setFilters((prev) => ({ ...prev, sort }))}
          getRowId={(row) => row.id}
          hideColumnToggle
          onRowClick={(row) => router.push(`/admin/interviews/${row.id}`)}
          emptyTitle="No interviews found"
          emptyDescription="Try adjusting your filters."
        />
      )}

      {error ? <p className="text-destructive text-sm">{errorMessage(error)}</p> : null}

      <InterviewFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function AdminInterviewsPage() {
  return (
    <RequireAuth permission="interviews:read">
      <InterviewsContent />
    </RequireAuth>
  );
}
