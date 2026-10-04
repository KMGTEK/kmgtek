import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `page` = 1280px (default), `prose` = 768px, `wide` = 1536px. */
  size?: 'page' | 'prose' | 'wide';
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'article';
}

/** Horizontal page container with the standard responsive gutters. */
export function Container({ size = 'page', as = 'div', className, ...props }: ContainerProps) {
  const Component = as;
  return (
    <Component
      className={cn(
        size === 'page' && 'container-page',
        size === 'prose' && 'container-prose',
        size === 'wide' && 'container-wide',
        className,
      )}
      {...props}
    />
  );
}
