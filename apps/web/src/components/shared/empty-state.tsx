import * as React from 'react';
import { InboxIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Any React node — usually a lucide icon element. */
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** `card` adds a dashed border box; `plain` is bare. */
  variant?: 'card' | 'plain';
}

/** Standard "nothing here yet" state for lists, tables and dashboards. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  variant = 'card',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        variant === 'card' && 'border-border/70 bg-muted/30 rounded-xl border border-dashed',
        className,
      )}
    >
      <div className="bg-background text-muted-foreground ring-border grid size-12 place-items-center rounded-full ring-1">
        {icon ?? <InboxIcon className="size-5" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-md text-sm text-pretty">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Convenience wrapper with a single primary button. */
export function EmptyStateWithAction({
  actionLabel,
  onAction,
  ...props
}: EmptyStateProps & { actionLabel: string; onAction: () => void }) {
  return <EmptyState {...props} action={<Button onClick={onAction}>{actionLabel}</Button>} />;
}
