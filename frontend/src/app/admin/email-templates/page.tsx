'use client';

import { useQuery } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { EmailTemplate } from '@kmg/shared';

import { DataTable, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

import type { ColumnDef } from '@tanstack/react-table';

export default function EmailTemplatesPage() {
  return (
    <RequireAuth permission="settings:read">
      <EmailTemplatesContent />
    </RequireAuth>
  );
}

function EmailTemplatesContent() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.emailTemplates,
    queryFn: () => api.getData<EmailTemplate[]>('/admin/email-templates'),
  });

  const columns = React.useMemo<ColumnDef<EmailTemplate, unknown>[]>(
    () => [
      { accessorKey: 'key', header: 'Key', cell: ({ row }) => <code className="font-mono text-xs">{row.original.key}</code> },
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => <span className="text-muted-foreground truncate">{row.original.subject}</span>,
      },
      { id: 'updatedAt', header: 'Last updated', cell: ({ row }) => formatDate(row.original.updatedAt, 'long') },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href={`/admin/email-templates/${row.original.id}`}>
                <PencilIcon className="size-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Email Templates" description="Transactional email templates sent by the platform." />
      {error ? <Button variant="outline" onClick={() => refetch()}>Retry</Button> : null}
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        getRowId={(row) => row.id}
        emptyTitle="No email templates found"
        hideColumnToggle
        onRowClick={(row) => router.push(`/admin/email-templates/${row.id}`)}
      />
    </div>
  );
}
