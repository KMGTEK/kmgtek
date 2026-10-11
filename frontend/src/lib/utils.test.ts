import { describe, expect, it } from 'vitest';

import { cn, formatBytes, formatCurrency, initials, truncate } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', undefined, false, 'font-medium')).toBe('text-sm font-medium');
  });
});

describe('truncate', () => {
  it('leaves short strings untouched', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with an ellipsis', () => {
    expect(truncate('a'.repeat(20), 5)).toBe('aaaaa…');
  });

  it('returns an empty string for nullish input', () => {
    expect(truncate(null)).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats a plain amount', () => {
    expect(formatCurrency(1200)).toBe('$1,200');
  });

  it('compacts large amounts', () => {
    expect(formatCurrency(150_000)).toMatch(/^\$150K$/);
  });

  it('returns an em dash for nullish input', () => {
    expect(formatCurrency(null)).toBe('—');
  });
});

describe('formatBytes', () => {
  it('formats bytes into human-readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1_048_576)).toBe('1 MB');
  });
});

describe('initials', () => {
  it('builds initials from a full name', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
  });

  it('falls back to a placeholder', () => {
    expect(initials(null)).toBe('?');
  });
});
