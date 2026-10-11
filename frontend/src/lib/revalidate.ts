import type { CACHE_TAGS } from '@/lib/api/server';

type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Every public page is cached with a time-based `revalidate` window (see the `tags`/
 * `revalidate` options on each fetcher in `lib/api/public.ts`) — from 1 minute up to 10.
 * Without this, "Save" in an admin form succeeds but the public site (and "View website")
 * can keep showing the old content until that window elapses, which reads as "my change
 * didn't save" even though it did.
 *
 * Call this right after a successful admin mutation with the tag(s) that section's public
 * page(s) are fetched with, so the edit is live immediately instead of eventually.
 * Best-effort and fire-and-forget: a failure here never affects the save itself, only how
 * soon the change becomes visible.
 *
 * ```ts
 * await api.put('/admin/services/:id', values);
 * revalidatePublicSite('services');
 * ```
 */
export function revalidatePublicSite(...tags: CacheTag[]) {
  for (const tag of tags) {
    fetch(`/api/revalidate?tag=${encodeURIComponent(tag)}`, { method: 'POST' }).catch(() => undefined);
  }
}
