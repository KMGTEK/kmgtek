'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import type { CaseStudy, Paginated } from '@kmg/shared';

import { ConfirmDialog, DataTable, PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api/client';
import { revalidatePublicSite } from '@/lib/revalidate';
import { Can, RequireAuth } from '@/lib/auth';

import type { ColumnDef } from '@tanstack/react-table';

export default function CaseStudiesPage() {
  return (
    <RequireAuth permission="content:read">
      <CaseStudiesContent />
    </RequireAuth>
  );
}

function CaseStudiesContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<string | undefined>('createdAt:desc');
  const [industry, setIndustry] = React.useState('all');
  const [featured, setFeatured] = React.useState('all');
  const [published, setPublished] = React.useState('all');

  const params = {
    page,
    pageSize: 20,
    search: search || undefined,
    sort,
    industry: industry === 'all' ? undefined : industry,
    featured: featured === 'all' ? undefined : featured === 'true',
    published: published === 'all' ? undefined : published === 'true',
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'case-studies', params],
    queryFn: () => api.getList<CaseStudy>('/admin/case-studies', { query: params }) as Promise<Paginated<CaseStudy>>,
  });

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/case-studies/${id}`);
      toast.success('Case study deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'case-studies'] });
      revalidatePublicSite('case-studies', 'sitemap');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const columns = React.useMemo<ColumnDef<CaseStudy, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="max-w-sm">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="text-muted-foreground truncate text-xs">{row.original.clientName ?? '—'}</p>
          </div>
        ),
      },
      { accessorKey: 'industry', header: 'Industry' },
      {
        id: 'featured',
        header: 'Featured',
        cell: ({ row }) =>
          row.original.featured ? (
            <Badge variant="secondary" className="gap-1"><StarIcon className="size-3" /> Featured</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'published',
        header: 'Published',
        cell: ({ row }) => (
          <Badge variant={row.original.publishedAt ? 'default' : 'outline'}>
            {row.original.publishedAt ? 'Published' : 'Draft'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                  <PencilIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/case-studies/${row.original.id}`}>
                    <PencilIcon className="size-4" /> Edit
                  </Link>
                </DropdownMenuItem>
                <Can permission="content:write">
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                        <Trash2Icon className="size-4" /> Delete
                      </DropdownMenuItem>
                    }
                    title="Delete this case study?"
                    description="This cannot be undone."
                    variant="destructive"
                    onConfirm={() => handleDelete(row.original.id)}
                  />
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Studies"
        description="Showcase client success stories on the public site."
        actions={
          <Can permission="content:write">
            <Button asChild>
              <Link href="/admin/case-studies/new">
                <PlusIcon className="size-4" /> New case study
              </Link>
            </Button>
          </Can>
        }
      />
      {error ? <Button variant="outline" onClick={() => refetch()}>Retry</Button> : null}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        loading={isLoading}
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        searchPlaceholder="Search case studies…"
        sort={sort}
        onSortChange={setSort}
        onPageChange={setPage}
        getRowId={(row) => row.id}
        emptyTitle="No case studies yet"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <TextInputIndustry value={industry} onChange={(v) => { setIndustry(v); setPage(1); }} />
            <Select value={featured} onValueChange={(v) => { setFeatured(v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-[140px]"><SelectValue placeholder="Featured" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Featured</SelectItem>
                <SelectItem value="false">Not featured</SelectItem>
              </SelectContent>
            </Select>
            <Select value={published} onValueChange={(v) => { setPublished(v); setPage(1); }}>
              <SelectTrigger size="sm" className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}

/** Free-text industry filter — the set of industries is open-ended (client-defined). */
function TextInputIndustry({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value === 'all' ? '' : value}
      onChange={(event) => onChange(event.target.value || 'all')}
      placeholder="Filter by industry…"
      className="border-input h-8 w-[160px] rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    />
  );
}
