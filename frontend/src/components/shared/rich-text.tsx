import * as React from 'react';

import { cn } from '@/lib/utils';

export interface RichTextProps {
  /** HTML sanitized by the API (see API_CONTRACT — content is stored sanitized). */
  html: string | null | undefined;
  className?: string;
  size?: 'sm' | 'base' | 'lg';
}

/**
 * Styled container for server-sanitized rich text (blog posts, job descriptions,
 * case studies, legal pages).
 */
export function RichText({ html, className, size = 'base' }: RichTextProps) {
  if (!html) return null;
  return (
    <div
      className={cn(
        'prose dark:prose-invert max-w-none',
        size === 'sm' && 'prose-sm',
        size === 'lg' && 'prose-lg',
        'prose-headings:font-display prose-headings:tracking-tight',
        'prose-a:font-medium prose-a:underline-offset-4 hover:prose-a:text-brand-600',
        'prose-img:rounded-xl prose-img:border',
        'prose-blockquote:border-l-brand-500 prose-blockquote:not-italic',
        'prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5',
        'prose-pre:rounded-xl prose-pre:border prose-pre:bg-ink-950',
        'prose-hr:border-border',
        className,
      )}
      // API-sanitized HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
