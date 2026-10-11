'use client';

import { LayoutDashboardIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ROLE_LABELS } from '@kmg/shared';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn, initials } from '@/lib/utils';

/** Avatar + account dropdown used by the admin topbar and the portal topbar. */
export function UserMenu({
  variant = 'admin',
  className,
}: {
  variant?: 'admin' | 'portal';
  className?: string;
}) {
  const { user, logout, isStaff } = useAuth();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  const roleLabel = user.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('focus-ring flex items-center gap-2 rounded-full', className)}
          aria-label="Account menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
          {roleLabel ? (
            <span className="text-primary-text dark:text-brand-300 mt-1 text-[11px] font-medium">
              {roleLabel}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {variant === 'admin' ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboardIcon className="size-4" /> Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <SettingsIcon className="size-4" /> Website settings
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/portal/profile">
                <UserIcon className="size-4" /> My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/portal/settings">
                <SettingsIcon className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {isStaff && variant === 'portal' ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboardIcon className="size-4" /> Admin portal
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
          <LogOutIcon className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
