import type { MetadataRoute } from 'next';

import { SERVICES } from '@kmg/shared';

import { getSitemapData } from '@/lib/api/public';
import { publicEnv } from '@/lib/env';

/**
 * Dynamic sitemap: static marketing/legal routes + service pages (static fallback,
 * overridden by the API list when reachable) + jobs from the API.
 * Excludes `/design-system`, `(auth)`, `/portal`, `/admin`, `/case-studies`, `/blog` (not public).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  const now = new Date();

  const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/technologies', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/industries', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/careers', changeFrequency: 'daily', priority: 0.7 },
    { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  ];

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${publicEnv.siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const serviceSlugs = data.services.length ? data.services : SERVICES.map((s) => ({ slug: s.slug, updatedAt: now.toISOString() }));

  const serviceEntries: MetadataRoute.Sitemap = serviceSlugs.map((service) => ({
    url: `${publicEnv.siteUrl}/services/${service.slug}`,
    lastModified: new Date(service.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const jobEntries: MetadataRoute.Sitemap = data.jobs.map((job) => ({
    url: `${publicEnv.siteUrl}/careers/${job.slug}`,
    lastModified: new Date(job.updatedAt),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...serviceEntries, ...jobEntries];
}
