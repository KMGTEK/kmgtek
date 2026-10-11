'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { ROLES, ROLE_LABELS, type Paginated, type StaffUser } from '@kmg/shared';

import { ConfirmDialog, DataTable, PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { Can, RequireAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

import { RolePermissionsPanel } from './_components/role-permissions-panel';
import { StaffUserDialog } from './_components/staff-user-dialog';

import type { ColumnDef } from '@tanstack/react-table';

export default function UsersPage() {
  return (
    <RequireAuth permission="users:read">
      <UsersContent />
    </RequireAuth>
  );
}

function StatusBadgeForUser({ status }: { status: StaffUser['status'] }) {
  const tone = status === 'ACTIVE' ? 'default' : status === 'INVITED' ? 'secondary' : 'destructive';
  return <Badge variant={tone}>{status}</Badge>;
}

function StaffTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState('all');
  const [status, setStatus] = React.useState('all');

  const params = { page, pageSize: 20, search: search || undefined, role: role === 'all' ? undefined : role, status: status === 'all' ? undefined : status };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.users.list(params),
    queryFn: () => api.getList<StaffUser>('/admin/users', { query: params }) as Promise<Paginated<StaffUser>>,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.admin.users.all });

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User removed');
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const columns = React.useMemo<ColumnDef<StaffUser, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <Badge key={r} variant="outline">{ROLE_LABELS[r]}</Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadgeForUser status={row.original.status} />,
      },
      {
        id: 'lastLoginAt',
        header: 'Last login',
        cell: ({ row }) => formatDate(row.original.lastLoginAt, 'long'),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Can permission="users:write">
            <div className="flex justify-end gap-1">
              <StaffUserDialog user={row.original} onDone={invalidate} />
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Delete user">
                    <Trash2Icon className="size-4" />
                  </Button>
                }
                title={`Remove ${row.original.name}?`}
                description="They will immediately lose access to the admin portal."
                variant="destructive"
                onConfirm={() => handleDelete(row.original.id)}
              />
            </div>
          </Can>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can permission="users:write">
          <StaffUserDialog onDone={invalidate} />
        </Can>
      </div>
      {error ? <Button variant="outline" onClick={() => refetch()}>Retry</Button> : null}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search staff…"
        onPageChange={setPage}
        getRowId={(row) => row.id}
        emptyTitle="No staff users found"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {Object.values(ROLES).filter((r) => r !== 'CANDIDATE').map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INVITED">Invited</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}

function UsersContent() {
  const [tab, setTab] = React.useState<'staff' | 'roles'>('staff');
  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Manage staff accounts and role-based permissions." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'staff' | 'roles')}>
        <TabsList>
          <TabsTrigger value="staff">Staff users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'staff' ? <StaffTab /> : <RolePermissionsPanel />}
    </div>
  );
}
