import { CircleCheckIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SuccessStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** Confirmation screen (application submitted, message sent, password reset…). */
export function SuccessState({ title, description, action, className, children }: SuccessStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-16 text-center', className)}>
      <div className="relative grid size-16 place-items-center">
        <span className="bg-brand-500/15 absolute inset-0 animate-ping rounded-full [animation-duration:2.4s]" />
        <span className="bg-brand-500/10 ring-brand-500/30 text-brand-700 dark:text-brand-300 relative grid size-16 place-items-center rounded-full ring-1">
          <CircleCheckIcon className="size-7" aria-hidden />
        </span>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-lg text-pretty">{description}</p>
        ) : null}
      </div>
      {children}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
