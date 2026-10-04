import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

import { CACHE_TAGS } from '@/lib/api/server';

const VALID_TAGS = new Set<string>(Object.values(CACHE_TAGS));

/**
 * On-demand ISR revalidation, called by admin forms right after a successful save so a
 * content edit shows up on the public site immediately instead of waiting out the page's
 * time-based `revalidate` window (up to 5 minutes for content blocks). Same-origin only by
 * convention (called via a relative `fetch` from admin pages); the only effect of hitting
 * this endpoint is a cache bust, so no auth is required — accepts a whitelisted tag,
 * nothing else, and can't read or write any data.
 *
 * ```ts
 * await fetch('/api/revalidate?tag=content-blocks', { method: 'POST' });
 * ```
 */
export async function POST(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag');
  if (!tag || !VALID_TAGS.has(tag)) {
    return NextResponse.json({ error: 'Unknown or missing tag' }, { status: 400 });
  }
  // `{ expire: 0 }`, not the recommended `'max'` profile: an admin who just saved content
  // wants to see it live now, not "eventually with stale-while-revalidate".
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
