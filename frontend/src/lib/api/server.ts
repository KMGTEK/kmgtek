import 'server-only';

import type { ApiResponse, Paginated } from '@kmg/shared';

import { serverEnv } from '@/lib/env';

/**
 * Server-side API access (RSC, route handlers, metadata).
 *
 * The site MUST render when the API is down, so every helper resolves to `null`
 * instead of throwing. Callers fall back to static content from `@kmg/shared`.
 */

export interface ServerFetchOptions {
  /** ISR window in seconds. `0` disables caching (`no-store`). Default: 300. */
  revalidate?: number | false;
  /** Cache tags for `revalidateTag()`. */
  tags?: string[];
  query?: Record<string, unknown>;
  /** Abort after N ms so a hanging API never blocks a page render. Default 3000. */
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: unknown;
}

function buildUrl(path: string, query?: Record<string, unknown>) {
  const { apiInternalUrl } = serverEnv();
  const url = new URL(`${apiInternalUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  }
  return url.toString();
}

/**
 * Fetch JSON from the API. Returns `null` on any failure (network, timeout, non-2xx)
 * and logs a single warning in development.
 */
export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  const { revalidate = 300, tags, query, timeoutMs = 3000, headers, method = 'GET', body } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...(revalidate === 0 || revalidate === false
        ? { cache: 'no-store' as const }
        : { next: { revalidate, ...(tags ? { tags } : {}) } }),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[serverFetch] ${path} unavailable:`, (error as Error).message);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** `{ data }` envelope → `T | null`. */
export async function fetchData<T>(path: string, options?: ServerFetchOptions): Promise<T | null> {
  const response = await serverFetch<ApiResponse<T>>(path, options);
  return response?.data ?? null;
}

/** `{ data, meta }` envelope → `Paginated<T> | null`. */
export async function fetchList<T>(
  path: string,
  options?: ServerFetchOptions,
): Promise<Paginated<T> | null> {
  const response = await serverFetch<Paginated<T>>(path, options);
  return response?.data ? response : null;
}

/** An empty paginated result — the standard fallback when the API is unreachable. */
export function emptyPage<T>(pageSize = 12): Paginated<T> {
  return { data: [], meta: { page: 1, pageSize, total: 0, totalPages: 0 } };
}

/** Shared cache tags so the API (or an admin action) can invalidate selectively. */
export const CACHE_TAGS = {
  settings: 'settings',
  services: 'services',
  technologies: 'technologies',
  caseStudies: 'case-studies',
  testimonials: 'testimonials',
  team: 'team',
  jobs: 'jobs',
  sitemap: 'sitemap',
  contentBlocks: 'content-blocks',
} as const;
