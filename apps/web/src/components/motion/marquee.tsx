'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface MarqueeProps {
  children: React.ReactNode;
  /** Seconds for one full loop. Default 40. */
  speed?: number;
  reverse?: boolean;
  /** Pause the animation while hovered. Default true. */
  pauseOnHover?: boolean;
  /** Fade the left/right edges into the background. Default true. */
  fade?: boolean;
  className?: string;
}

/**
 * Infinite horizontal marquee (logo walls, tech strips). CSS-driven, so it is
 * automatically disabled by the global `prefers-reduced-motion` rule.
 */
export function Marquee({
  children,
  speed = 40,
  reverse = false,
  pauseOnHover = true,
  fade = true,
  className,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        'group relative flex w-full overflow-hidden',
        fade &&
          '[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]',
        className,
      )}
    >
      {[0, 1].map((index) => (
        <div
          key={index}
          aria-hidden={index === 1}
          className={cn(
            'flex shrink-0 items-center gap-10 pr-10',
            'animate-[marquee-x_var(--marquee-duration)_linear_infinite]',
            reverse && 'direction-reverse [animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
          style={{ ['--marquee-duration' as string]: `${speed}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
