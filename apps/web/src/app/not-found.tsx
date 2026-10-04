import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Page not found',
  description: 'The page you are looking for does not exist or has moved.',
  noIndex: true,
});

/** Global 404 — rendered for any unmatched route. */
export default function NotFound() {
  return (
    <main className="bg-hero-glow relative isolate flex min-h-svh items-center justify-center overflow-hidden px-6">
      <div aria-hidden className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 -z-10" />

      <div className="relative mx-auto max-w-lg text-center">
        <Logo variant="mark" className="mx-auto size-14" />
        <p className="font-display gradient-text mt-6 text-7xl font-bold tracking-tight sm:text-8xl">404</p>
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          We couldn&apos;t find that page
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-pretty">
          The page may have been moved, renamed or never existed. Try heading back home or searching the site.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/">
              <ArrowLeftIcon className="size-4" />
              Back to home
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/search">
              <SearchIcon className="size-4" />
              Search the site
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
