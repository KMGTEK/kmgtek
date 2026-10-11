'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import type { WebsiteSettings } from '@kmg/shared';

import { LogoLink } from '@/components/brand/logo';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { adminNav, filterNavByPermissions, isNavItemActive } from '@/config/nav';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { useAuth } from '@/lib/auth/auth-provider';

/** Collapsible admin sidebar — grouped navigation filtered by the user's permissions. */
export function AdminSidebar() {
  const pathname = usePathname() ?? '';
  const { hasPermission } = useAuth();

  const groups = React.useMemo(
    () => filterNavByPermissions(adminNav, (permission) => hasPermission(permission)),
    [hasPermission],
  );

  const { data: settings } = useQuery({
    queryKey: qk.publicSettings,
    queryFn: () => api.getData<WebsiteSettings>('/settings/public'),
    staleTime: 10 * 60_000,
  });

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center px-3">
        <LogoLink
          variant="wordmark"
          className="h-7 w-auto group-data-[collapsible=icon]:hidden"
          src={settings?.branding.logoUrl}
        />
        <Link href="/admin" className="hidden group-data-[collapsible=icon]:block" aria-label="Admin home">
          <DynamicIcon name="LayoutDashboard" className="text-brand-500 size-5" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href}>
                          <DynamicIcon name={item.icon ?? 'Circle'} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="View website">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon />
                <span>View website</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
