'use client';

import { DynamicIcon as LucideDynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** `"CloudUpload"` / `"cloud-upload"` → `"cloud-upload"`. */
export function toIconName(name: string | null | undefined): IconName | null {
  if (!name) return null;
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  return (iconNames as string[]).includes(kebab) ? (kebab as IconName) : null;
}

export interface DynamicIconProps extends Omit<React.ComponentProps<typeof LucideDynamicIcon>, 'name' | 'fallback'> {
  /** lucide icon name in PascalCase (as stored in the DB) or kebab-case. */
  name: string;
  /** Rendered when the name does not match a lucide icon. */
  fallback?: IconName;
}

/**
 * Render a lucide icon from a name coming from data (services, benefits, nav config).
 * Falls back to a neutral sparkle when the name is unknown.
 *
 * ```tsx
 * <DynamicIcon name={service.icon} className="size-5" />
 * ```
 */
export function DynamicIcon({ name, fallback = 'sparkles', className, ...props }: DynamicIconProps) {
  const resolved = toIconName(name) ?? fallback;
  return <LucideDynamicIcon name={resolved} className={cn('size-5', className)} {...props} />;
}
