'use client';

import Image from 'next/image';
import * as React from 'react';

import { cn, initials } from '@/lib/utils';

export interface TechLogoProps {
  /** simpleicons.org slug (e.g. `kubernetes`) or a full logo URL. */
  slug?: string | null;
  name: string;
  size?: number;
  /** Tint the icon with the brand colour instead of the vendor colour. */
  monochrome?: boolean;
  className?: string;
}

/**
 * Technology logo from `cdn.simpleicons.org`, with an initials fallback when the
 * slug is unknown or the CDN is unreachable.
 */
export function TechLogo({ slug, name, size = 32, monochrome = false, className }: TechLogoProps) {
  const [failed, setFailed] = React.useState(false);
  const src = !slug
    ? null
    : slug.startsWith('http')
      ? slug
      : `https://cdn.simpleicons.org/${slug}${monochrome ? '/F39C2C' : ''}`;

  if (!src || failed) {
    return (
      <span
        aria-label={name}
        title={name}
        className={cn(
          'bg-muted text-muted-foreground grid place-items-center rounded-md text-[10px] font-semibold',
          className,
        )}
        style={{ width: size, height: size }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className={cn('object-contain', className)}
    />
  );
}
