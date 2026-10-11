'use client';

import { motion, useReducedMotion, type Variants } from 'motion/react';
import * as React from 'react';

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Seconds between children. Default 0.08. */
  stagger?: number;
  delay?: number;
  className?: string;
}

/**
 * Staggered reveal container. Wrap each child in `<StaggerItem>`.
 *
 * ```tsx
 * <Stagger className="grid gap-6 md:grid-cols-3">
 *   {services.map((s) => <StaggerItem key={s.slug}><ServiceCard {...s} /></StaggerItem>)}
 * </Stagger>
 * ```
 */
export function Stagger({ children, stagger = 0.08, delay = 0, className, ...props }: StaggerProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={containerVariants(stagger, delay)}
      className={className}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      variants={itemVariants}
      className={className}
      {...(props as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
