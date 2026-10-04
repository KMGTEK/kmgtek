import type { Paginated, PaginationMeta } from '@kmg/shared';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

// Deliberately no index signature: it would force every zod-inferred query type passed to
// `parsePagination` to also declare one (TS requires a matching index signature to assign an
// interface into a parameter type that declares one). Any object with compatible
// `page`/`pageSize` fields structurally satisfies this.
export interface PaginationQuery {
  page?: number | string;
  pageSize?: number | string;
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

const toInt = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Turn `?page=2&pageSize=25` into Prisma's `skip`/`take`.
 *
 * ```ts
 * const { skip, take, page, pageSize } = parsePagination(query);
 * const [rows, total] = await this.prisma.$transaction([
 *   this.prisma.job.findMany({ where, skip, take, orderBy }),
 *   this.prisma.job.count({ where }),
 * ]);
 * return paginate(rows, total, { page, pageSize });
 * ```
 */
export function parsePagination(
  query: PaginationQuery = {},
  defaultPageSize = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const page = Math.max(1, toInt(query.page, 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(query.pageSize, defaultPageSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

/** Build the `{ data, meta }` list envelope. */
export function paginate<T>(
  data: T[],
  total: number,
  params: { page: number; pageSize: number },
): Paginated<T> {
  return { data, meta: buildMeta(total, params.page, params.pageSize) };
}

/**
 * Parse `?sort=createdAt:desc` into a Prisma `orderBy`, restricted to an allow-list
 * so callers cannot sort by arbitrary (or relational) columns.
 */
export function parseSort<T extends string>(
  sort: string | undefined,
  allowed: readonly T[],
  fallback: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' },
): Record<string, 'asc' | 'desc'> {
  if (!sort) return fallback;
  const [field, direction] = sort.split(':');
  if (!allowed.includes(field as T)) return fallback;
  return { [field]: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc' };
}
