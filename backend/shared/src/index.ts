export * from './company';
export * from './constants';
export * from './types';
export * from './schemas';
export * from './content';

/** Convert a string into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Estimated reading time for HTML/markdown content. */
export function readingTime(content: string, wpm = 220): number {
  const words = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}
