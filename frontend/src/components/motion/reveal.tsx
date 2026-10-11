'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  /** Slide-in direction. Default `up`. */
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  /** Replay every time the element enters the viewport. Default: animate once. */
  repeat?: boolean;
  as?: 'div' | 'section' | 'li' | 'span' | 'article';
  className?: string;
}

/**
 * Scroll-triggered fade/slide reveal. Honours `prefers-reduced-motion`
 * (content renders instantly, no transform).
 *
 * ```tsx
 * <Reveal delay={0.1}><Card /></Reveal>
 * ```
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.55,
  repeat = false,
  as = 'div',
  className,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();
  const Component = motion[as] as typeof motion.div;
  const offset = OFFSET[direction];

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Component
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: !repeat, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Alias kept for readability in marketing code. */
export const FadeIn = Reveal;
