import Link from 'next/link';
import * as React from 'react';

import { Container } from '@/components/layout/container';
import { Reveal } from '@/components/motion/reveal';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { Crumb } from '@/components/shared/page-header';
import { cn } from '@/lib/utils';

export interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** Buttons / CTA row. */
  actions?: React.ReactNode;
  /** Rendered under the copy (badges, meta, search bar…). */
  children?: React.ReactNode;
  align?: 'left' | 'center';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  /** Right-hand visual (image, illustration, card). Hidden below `lg`. */
  media?: React.ReactNode;
}

/**
 * Reusable inner-page hero: gradient + grid background, breadcrumb, title and actions.
 * The home page uses its own bespoke hero.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  align = 'left',
  size = 'default',
  className,
  media,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'bg-hero-glow relative isolate overflow-hidden border-b',
        size === 'sm' && 'pt-10 pb-10 md:pt-14 md:pb-12',
        size === 'default' && 'pt-12 pb-14 md:pt-20 md:pb-20',
        size === 'lg' && 'pt-16 pb-20 md:pt-28 md:pb-28',
        className,
      )}
    >
      <div aria-hidden className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 -z-10" />

      <Container>
        <div
          className={cn(
            'grid items-center gap-10',
            media ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]' : '',
          )}
        >
          <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
            {breadcrumbs?.length ? (
              <Breadcrumb className="mb-5">
                <BreadcrumbList className={cn(align === 'center' && 'justify-center')}>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.label}-${index}`}>
                      <BreadcrumbItem>
                        {crumb.href && index < breadcrumbs.length - 1 ? (
                          <BreadcrumbLink asChild>
                            <Link href={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}

            <Reveal>
              {eyebrow ? (
                <p className="text-primary-text dark:text-brand-300 mb-3 text-xs font-semibold tracking-[0.16em] uppercase">
                  {eyebrow}
                </p>
              ) : null}
              <h1
                className={cn(
                  'font-display font-semibold tracking-tight text-balance',
                  size === 'lg' ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-3xl sm:text-4xl lg:text-5xl',
                )}
              >
                {title}
              </h1>
              {description ? (
                <p
                  className={cn(
                    'text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed text-pretty',
                    align === 'center' && 'mx-auto',
                  )}
                >
                  {description}
                </p>
              ) : null}
            </Reveal>

            {actions ? (
              <Reveal delay={0.08}>
                <div className={cn('mt-7 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
                  {actions}
                </div>
              </Reveal>
            ) : null}

            {children ? <div className="mt-8">{children}</div> : null}
          </div>

          {media ? <div className="hidden lg:block">{media}</div> : null}
        </div>
      </Container>
    </section>
  );
}
