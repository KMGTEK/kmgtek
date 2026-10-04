'use client';

import { useQuery } from '@tanstack/react-query';
import { BellIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import type { AppNotification, Paginated } from '@kmg/shared';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn, formatRelativeTime } from '@/lib/utils';

/**
 * Notification bell with unread count. Degrades to an empty dropdown when the API is
 * unavailable (queries fail silently).
 */
export function NotificationsBell({ basePath = '/admin' }: { basePath?: '/admin' | '/portal' }) {
  const { isAuthenticated } = useAuth();

  const { data: unread } = useQuery({
    queryKey: qk.notifications.unreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    queryFn: () => api.getData<{ count: number }>('/notifications/unread-count'),
  });

  const { data: list } = useQuery({
    queryKey: qk.notifications.list({ pageSize: 6 }),
    enabled: isAuthenticated,
    queryFn: () => api.getList<AppNotification>('/notifications', { query: { pageSize: 6 } }),
  });

  const notifications: Paginated<AppNotification>['data'] = list?.data ?? [];
  const count = unread?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${count} unread)`}>
          <BellIcon className="size-4" />
          {count > 0 ? (
            <span className="bg-ember-500 absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-semibold text-white">
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {count > 0 ? <span className="text-muted-foreground text-xs">{count} unread</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">You&apos;re all caught up.</p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild className="flex-col items-start gap-0.5 py-2.5">
              <Link href={notification.link ?? `${basePath}`}>
                <span className={cn('text-sm', !notification.readAt && 'font-semibold')}>
                  {notification.title}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">{notification.body}</span>
                <span className="text-muted-foreground text-[11px]">
                  {formatRelativeTime(notification.createdAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={basePath === '/portal' ? '/portal/notifications' : '/admin'} className="justify-center text-sm">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
