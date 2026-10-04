import { CheckIcon } from 'lucide-react';

import {
  APPLICATION_PIPELINE,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type StatusHistoryEntry,
} from '@kmg/shared';

import { cn } from '@/lib/utils';

/**
 * Visual Applied → Under Review → Technical Round → HR Round → Offer → Joined pipeline.
 * `REJECTED`/`WITHDRAWN` are terminal states off the happy path — they're rendered as a
 * separate banner by the caller, not squeezed into one of these steps.
 */
export function PipelineTimeline({
  status,
  history,
}: {
  status: ApplicationStatus;
  history: StatusHistoryEntry[];
}) {
  const isTerminalOffPath = status === 'REJECTED' || status === 'WITHDRAWN';

  // Highest pipeline step ever reached, from history (falls back to APPLIED).
  const reachedIndex = history.reduce((max, entry) => {
    const index = APPLICATION_PIPELINE.indexOf(entry.toStatus);
    return index > max ? index : max;
  }, 0);

  const currentIndex = isTerminalOffPath ? reachedIndex : APPLICATION_PIPELINE.indexOf(status);

  return (
    <ol className="grid gap-0 sm:grid-cols-6">
      {APPLICATION_PIPELINE.map((step, index) => {
        const completed = isTerminalOffPath ? index <= currentIndex : index < currentIndex;
        const active = !isTerminalOffPath && index === currentIndex;
        return (
          <li key={step} className="relative flex flex-col items-center pb-6 text-center sm:pb-0">
            {index < APPLICATION_PIPELINE.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-4 left-1/2 hidden h-0.5 w-full -translate-y-1/2 sm:block',
                  completed ? 'bg-brand-500' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ring-4 ring-background',
                completed
                  ? 'bg-brand-500 text-white'
                  : active
                    ? 'border-brand-500 text-brand-700 dark:text-brand-300 border-2 bg-background'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {completed ? <CheckIcon className="size-4" /> : index + 1}
            </span>
            <p
              className={cn(
                'mt-2 max-w-[7rem] text-xs font-medium',
                completed || active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {APPLICATION_STATUS_LABELS[step]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
