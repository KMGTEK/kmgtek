'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FloatingIcon {
  /** simpleicons.org slug, e.g. `kubernetes`. */
  slug: string;
  label: string;
  /** Percentage position inside the container. */
  x: number;
  y: number;
  /** Relative size, 1 = 56px. */
  scale?: number;
}

export const DEFAULT_FLOATING_ICONS: FloatingIcon[] = [
  { slug: 'kubernetes', label: 'Kubernetes', x: 6, y: 16 },
  { slug: 'snowflake', label: 'Snowflake', x: 78, y: 8, scale: 0.9 },
  { slug: 'docker', label: 'Docker', x: 86, y: 58 },
  { slug: 'databricks', label: 'Databricks', x: 14, y: 72, scale: 0.85 },
  { slug: 'tensorflow', label: 'TensorFlow', x: 45, y: 88, scale: 0.8 },
  { slug: 'anthropic', label: 'Anthropic', x: 62, y: 30, scale: 0.75 },
];

/**
 * Decorative floating tech logos for hero sections. Purely ornamental
 * (`aria-hidden`) and frozen when the visitor prefers reduced motion.
 */
export function FloatingIcons({
  icons = DEFAULT_FLOATING_ICONS,
  className,
}: {
  icons?: FloatingIcon[];
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {icons.map((icon, index) => {
        const size = Math.round(56 * (icon.scale ?? 1));
        return (
          <motion.div
            key={icon.slug}
            className="glass-card absolute grid place-items-center rounded-2xl shadow-soft"
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              width: size,
              height: size,
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={
              reduce
                ? { opacity: 0.85, scale: 1 }
                : { opacity: 0.9, scale: 1, y: [0, -10, 0] }
            }
            transition={
              reduce
                ? { duration: 0.3 }
                : {
                    opacity: { duration: 0.6, delay: index * 0.1 },
                    scale: { duration: 0.6, delay: index * 0.1 },
                    y: { duration: 5 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 },
                  }
            }
          >
            <Image
              src={`https://cdn.simpleicons.org/${icon.slug}`}
              alt={icon.label}
              width={Math.round(size * 0.5)}
              height={Math.round(size * 0.5)}
              unoptimized
              className="opacity-80 dark:invert-[0.12]"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
