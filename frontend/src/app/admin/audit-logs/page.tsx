'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import type { AuditLogEntry, Paginated } from '@kmg/shared';

import { DataTable, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

import type { ColumnDef } from '@tanstack/react-table';

export default function AuditLogsPage() {
  return (
    <RequireAuth permission="audit:read">
      <AuditLogsContent />
    </RequireAuth>
  );
}

function ChangesCell({ changes }: { changes: AuditLogEntry['changes'] }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <details className="max-w-sm">
      <summary className="cursor-pointer text-sm font-medium select-none">View changes</summary>
      <pre className="bg-muted/50 mt-2 max-h-48 overflow-auto rounded-md p-2 text-xs">
        {JSON.stringify(changes, null, 2)}
      </pre>
    </details>
  );
}

function AuditLogsContent() {
  const [page, setPage] = React.useState(1);
  const [actorId, setActorId] = React.useState('');
  const [entityType, setEntityType] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const params = {
    page,
    pageSize: 25,
    actorId: actorId || undefined,
    entityType: entityType || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.auditLogs(params),
    queryFn: () => api.getList<AuditLogEntry>('/admin/audit-logs', { query: params }) as Promise<Paginated<AuditLogEntry>>,
  });

  const columns = React.useMemo<ColumnDef<AuditLogEntry, unknown>[]>(
    () => [
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) =>
          row.original.actor ? (
            <div>
              <p className="text-sm font-medium">{row.original.actor.name}</p>
              <p className="text-muted-foreground text-xs">{row.original.actor.email}</p>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">System</span>
          ),
      },
      { accessorKey: 'action', header: 'Action', cell: ({ row }) => <code className="font-mono text-xs">{row.original.action}</code> },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.entityType}
            {row.original.entityId ? <span className="text-muted-foreground"> · {row.original.entityId.slice(0, 8)}</span> : null}
          </span>
        ),
      },
      { id: 'changes', header: 'Changes', enableSorting: false, cell: ({ row }) => <ChangesCell changes={row.original.changes} /> },
      { accessorKey: 'ip', header: 'IP', cell: ({ row }) => row.original.ip ?? '—' },
      { id: 'createdAt', header: 'Timestamp', cell: ({ row }) => formatDate(row.original.createdAt, 'long') },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Every mutating admin action, for compliance and troubleshooting." />
      {error ? <Button variant="outline" onClick={() => refetch()}>Retry</Button> : null}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        onPageChange={setPage}
        getRowId={(row) => row.id}
        emptyTitle="No audit log entries"
        hideColumnToggle
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="audit-actor" className="text-xs">Actor ID</Label>
              <Input id="audit-actor" value={actorId} onChange={(e) => { setActorId(e.target.value); setPage(1); }} className="h-8 w-[160px]" placeholder="user id" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-entity" className="text-xs">Entity type</Label>
              <Input id="audit-entity" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="h-8 w-[140px]" placeholder="Job, Post…" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-from" className="text-xs">From</Label>
              <Input id="audit-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-8 w-[140px]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-to" className="text-xs">To</Label>
              <Input id="audit-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-8 w-[140px]" />
            </div>
          </div>
        }
      />
    </div>
  );
}
