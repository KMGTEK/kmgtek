import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import * as React from 'react';

import { COMPANY } from '@kmg/shared';

import { Providers } from '@/components/providers';
import { JsonLd } from '@/components/shared/json-ld';
import { GoogleAnalytics, PageViewTracker } from '@/lib/analytics';
import { getSettings } from '@/lib/api/public';
import { publicEnv } from '@/lib/env';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/seo';

import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

/**
 * Site-wide metadata defaults, driven by Website Settings → SEO (`settings.seo`) with the
 * static `COMPANY` values as a fallback. Per-page metadata (via `buildMetadata()` in
 * `lib/seo.ts`) still overrides `title`/`description` per route; this only sets the
 * site-wide default and `%s` template used when a page doesn't.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const { seo, company } = settings;

  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: seo.defaultTitle, template: seo.titleTemplate },
    description: seo.defaultDescription,
    applicationName: company.name,
    keywords: seo.keywords,
    authors: [{ name: company.name, url: publicEnv.siteUrl }],
    creator: company.name,
    publisher: COMPANY.legalName,
    formatDetection: { telephone: true, email: true, address: false },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: company.name,
      locale: 'en_US',
      url: publicEnv.siteUrl,
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      site: seo.twitterHandle ?? '@kmgtek',
      creator: seo.twitterHandle ?? '@kmgtek',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0F' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-svh antialiased">
        <a
          href="#main-content"
          className="bg-background focus:ring-ring sr-only z-100 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:ring-2"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <JsonLd
          data={[
            organizationJsonLd(settings.company, settings.social),
            webSiteJsonLd(settings.company.name),
          ]}
        />
        <React.Suspense fallback={null}>
          <PageViewTracker />
        </React.Suspense>
        <GoogleAnalytics id={settings.analytics.googleAnalyticsId} />
      </body>
    </html>
  );
}
