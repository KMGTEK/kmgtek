import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { Card } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number | string;
  /** lucide icon name (PascalCase or kebab-case). */
  icon?: string;
  /** Percentage change vs the previous period. Positive = green, negative = red. */
  delta?: number | null;
  deltaLabel?: string;
  /** Extra context under the value. */
  hint?: string;
  href?: string;
  /** `brand` tints the icon chip orange, `ember` red (urgent metrics). */
  tone?: 'brand' | 'ember' | 'neutral';
  className?: string;
  compact?: boolean;
}

/** KPI tile for admin/portal dashboards. */
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaLabel = 'vs last month',
  hint,
  href,
  tone = 'brand',
  className,
  compact = false,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  const content = (
    <Card
      className={cn(
        'group relative gap-0 overflow-hidden p-5 transition-shadow',
        href && 'hover:shadow-lift',
        compact && 'p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {icon ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg',
              tone === 'brand' && 'bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300',
              tone === 'ember' && 'bg-ember-50 text-ember-700 dark:bg-ember-500/12 dark:text-ember-300',
              tone === 'neutral' && 'bg-muted text-muted-foreground',
            )}
          >
            <DynamicIcon name={icon} className="size-4.5" />
          </span>
        ) : null}
      </div>
      <p className="font-display mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {(delta !== undefined && delta !== null) || hint ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && delta !== null ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium',
                positive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-ember-50 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300',
              )}
            >
              {positive ? (
                <TrendingUpIcon className="size-3" aria-hidden />
              ) : (
                <TrendingDownIcon className="size-3" aria-hidden />
              )}
              {positive ? '+' : ''}
              {delta}%
            </span>
          ) : null}
          <span className="text-muted-foreground">{hint ?? deltaLabel}</span>
        </div>
      ) : null}
    </Card>
  );

  return href ? (
    <Link href={href} className="focus-ring block rounded-xl">
      {content}
    </Link>
  ) : (
    content
  );
}
