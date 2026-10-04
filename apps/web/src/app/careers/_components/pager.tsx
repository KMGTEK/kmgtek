import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';

import type { PaginationMeta } from '@kmg/shared';

import { buttonVariants } from '@/components/ui/button';
import { buildQueryString, cn } from '@/lib/utils';

/** Simple server-rendered pager for the careers listing (query-param driven). */
export function Pager({
  meta,
  basePath,
  currentQuery,
}: {
  meta: PaginationMeta;
  basePath: string;
  currentQuery: Record<string, unknown>;
}) {
  if (meta.totalPages <= 1) return null;
  const hrefFor = (page: number) => `${basePath}${buildQueryString({ ...currentQuery, page })}`;

  return (
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <Link
        href={hrefFor(meta.page - 1)}
        aria-disabled={meta.page <= 1}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          meta.page <= 1 && 'pointer-events-none opacity-50',
        )}
      >
        <ChevronLeftIcon className="size-4" /> Previous
      </Link>
      <p className="text-muted-foreground text-sm">
        Page <span className="text-foreground font-medium">{meta.page}</span> of{' '}
        <span className="text-foreground font-medium">{meta.totalPages}</span>
      </p>
      <Link
        href={hrefFor(meta.page + 1)}
        aria-disabled={meta.page >= meta.totalPages}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          meta.page >= meta.totalPages && 'pointer-events-none opacity-50',
        )}
      >
        Next <ChevronRightIcon className="size-4" />
      </Link>
    </nav>
  );
}
