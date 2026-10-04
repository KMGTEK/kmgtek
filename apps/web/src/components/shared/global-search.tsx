'use client';

import { useQuery } from '@tanstack/react-query';
import { BriefcaseIcon, CpuIcon, SearchIcon, SparklesIcon, CornerDownLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { ALL_TECHNOLOGIES, SERVICES, type SearchResults } from '@kmg/shared';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/query-keys';
import { cn } from '@/lib/utils';

interface GlobalSearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const GlobalSearchContext = React.createContext<GlobalSearchContextValue | null>(null);

/** Open/close the ⌘K palette from anywhere below `<GlobalSearchProvider>`. */
export function useGlobalSearch() {
  const context = React.useContext(GlobalSearchContext);
  if (!context) throw new Error('useGlobalSearch() must be used inside <GlobalSearchProvider>');
  return context;
}

const EMPTY_RESULTS: SearchResults = { jobs: [], services: [], technologies: [] };

/** Offline fallback: search the static content bundled in `@kmg/shared`. */
function localSearch(term: string): SearchResults {
  const q = term.toLowerCase();
  return {
    jobs: [],
    services: SERVICES.filter(
      (service) =>
        service.title.toLowerCase().includes(q) || service.shortDescription.toLowerCase().includes(q),
    )
      .slice(0, 5)
      .map((service) => ({
        id: service.slug,
        slug: service.slug,
        title: service.title,
        shortDescription: service.shortDescription,
      })),
    technologies: ALL_TECHNOLOGIES.filter((tech) => tech.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((tech) => ({
        id: tech.slug,
        slug: tech.slug,
        name: tech.name,
        categoryName: tech.categoryName,
      })),
  };
}

function hasResults(results: SearchResults) {
  return (
    results.jobs.length + results.services.length + results.technologies.length > 0
  );
}

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === '/' && !open) {
        const target = event.target as HTMLElement | null;
        const isField =
          target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isField) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const value = React.useMemo(() => ({ open, setOpen, toggle: () => setOpen((v) => !v) }), [open]);

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchDialog />
    </GlobalSearchContext.Provider>
  );
}

function GlobalSearchDialog() {
  const { open, setOpen } = useGlobalSearch();
  const [term, setTerm] = React.useState('');
  const debounced = useDebounce(term.trim(), 250);
  const router = useRouter();

  const { data, isFetching } = useQuery({
    queryKey: qk.search(debounced),
    enabled: open && debounced.length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await api.getData<SearchResults>('/search', { query: { q: debounced, limit: 5 } });
      } catch {
        // API unreachable → search the static content we ship with the app.
        return localSearch(debounced);
      }
    },
  });

  const results = data ?? EMPTY_RESULTS;

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      setTerm('');
      router.push(href);
    },
    [router, setOpen],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search KMG Technologies"
      description="Search jobs, articles, services and technologies"
      className="sm:max-w-2xl"
    >
      <CommandInput
        placeholder="Search jobs, articles, services…"
        value={term}
        onValueChange={setTerm}
      />
      <CommandList className="max-h-[60vh]">
        {debounced.length < 2 ? (
          <div className="text-muted-foreground px-4 py-8 text-center text-sm">
            Type at least 2 characters to search.
          </div>
        ) : isFetching && !hasResults(results) ? (
          <div className="text-muted-foreground px-4 py-8 text-center text-sm">Searching…</div>
        ) : !hasResults(results) ? (
          <CommandEmpty>No results for “{debounced}”.</CommandEmpty>
        ) : null}

        {results.jobs.length > 0 && (
          <CommandGroup heading="Open roles">
            {results.jobs.map((job) => (
              <CommandItem key={job.id} value={`job-${job.slug}`} onSelect={() => go(`/careers/${job.slug}`)}>
                <BriefcaseIcon />
                <span className="flex-1 truncate">{job.title}</span>
                <span className="text-muted-foreground text-xs">{job.location}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.services.length > 0 && (
          <CommandGroup heading="Services">
            {results.services.map((service) => (
              <CommandItem
                key={service.id}
                value={`service-${service.slug}`}
                onSelect={() => go(`/services/${service.slug}`)}
              >
                <SparklesIcon />
                <span className="flex-1 truncate">{service.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.technologies.length > 0 && (
          <CommandGroup heading="Technologies">
            {results.technologies.map((tech) => (
              <CommandItem
                key={tech.id}
                value={`tech-${tech.slug}`}
                onSelect={() => go(`/technologies#${tech.slug}`)}
              >
                <CpuIcon />
                <span className="flex-1 truncate">{tech.name}</span>
                {tech.categoryName ? (
                  <span className="text-muted-foreground text-xs">{tech.categoryName}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {debounced.length >= 2 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="see-all" onSelect={() => go(`/search?q=${encodeURIComponent(debounced)}`)}>
                <SearchIcon />
                <span className="flex-1">See all results for “{debounced}”</span>
                <CornerDownLeftIcon className="size-3.5 opacity-60" />
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Header search affordance — a fake input on desktop, an icon button on mobile. */
export function GlobalSearchTrigger({
  className,
  variant = 'input',
}: {
  className?: string;
  variant?: 'input' | 'icon';
}) {
  const { setOpen } = useGlobalSearch();

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={className}
      >
        <SearchIcon className="size-4" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'text-muted-foreground bg-muted/60 hover:bg-muted focus-ring flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm transition-colors sm:w-56',
        className,
      )}
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="bg-background text-muted-foreground pointer-events-none hidden rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
