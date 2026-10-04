import { COMPANY } from '@kmg/shared';

import { publicEnv } from '@/lib/env';

/** Static site-level configuration shared by layouts, SEO helpers and the footer. */
export const siteConfig = {
  name: COMPANY.displayName,
  legalName: COMPANY.legalName,
  shortName: COMPANY.shortName,
  tagline: COMPANY.tagline,
  description: COMPANY.description,
  url: publicEnv.siteUrl,
  ogImage: '/opengraph-image',
  email: COMPANY.email,
  phone: COMPANY.phone,
  phoneHref: COMPANY.phoneHref,
  address: COMPANY.address,
  mapEmbedUrl: COMPANY.mapEmbedUrl,
  social: COMPANY.social,
  /** Primary conversion CTA used across the marketing site. */
  primaryCta: { label: 'Book a Consultation', href: '/contact' },
  secondaryCta: { label: 'View Open Roles', href: '/careers' },
} as const;

export type SiteConfig = typeof siteConfig;
