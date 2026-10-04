'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon, CheckCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import type { AppNotification, PaginationMeta } from '@kmg/shared';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { ListSkeleton } from '@/components/shared/loading-skeletons';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { cn, formatRelativeTime } from '@/lib/utils';

interface NotificationsResponse {
  data: AppNotification[];
  meta: PaginationMeta & { unread?: number };
}

const PAGE_SIZE = 20;

export function NotificationsClient() {
  const queryClient = useQueryClient();
  const params = { pageSize: PAGE_SIZE };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.notifications.list(params),
    queryFn: () => api.get<NotificationsResponse>('/notifications', { query: params }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: invalidate,
    onError: (err) => toast.error(errorMessage(err)),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const notifications = data?.data ?? [];
  const unread = data?.meta.unread ?? notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates on your applications, interviews and account."
        actions={
          unread > 0 ? (
            <Button variant="outline" size="sm" disabled={markAllMutation.isPending} onClick={() => markAllMutation.mutate()}>
              <CheckCheckIcon className="size-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<BellIcon className="size-5" />} title="You're all caught up" description="New notifications will show up here." />
      ) : (
        <ul className="divide-border divide-y rounded-xl border">
          {notifications.map((notification) => {
            const unreadItem = !notification.readAt;
            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 p-4 transition-colors',
                  notification.link && 'hover:bg-accent cursor-pointer',
                )}
                onClick={() => {
                  if (unreadItem) markReadMutation.mutate(notification.id);
                }}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    unreadItem ? 'bg-brand-500' : 'bg-transparent',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', unreadItem && 'font-semibold')}>{notification.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">{notification.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{formatRelativeTime(notification.createdAt)}</p>
                </div>
                {unreadItem ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      markReadMutation.mutate(notification.id);
                    }}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            );

            return (
              <li key={notification.id}>
                {notification.link ? <Link href={notification.link}>{content}</Link> : content}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
