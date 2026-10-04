'use client';

import { StarIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

/** Star rating — read-only display when `onChange` is omitted, interactive otherwise. */
export function RatingStars({ value, onChange, max = 5, size = 'md', disabled, className }: RatingStarsProps) {
  const [hover, setHover] = React.useState<number | null>(null);
  const interactive = Boolean(onChange) && !disabled;
  const display = hover ?? value;
  const sizeClass = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-6' : 'size-4.5';

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : undefined}>
      {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(null)}
          className={cn('text-muted-foreground/40', interactive && 'cursor-pointer')}
        >
          <StarIcon
            className={cn(sizeClass, star <= display && 'fill-amber-400 text-amber-400')}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
