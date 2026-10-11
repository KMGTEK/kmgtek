'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';

import type { PaginationMeta } from '@kmg/shared';

import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

/** `"createdAt:desc"` ⇄ TanStack `SortingState`. */
export function parseSort(sort?: string | null): SortingState {
  if (!sort) return [];
  const [id, direction] = sort.split(':');
  if (!id) return [];
  return [{ id, desc: direction !== 'asc' }];
}

export function serializeSort(sorting: SortingState): string | undefined {
  const first = sorting[0];
  return first ? `${first.id}:${first.desc ? 'desc' : 'asc'}` : undefined;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  /** Pagination metadata from the API list envelope. */
  meta?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  /** Server-side sorting, in the API's `field:asc|desc` form. */
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
  /** Server-side search. Debounced internally (300ms). */
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  /** Enables the selection column. Requires `getRowId` for stable ids. */
  selectable?: boolean;
  getRowId?: (row: TData, index: number) => string;
  onSelectionChange?: (ids: string[]) => void;
  /** Rendered above the table, left of the search box (filters etc.). */
  toolbar?: React.ReactNode;
  /** Rendered when rows are selected (bulk actions). */
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  className?: string;
  /** Hide the column-visibility menu. */
  hideColumnToggle?: boolean;
}

/**
 * Server-driven table for the admin portal.
 *
 * Pagination, sorting and search are **controlled** — the parent owns the query state and
 * passes fresh data (usually from TanStack Query).
 *
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={result?.data ?? []}
 *   meta={result?.meta}
 *   loading={isLoading}
 *   search={search} onSearchChange={setSearch}
 *   sort={sort} onSortChange={setSort}
 *   onPageChange={setPage}
 *   selectable getRowId={(row) => row.id}
 *   bulkActions={(ids, clear) => <Button onClick={() => bulkReject(ids, clear)}>Reject</Button>}
 * />
 * ```
 */
export function DataTable<TData>({
  columns,
  data,
  loading = false,
  meta,
  onPageChange,
  onPageSizeChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  selectable = false,
  getRowId,
  onSelectionChange,
  toolbar,
  bulkActions,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Try adjusting your filters or search terms.',
  emptyAction,
  onRowClick,
  className,
  hideColumnToggle = false,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [searchValue, setSearchValue] = React.useState(search ?? '');
  const debouncedSearch = useDebounce(searchValue, 300);

  React.useEffect(() => {
    if (onSearchChange && debouncedSearch !== (search ?? '')) onSearchChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const sorting = React.useMemo(() => parseSort(sort), [sort]);

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: '__select',
      size: 36,
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          onClick={(event) => event.stopPropagation()}
          aria-label="Select row"
        />
      ),
    }),
    [],
  );

  const table = useReactTable({
    data,
    columns: selectable ? [selectionColumn, ...columns] : columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: meta?.totalPages ?? -1,
    state: { sorting, rowSelection, columnVisibility },
    getRowId,
    enableRowSelection: selectable,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange?.(serializeSort(next));
    },
  });

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection],
  );

  React.useEffect(() => {
    onSelectionChange?.(selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.join(',')]);

  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  const page = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? data.length;
  const pageSize = meta?.pageSize ?? 20;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar ------------------------------------------------------- */}
      {(onSearchChange || toolbar || !hideColumnToggle) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {onSearchChange ? (
              <div className="relative w-full sm:max-w-xs">
                <SearchIcon
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  aria-label="Search"
                />
                {searchValue ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchValue('')}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
            {toolbar}
          </div>

          {!hideColumnToggle ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2Icon className="size-4" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      className="capitalize"
                    >
                      {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      )}

      {/* Bulk action bar ----------------------------------------------- */}
      {selectable && selectedIds.length > 0 && bulkActions ? (
        <div className="bg-accent/60 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions(selectedIds, clearSelection)}</div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      ) : null}

      {/* Table ---------------------------------------------------------- */}
      {loading ? (
        <TableSkeleton columns={Math.min(columns.length, 6)} />
      ) : data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort() && Boolean(onSortChange);
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead key={header.id} style={{ width: header.getSize() || undefined }}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="focus-ring -mx-1 inline-flex items-center gap-1 rounded px-1 font-medium"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUpIcon className="size-3.5" />
                            ) : sorted === 'desc' ? (
                              <ArrowDownIcon className="size-3.5" />
                            ) : (
                              <ChevronsUpDownIcon className="size-3.5 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination ------------------------------------------------------ */}
      {meta && total > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            Showing <span className="text-foreground font-medium">{(page - 1) * pageSize + 1}</span>–
            <span className="text-foreground font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="text-foreground font-medium">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            {onPageSizeChange ? (
              <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
                <SelectTrigger size="sm" className="w-[110px]" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="text-sm tabular-nums">
              {page} / {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
