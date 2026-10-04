'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import type { Paginated } from '@kmg/shared';

import { ConfirmDialog, DynamicIcon, EmptyState, ErrorState, PageHeader, TableSkeleton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api/client';
import { Can, RequireAuth } from '@/lib/auth';
import { revalidatePublicSite } from '@/lib/revalidate';

import type { AdminService } from './_components/service-form';

export default function ServicesPage() {
  return (
    <RequireAuth permission="content:read">
      <ServicesContent />
    </RequireAuth>
  );
}

function ServicesContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'services', { all: true }],
    queryFn: () =>
      api.getList<AdminService>('/admin/services', { query: { pageSize: 100, sort: 'order:asc' } }) as Promise<
        Paginated<AdminService>
      >,
  });

  const services = React.useMemo(() => [...(data?.data ?? [])].sort((a, b) => a.order - b.order), [data]);

  async function reorder(nextIds: string[]) {
    try {
      await api.patch('/admin/services/reorder', { ids: nextIds });
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      revalidatePublicSite('services');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const ids = services.map((service) => service.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/services/${id}`);
      toast.success('Service deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      revalidatePublicSite('services');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage the service catalog shown on the public site. Reorder with the arrows."
        actions={
          <Can permission="content:write">
            <Button asChild>
              <Link href="/admin/services/new">
                <PlusIcon className="size-4" /> New service
              </Link>
            </Button>
          </Can>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={5} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : services.length === 0 ? (
        <EmptyState title="No services yet" description="Create your first service to populate the catalog." />
      ) : (
        <div className="divide-border divide-y rounded-xl border">
          {services.map((service, index) => (
            <div key={service.id} className="flex items-center gap-4 p-4">
              <div className="bg-muted grid size-10 shrink-0 place-items-center rounded-lg">
                <DynamicIcon name={service.icon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{service.title}</p>
                <p className="text-muted-foreground truncate text-sm">{service.shortDescription}</p>
              </div>
              <Badge variant={service.published === false ? 'outline' : 'default'}>
                {service.published === false ? 'Draft' : 'Published'}
              </Badge>
              <Can permission="content:write">
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === services.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit service" asChild>
                    <Link href={`/admin/services/${service.id}`}>
                      <PencilIcon className="size-4" />
                    </Link>
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Delete service">
                        <Trash2Icon className="size-4" />
                      </Button>
                    }
                    title={`Delete "${service.title}"?`}
                    description="This removes the service from the public site."
                    variant="destructive"
                    onConfirm={() => handleDelete(service.id)}
                  />
                </div>
              </Can>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
