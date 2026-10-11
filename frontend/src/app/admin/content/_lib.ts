import {
  CONTENT_BLOCK_KEYS,
  CONTENT_BLOCK_SCHEMAS,
  DEFAULT_CONTENT_BLOCKS,
  type ContentBlockData,
  type ContentBlockKey,
} from '@kmg/shared';

import { api } from '@/lib/api/client';

/**
 * `/admin/content-blocks` — one record per key, holding the current (or default) data plus
 * customization metadata. `updatedAt: null` means the block has never been saved by an admin
 * and the public site is rendering `DEFAULT_CONTENT_BLOCKS[key]`.
 */
export interface ContentBlockRecord<K extends ContentBlockKey = ContentBlockKey> {
  key: K;
  data: ContentBlockData<K>;
  updatedAt: string | null;
  updatedBy?: { id: string; name: string } | null;
}

/**
 * The exact response shape isn't fixed yet on the API side, so this tolerates either an
 * array of records or a map keyed by content-block key, and normalizes to an array. Any
 * record that is missing or fails its schema falls back to the default so the admin list/
 * editor never breaks even if a block hasn't been customized (or the API disagrees on shape).
 */
function normalizeList(raw: unknown): ContentBlockRecord[] {
  const asArray: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.entries(raw as Record<string, unknown>).map(([key, value]) =>
          value && typeof value === 'object' && 'data' in (value as object)
            ? { key, ...(value as object) }
            : { key, data: value, updatedAt: null },
        )
      : [];

  const byKey = new Map<string, ContentBlockRecord>();
  for (const entry of asArray) {
    if (!entry || typeof entry !== 'object' || !('key' in entry)) continue;
    const key = (entry as { key: string }).key as ContentBlockKey;
    if (!CONTENT_BLOCK_KEYS.includes(key)) continue;
    const record = entry as { key: ContentBlockKey; data?: unknown; updatedAt?: string | null; updatedBy?: ContentBlockRecord['updatedBy'] };
    const parsed = CONTENT_BLOCK_SCHEMAS[key].safeParse(record.data);
    byKey.set(key, {
      key,
      data: (parsed.success ? parsed.data : DEFAULT_CONTENT_BLOCKS[key]) as ContentBlockData<typeof key>,
      updatedAt: record.updatedAt ?? null,
      updatedBy: record.updatedBy ?? null,
    });
  }

  // Always return all 13 keys, defaulting any the API omitted entirely.
  return CONTENT_BLOCK_KEYS.map(
    (key) => byKey.get(key) ?? { key, data: DEFAULT_CONTENT_BLOCKS[key], updatedAt: null, updatedBy: null },
  );
}

export async function fetchContentBlockList(): Promise<ContentBlockRecord[]> {
  const response = await api.get<{ data: unknown } | unknown>('/admin/content-blocks');
  const raw = response && typeof response === 'object' && 'data' in (response as object) ? (response as { data: unknown }).data : response;
  return normalizeList(raw);
}

export async function fetchContentBlockDetail<K extends ContentBlockKey>(key: K): Promise<ContentBlockRecord<K>> {
  const response = await api.get<{ data: unknown } | unknown>(`/admin/content-blocks/${key}`);
  const raw = response && typeof response === 'object' && 'data' in (response as object) ? (response as { data: unknown }).data : response;
  const record = raw as { data?: unknown; updatedAt?: string | null; updatedBy?: ContentBlockRecord['updatedBy'] } | null | undefined;
  const parsed = CONTENT_BLOCK_SCHEMAS[key].safeParse(record?.data ?? raw);
  return {
    key,
    data: (parsed.success ? parsed.data : DEFAULT_CONTENT_BLOCKS[key]) as ContentBlockData<K>,
    updatedAt: record?.updatedAt ?? null,
    updatedBy: record?.updatedBy ?? null,
  };
}
