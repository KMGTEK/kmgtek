'use client';

import { ArrowRightIcon, ChevronRightIcon, LogOutIcon, MenuIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import type { WebsiteSettings } from '@kmg/shared';

import { LogoLink } from '@/components/brand/logo';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { GlobalSearchTrigger } from '@/components/shared/global-search';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { marketingNav, isNavItemActive } from '@/config/nav';
import { siteConfig } from '@/config/site';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn } from '@/lib/utils';

export interface SiteHeaderProps {
  /** Company contact info shown in the utility bar — admin-editable via Website Settings. */
  company: Pick<WebsiteSettings['company'], 'tagline' | 'email'>;
  /** Admin-uploaded logo (Website Settings → Branding). Falls back to the built-in mark. */
  logoUrl?: string | null;
}

/**
 * Sticky glass navigation for the public site: services mega-menu, global search,
 * theme toggle, auth-aware account link and the primary CTA.
 */
export function SiteHeader({ company, logoUrl }: SiteHeaderProps) {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { isAuthenticated, isStaff, logout } = useAuth();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  // No generic "Sign in" entry point in the main nav — candidates land in the portal via
  // the account-creation email their job application sends them, not by browsing here.
  const accountHref = isStaff ? '/admin' : '/portal';
  const accountLabel = isStaff ? 'Admin' : 'My portal';

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        scrolled ? 'glass border-border/70 shadow-soft' : 'border-transparent bg-transparent',
      )}
    >
      {/* Utility bar */}
      <div className="bg-ink-950 text-ink-200 hidden md:block dark:bg-ink-900/60">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="truncate">{company.tagline}</p>
          <a href={`mailto:${company.email}`} className="hover:text-brand-300">
            {company.email}
          </a>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-4 lg:h-18">
        <LogoLink variant="wordmark" className="h-8 w-auto lg:h-9" src={logoUrl} />

        {/* Desktop nav */}
        <NavigationMenu className="hidden lg:flex" viewport={false}>
          <NavigationMenuList>
            {marketingNav.map((entry) =>
              entry.children?.length ? (
                <NavigationMenuItem key={entry.title}>
                  <NavigationMenuTrigger
                    className={cn(
                      'bg-transparent',
                      isNavItemActive(pathname, entry) && 'text-primary-text dark:text-brand-300',
                    )}
                  >
                    {entry.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[min(90vw,52rem)] p-2">
                      <div className="grid gap-1 md:grid-cols-2">
                        {entry.children.map((child) => (
                          <NavigationMenuLink asChild key={child.href}>
                            <Link
                              href={child.href}
                              className="hover:bg-accent group flex items-start gap-3 rounded-lg p-3 transition-colors"
                            >
                              <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-9 shrink-0 place-items-center rounded-lg">
                                <DynamicIcon name={child.icon ?? 'Sparkles'} className="size-4.5" />
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-1 text-sm font-medium">
                                  {child.title}
                                  <ChevronRightIcon className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-70" />
                                </span>
                                <span className="text-muted-foreground line-clamp-2 text-xs">
                                  {child.description}
                                </span>
                              </span>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between px-3 py-1.5">
                        <p className="text-muted-foreground text-xs">
                          Not sure where to start? We&apos;ll map it out with you.
                        </p>
                        <Button asChild size="sm" variant="soft">
                          <Link href={entry.href}>
                            All services <ArrowRightIcon className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={entry.title}>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <Link
                      href={entry.href}
                      className={cn(
                        'bg-transparent',
                        isNavItemActive(pathname, entry) && 'text-primary-text dark:text-brand-300',
                      )}
                    >
                      {entry.title}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-1.5">
          <GlobalSearchTrigger variant="icon" className="hidden sm:inline-flex lg:hidden" />
          <div className="hidden lg:block">
            <GlobalSearchTrigger className="w-44 xl:w-56" />
          </div>
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={accountHref}>
                  <UserIcon className="size-4" />
                  {accountLabel}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => void logout({ redirectTo: '/' })}
              >
                <LogOutIcon className="size-4" />
                Sign out
              </Button>
            </>
          ) : null}
          <Button asChild variant="gradient" size="sm" className="hidden md:inline-flex">
            <Link href={siteConfig.primaryCta.href}>{siteConfig.primaryCta.label}</Link>
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
              <SheetHeader className="border-b">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <LogoLink variant="wordmark" className="h-8 w-auto" src={logoUrl} />
              </SheetHeader>
              <ScrollArea className="h-[calc(100svh-8.5rem)]">
                <nav className="p-4">
                  <Accordion type="single" collapsible className="w-full">
                    {marketingNav.map((entry) =>
                      entry.children?.length ? (
                        <AccordionItem key={entry.title} value={entry.title}>
                          <AccordionTrigger className="py-3 text-base font-medium">
                            {entry.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid gap-0.5 pb-2">
                              <SheetClose asChild>
                                <Link
                                  href={entry.href}
                                  className="text-primary-text dark:text-brand-300 rounded-md px-2 py-2 text-sm font-medium"
                                >
                                  All {entry.title.toLowerCase()}
                                </Link>
                              </SheetClose>
                              {entry.children.map((child) => (
                                <SheetClose asChild key={child.href}>
                                  <Link
                                    href={child.href}
                                    className="hover:bg-accent flex items-center gap-2.5 rounded-md px-2 py-2 text-sm"
                                  >
                                    <DynamicIcon
                                      name={child.icon ?? 'Sparkles'}
                                      className="text-brand-600 dark:text-brand-400 size-4"
                                    />
                                    {child.title}
                                  </Link>
                                </SheetClose>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ) : (
                        <SheetClose asChild key={entry.title}>
                          <Link
                            href={entry.href}
                            className={cn(
                              'flex items-center justify-between border-b py-3.5 text-base font-medium',
                              isNavItemActive(pathname, entry) && 'text-primary-text dark:text-brand-300',
                            )}
                          >
                            {entry.title}
                            <ChevronRightIcon className="size-4 opacity-50" />
                          </Link>
                        </SheetClose>
                      ),
                    )}
                  </Accordion>

                  <div className="mt-6 space-y-3">
                    <Button asChild variant="gradient" className="w-full" size="lg">
                      <Link href={siteConfig.primaryCta.href}>{siteConfig.primaryCta.label}</Link>
                    </Button>
                    {isAuthenticated ? (
                      <>
                        <Button asChild variant="outline" className="w-full" size="lg">
                          <Link href={accountHref}>{accountLabel}</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          size="lg"
                          onClick={() => void logout({ redirectTo: '/' })}
                        >
                          <LogOutIcon className="size-4" />
                          Sign out
                        </Button>
                      </>
                    ) : null}
                  </div>

                  <div className="text-muted-foreground mt-6 text-sm">
                    <a href={`mailto:${company.email}`} className="block">
                      {company.email}
                    </a>
                  </div>
                </nav>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
