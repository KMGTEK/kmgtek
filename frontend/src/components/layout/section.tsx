import * as React from 'react';

import { Container, type ContainerProps } from '@/components/layout/container';
import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  /** Rendered on the right on desktop (e.g. a "View all" link). */
  action?: React.ReactNode;
  className?: string;
}

/** Section heading block — eyebrow + title + description. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
}: SectionHeaderProps) {
  if (!eyebrow && !title && !description) return null;
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl space-y-3', align === 'center' && 'mx-auto text-center')}>
        {eyebrow ? (
          <p className="text-primary-text dark:text-brand-300 text-xs font-semibold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="text-muted-foreground text-base leading-relaxed text-pretty sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>, SectionHeaderProps {
  /** Container width. */
  size?: ContainerProps['size'];
  /** Background treatment. */
  variant?: 'default' | 'muted' | 'grid' | 'gradient' | 'dark';
  /** Vertical padding. Default `default`. */
  spacing?: 'none' | 'sm' | 'default' | 'lg';
  /** Animate the header and content into view. Default true. */
  animate?: boolean;
  containerClassName?: string;
  children?: React.ReactNode;
}

/**
 * Marketing page section: background treatment + container + optional header.
 *
 * ```tsx
 * <Section eyebrow="What we do" title="Services" description="…" variant="muted">
 *   <ServiceGrid />
 * </Section>
 * ```
 */
export function Section({
  eyebrow,
  title,
  description,
  align,
  action,
  size = 'page',
  variant = 'default',
  spacing = 'default',
  animate = true,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  const header = <SectionHeader {...{ eyebrow, title, description, align, action }} />;

  return (
    <section
      className={cn(
        'relative',
        spacing === 'default' && 'section-y',
        spacing === 'sm' && 'py-12 md:py-16',
        spacing === 'lg' && 'py-20 md:py-28 xl:py-36',
        variant === 'muted' && 'bg-muted/40',
        variant === 'dark' && 'bg-ink-950 text-ink-50 dark:bg-ink-900/40',
        variant === 'gradient' && 'bg-hero-glow',
        className,
      )}
      {...props}
    >
      {variant === 'grid' ? (
        <div aria-hidden className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 -z-10" />
      ) : null}
      <Container size={size} className={cn('relative', containerClassName)}>
        {eyebrow || title || description ? (
          <div className="mb-10 md:mb-14">{animate ? <Reveal>{header}</Reveal> : header}</div>
        ) : null}
        {children}
      </Container>
    </section>
  );
}
