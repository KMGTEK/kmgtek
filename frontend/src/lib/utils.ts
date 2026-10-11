import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, de-duplicating conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
  medium: { month: 'short', day: 'numeric' },
  datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
  time: { hour: 'numeric', minute: '2-digit' },
};

/**
 * Format an ISO date string for display. Always rendered in UTC so the server and the
 * client agree (avoids hydration mismatches).
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  format: keyof typeof DATE_FORMATS | Intl.DateTimeFormatOptions = 'short',
  locale = 'en-US',
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const options = typeof format === 'string' ? DATE_FORMATS[format] : format;
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(date);
}

/** "3 days ago" / "in 2 months" — relative to now. */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

/** Format a number as currency. Compact by default for large salary figures. */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {},
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: value >= 100_000 ? 'compact' : 'standard',
    ...options,
  }).format(value);
}

/** 12_400 → "12.4K" */
export function formatNumber(value: number | null | undefined, compact = false): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', compact ? { notation: 'compact', maximumFractionDigits: 1 } : {}).format(
    value,
  );
}

/** 1_048_576 → "1 MB" */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Build an absolute URL against NEXT_PUBLIC_SITE_URL. */
export function absoluteUrl(path = '/'): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Turn an admin-entered display phone number (e.g. "(908) 466-6679") into a `tel:` href.
 * Keeps a leading `+` if the admin already typed a country code; otherwise assumes US (+1).
 */
export function phoneToHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? digits : `+1${digits}`}`;
}

/** "Ada Lovelace" → "AL" */
export function initials(name?: string | null, max = 2): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, max)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function truncate(value: string | null | undefined, length = 140): string {
  if (!value) return '';
  return value.length <= length ? value : `${value.slice(0, length).trimEnd()}…`;
}

/** Strip HTML tags — useful for building meta descriptions from rich text. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turn a query object into a search string, dropping empty values. */
export function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Salary range for a job card, honouring `showSalary`. */
export function formatSalaryRange(job: {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: 'YEAR' | 'MONTH' | 'HOUR' | null;
  showSalary?: boolean;
}): string | null {
  if (job.showSalary === false) return null;
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (!salaryMin && !salaryMax) return null;
  const currency = salaryCurrency ?? 'USD';
  const suffix = salaryPeriod === 'HOUR' ? '/hr' : salaryPeriod === 'MONTH' ? '/mo' : '/yr';
  const min = salaryMin ? formatCurrency(salaryMin, currency) : null;
  const max = salaryMax ? formatCurrency(salaryMax, currency) : null;
  if (min && max) return `${min} – ${max}${suffix}`;
  return `${min ?? max}${suffix}`;
}

/** Wait — for optimistic UI and tests. */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
