'use client';

import { useQuery } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CONTENT_BLOCK_META, type ContentBlockKey } from '@kmg/shared';

import { EmptyState, ErrorState, PageHeader, TableSkeleton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

import { fetchContentBlockList } from './_lib';

const GROUP_ORDER = ['Home page', 'About page', 'Careers page', 'Services page', 'Contact page', 'Site-wide'] as const;

export default function ContentBlocksPage() {
  return (
    <RequireAuth permission="content:read">
      <ContentBlocksContent />
    </RequireAuth>
  );
}

function ContentBlocksContent() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.contentBlocks.list,
    queryFn: fetchContentBlockList,
  });

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, { key: ContentBlockKey; updatedAt: string | null }[]>();
    for (const record of data ?? []) {
      const group = CONTENT_BLOCK_META[record.key].group;
      const list = byGroup.get(group) ?? [];
      list.push({ key: record.key, updatedAt: record.updatedAt });
      byGroup.set(group, list);
    }
    return GROUP_ORDER.map((group) => ({ group, items: byGroup.get(group) ?? [] })).filter((g) => g.items.length > 0);
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Content"
        description="Marketing copy shown across the public site. Every block falls back to its built-in default until an admin customizes it here."
      />

      {isLoading ? (
        <TableSkeleton columns={3} />
      ) : error ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState title="No content blocks found" description="The content-blocks API did not return any records." />
      ) : (
        <div className="space-y-8">
          {groups.map(({ group, items }) => (
            <section key={group} className="space-y-3">
              <h2 className="font-display text-lg font-semibold tracking-tight">{group}</h2>
              <div className="divide-border divide-y rounded-xl border">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{CONTENT_BLOCK_META[item.key].label}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {item.updatedAt ? `Last updated ${formatDate(item.updatedAt, 'long')}` : 'Not customized — showing default'}
                      </p>
                    </div>
                    <Badge variant={item.updatedAt ? 'default' : 'outline'}>
                      {item.updatedAt ? 'Customized' : 'Default'}
                    </Badge>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${CONTENT_BLOCK_META[item.key].label}`} asChild>
                      <Link href={`/admin/content/${item.key}`}>
                        <PencilIcon className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
