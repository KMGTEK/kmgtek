'use client';

import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Any thrown value — the message is extracted with `errorMessage()`. */
  error?: unknown;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: 'card' | 'plain';
}

/** Standard failure state for a failed query or a partially broken page. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  error,
  actionLabel = 'Try again',
  onAction,
  className,
  variant = 'card',
}: ErrorStateProps) {
  const message = description ?? (error ? errorMessage(error) : 'Please try again in a moment.');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        variant === 'card' && 'border-destructive/25 bg-destructive/5 rounded-xl border',
        className,
      )}
      role="alert"
    >
      <div className="bg-background text-destructive ring-destructive/25 grid size-12 place-items-center rounded-full ring-1">
        <CircleAlertIcon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm text-pretty">{message}</p>
      </div>
      {onAction ? (
        <Button variant="outline" onClick={onAction} className="mt-2">
          <RefreshCwIcon className="size-4" aria-hidden />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
