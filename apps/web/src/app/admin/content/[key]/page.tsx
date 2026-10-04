'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { CONTENT_BLOCK_KEYS, CONTENT_BLOCK_META, type ContentBlockKey } from '@kmg/shared';

import { DetailSkeleton, ErrorState, PageHeader } from '@/components/shared';
import { qk } from '@/lib/api/query-keys';
import { RequireAuth } from '@/lib/auth';

import { ContentBlockForm } from '../_components/content-block-form';
import { fetchContentBlockDetail } from '../_lib';

export default function EditContentBlockPage() {
  const params = useParams<{ key: string }>();
  const isValidKey = (CONTENT_BLOCK_KEYS as string[]).includes(params.key);
  const blockKey = params.key as ContentBlockKey;

  return (
    <RequireAuth permission="content:read">
      {isValidKey ? <ContentBlockEditor blockKey={blockKey} /> : <ErrorState title="Unknown content block" description={`"${params.key}" is not a recognized content block key.`} />}
    </RequireAuth>
  );
}

function ContentBlockEditor({ blockKey }: { blockKey: ContentBlockKey }) {
  const meta = CONTENT_BLOCK_META[blockKey];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.contentBlocks.detail(blockKey),
    queryFn: () => fetchContentBlockDetail(blockKey),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={meta.label}
        eyebrow={meta.group}
        description="Editing this block updates the public site immediately after you save."
        breadcrumbs={[{ label: 'Page Content', href: '/admin/content' }, { label: meta.label }]}
      />
      {isLoading ? (
        <DetailSkeleton />
      ) : error || !data ? (
        <ErrorState error={error} onAction={() => refetch()} />
      ) : (
        <ContentBlockForm blockKey={blockKey} record={data} />
      )}
    </div>
  );
}
