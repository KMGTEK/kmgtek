import type { ApiResponse, Paginated, PaginationMeta } from '@kmg/shared';

/** Wrap a single resource in the `{ data }` envelope. */
export const ok = <T>(data: T): ApiResponse<T> => ({ data });

/** Wrap a list in the `{ data, meta }` envelope. */
export const paginated = <T>(data: T[], meta: PaginationMeta): Paginated<T> => ({ data, meta });
