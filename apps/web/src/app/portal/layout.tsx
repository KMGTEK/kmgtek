'use client';

import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { LogoLink } from '@/components/brand/logo';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { UserMenu } from '@/components/layout/user-menu';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { portalNav, isNavItemActive } from '@/config/nav';
import { RequireCandidate } from '@/lib/auth/guards';
import { cn } from '@/lib/utils';

/**
 * Candidate portal shell: left rail on desktop, bottom tab bar on mobile.
 * Requires a signed-in user (the `proxy.ts` middleware redirects anonymous visitors).
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <RequireCandidate>
      <div className="bg-muted/30 flex min-h-svh flex-col">
        <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
          <div className="container-wide flex h-16 items-center gap-3">
            <LogoLink variant="wordmark" className="h-7 w-auto" />
            <span className="bg-brand-50 text-brand-800 dark:bg-brand-500/12 dark:text-brand-300 hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline-block">
              Candidate portal
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/careers">
                  <SearchIcon className="size-4" />
                  Browse jobs
                </Link>
              </Button>
              <NotificationsBell basePath="/portal" />
              <ThemeToggle />
              <UserMenu variant="portal" className="ml-1" />
            </div>
          </div>
        </header>

        <div className="container-wide flex w-full flex-1 gap-8 py-6 lg:py-8">
          {/* Desktop rail */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1">
              {portalNav.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/12 dark:text-brand-200'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <DynamicIcon name={item.icon ?? 'Circle'} className="size-4" />
                    {item.title}
                  </Link>
                );
              })}
              <div className="pt-4">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 text-sm"
                >
                  <ArrowLeftIcon className="size-4" /> Back to website
                </Link>
              </div>
            </nav>
          </aside>

          <main id="main-content" className="min-w-0 flex-1 pb-20 lg:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile tab bar */}
        <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden">
          <ul className="grid grid-cols-5">
            {portalNav.slice(0, 5).map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 text-[11px]',
                      active ? 'text-primary-text dark:text-brand-300' : 'text-muted-foreground',
                    )}
                  >
                    <DynamicIcon name={item.icon ?? 'Circle'} className="size-5" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </RequireCandidate>
  );
}
