/**
 * Canonical company information. Admin "Website Settings" can override these at runtime;
 * these values are the defaults used for seeding and as an offline fallback.
 */
export const COMPANY = {
  name: 'KmgTechnologies',
  displayName: 'KMG Technologies',
  shortName: 'KMG',
  legalName: 'KmgTechnologies LLC',
  tagline: 'Connecting Exceptional Talent with Exceptional Opportunities',
  heroHeadline: 'Turning Data Into Decisions Through Business Analytics, Cloud & AI',
  description:
    'KMG Technologies is a business analytics consulting and talent solutions company helping enterprises turn data into decisions — with Cloud and AI capabilities that support and extend that core practice — and connecting exceptional engineers with exceptional opportunities.',
  email: 'contactus@kmgtek.com',
  phone: '',
  website: 'https://www.kmgtek.com',
  address: {
    street: '180 Talmadge Rd, Suite# 599',
    city: 'Edison',
    region: 'New Jersey',
    regionCode: 'NJ',
    postalCode: '08817',
    country: 'United States',
    countryCode: 'US',
    full: '180 Talmadge Rd, Suite# 599, Edison, New Jersey 08817',
    lat: 40.5452,
    lng: -74.3657,
  },
  mapEmbedUrl:
    'https://www.google.com/maps?q=180+Talmadge+Rd+Suite+599+Edison+NJ+08817&output=embed',
  social: {
    linkedin: 'https://www.linkedin.com/company/kmgtek',
    twitter: 'https://x.com/kmgtek',
    github: 'https://github.com/kmgtek',
    facebook: 'https://www.facebook.com/kmgtek',
    youtube: '',
  },
  foundedYear: 2020,
} as const;

/** Default site logo (transparent PNG in `apps/web/public`); admins can replace it in Website Settings → Branding. */
export const DEFAULT_LOGO_URL = '/kmg-logo.png';

/** Brand palette derived from the logo (orange + red) plus a neutral ink for text/dark UI. */
export const BRAND_COLORS = {
  primary: '#F39C2C', // logo orange
  primaryDark: '#D9800F',
  ink: '#0B0B0F', // neutral ink (dark backgrounds, body text) — not used in the logo itself
  accent: '#E5312F', // logo red bar / accent
  white: '#FFFFFF',
} as const;
