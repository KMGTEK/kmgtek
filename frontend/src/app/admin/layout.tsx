'use client';

import * as React from 'react';

import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { UserMenu } from '@/components/layout/user-menu';
import { GlobalSearchTrigger } from '@/components/shared/global-search';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { RequireStaff } from '@/lib/auth/guards';

/**
 * Admin shell: collapsible sidebar + sticky topbar.
 * Access requires a staff role; per-page permissions are enforced with
 * `<RequireAuth permission="…">` or `<Can permission="…">` inside each page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireStaff>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <div className="hidden flex-1 md:block">
              <GlobalSearchTrigger className="max-w-xs" />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <GlobalSearchTrigger variant="icon" className="md:hidden" />
              <NotificationsBell basePath="/admin" />
              <ThemeToggle />
              <UserMenu variant="admin" className="ml-1" />
            </div>
          </header>
          <main id="main-content" className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireStaff>
  );
}
