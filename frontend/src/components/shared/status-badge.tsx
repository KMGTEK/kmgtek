import * as React from 'react';

import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type InterviewDecision,
  type InterviewStatus,
  type JobStatus,
  type LeadStatus,
} from '@kmg/shared';

import { cn } from '@/lib/utils';

/** Semantic tones. Orange = in progress/highlight, red (ember) = failure/urgent. */
export type StatusTone = 'neutral' | 'info' | 'brand' | 'success' | 'warning' | 'danger' | 'muted';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-300/60 dark:bg-ink-900/60 dark:text-ink-200 dark:ring-ink-700',
  info: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  brand: 'bg-brand-50 text-brand-800 ring-brand-300/70 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  danger: 'bg-ember-50 text-ember-700 ring-ember-200 dark:bg-ember-500/10 dark:text-ember-300 dark:ring-ember-500/30',
  muted: 'bg-muted text-muted-foreground ring-border',
};

type StatusEntry = { label: string; tone: StatusTone };

const APPLICATION: Record<ApplicationStatus, StatusTone> = {
  APPLIED: 'info',
  UNDER_REVIEW: 'brand',
  TECHNICAL_ROUND: 'brand',
  HR_ROUND: 'brand',
  OFFER: 'success',
  JOINED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'muted',
};

const JOB: Record<JobStatus, StatusEntry> = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'danger' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

const LEAD: Record<LeadStatus, StatusEntry> = {
  NEW: { label: 'New', tone: 'brand' },
  CONTACTED: { label: 'Contacted', tone: 'info' },
  QUALIFIED: { label: 'Qualified', tone: 'info' },
  PROPOSAL: { label: 'Proposal', tone: 'warning' },
  WON: { label: 'Won', tone: 'success' },
  LOST: { label: 'Lost', tone: 'danger' },
};

const INTERVIEW: Record<InterviewStatus, StatusEntry> = {
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
  NO_SHOW: { label: 'No show', tone: 'danger' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'warning' },
};

const DECISION: Record<InterviewDecision, StatusEntry> = {
  STRONG_HIRE: { label: 'Strong hire', tone: 'success' },
  HIRE: { label: 'Hire', tone: 'success' },
  ON_HOLD: { label: 'On hold', tone: 'warning' },
  NO_HIRE: { label: 'No hire', tone: 'danger' },
  STRONG_NO_HIRE: { label: 'Strong no hire', tone: 'danger' },
};

export type StatusKind = 'application' | 'job' | 'lead' | 'interview' | 'decision';

type StatusValue =
  | ApplicationStatus
  | JobStatus
  | LeadStatus
  | InterviewStatus
  | InterviewDecision;

/** Resolve a status to `{ label, tone }` — exported for charts, filters and tests. */
export function resolveStatus(kind: StatusKind, status: string): StatusEntry {
  switch (kind) {
    case 'application':
      return {
        label: APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status,
        tone: APPLICATION[status as ApplicationStatus] ?? 'neutral',
      };
    case 'job':
      return JOB[status as JobStatus] ?? { label: status, tone: 'neutral' };
    case 'lead':
      return LEAD[status as LeadStatus] ?? { label: status, tone: 'neutral' };
    case 'interview':
      return INTERVIEW[status as InterviewStatus] ?? { label: status, tone: 'neutral' };
    case 'decision':
      return DECISION[status as InterviewDecision] ?? { label: status, tone: 'neutral' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind: StatusKind;
  status: StatusValue | string;
  /** Show a leading dot. Default true. */
  dot?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Colour-coded status pill shared by the admin, portal and public surfaces.
 *
 * ```tsx
 * <StatusBadge kind="application" status={application.status} />
 * ```
 */
export function StatusBadge({
  kind,
  status,
  dot = true,
  size = 'md',
  className,
  ...props
}: StatusBadgeProps) {
  const { label, tone } = resolveStatus(kind, String(status));
  return (
    <span
      data-status={status}
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden /> : null}
      {label}
    </span>
  );
}
