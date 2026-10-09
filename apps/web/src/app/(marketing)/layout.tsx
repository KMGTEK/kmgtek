import * as React from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSettings } from '@/lib/api/public';

/**
 * Public marketing shell: sticky header + footer.
 * Every page under `src/app/(marketing)/` inherits it.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // `SiteHeader` is a Client Component (interactive nav), so its settings-derived contact
  // info is fetched here and passed down as a prop. `SiteFooter` is itself a Server
  // Component and fetches its own copy — Next dedupes identical `fetch()`s per request.
  const settings = await getSettings();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        company={{ tagline: settings.company.tagline, email: settings.company.email }}
        logoUrl={settings.branding.logoUrl}
      />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
