import * as React from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSettings } from '@/lib/api/public';

/**
 * The careers module lives outside the `(marketing)` route group (it needs its own
 * nested layouts for `[slug]` and `[slug]/apply`), but mirrors the same public shell:
 * sticky header + footer.
 */
export default async function CareersLayout({ children }: { children: React.ReactNode }) {
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
