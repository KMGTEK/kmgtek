import 'server-only';

import {
  ALL_TECHNOLOGIES,
  CONTENT_BLOCK_KEYS,
  CONTENT_BLOCK_SCHEMAS,
  COMPANY,
  DEFAULT_CONTENT_BLOCKS,
  SERVICES,
  TECHNOLOGY_CATEGORIES,
  type CaseStudy,
  type ContentBlockData,
  type ContentBlockKey,
  type Job,
  type JobFacets,
  type JobSummary,
  type Paginated,
  type Service,
  type TeamMember,
  type Technology,
  type TechnologyCategory,
  type Testimonial,
  type WebsiteSettings,
  DEFAULT_LOGO_URL,
} from '@kmg/shared';

import { CACHE_TAGS, emptyPage, fetchData, fetchList } from '@/lib/api/server';
import { publicEnv } from '@/lib/env';

/**
 * Typed server-side data functions for the public website.
 *
 * Every function degrades gracefully: when the API is unreachable it falls back to the
 * static content shipped in `@kmg/shared` (services, technologies, company settings) or
 * to an empty list. Never throws — pages always render.
 */

/* --------------------------- Static fallbacks --------------------------- */

function serviceFromSeed(seed: (typeof SERVICES)[number], index: number): Service {
  return {
    id: seed.slug,
    slug: seed.slug,
    title: seed.title,
    shortDescription: seed.shortDescription,
    overview: seed.overview,
    icon: seed.icon,
    benefits: seed.benefits,
    process: seed.process,
    faqs: seed.faqs,
    technologies: seed.technologies.map((slug) => {
      const tech = ALL_TECHNOLOGIES.find((t) => t.slug === slug);
      return {
        id: slug,
        slug,
        name: tech?.name ?? slug,
        logoUrl: tech?.icon ? `https://cdn.simpleicons.org/${tech.icon}` : null,
      };
    }),
    order: index,
    seoTitle: null,
    seoDescription: null,
  };
}

/** The 12 services from `@kmg/shared`, shaped like API responses. */
export const FALLBACK_SERVICES: Service[] = SERVICES.map(serviceFromSeed);

export const FALLBACK_TECHNOLOGY_CATEGORIES: TechnologyCategory[] = TECHNOLOGY_CATEGORIES.map(
  (category, index) => ({
    id: category.slug,
    name: category.name,
    slug: category.slug,
    order: index,
    technologies: category.technologies.map<Technology>((tech) => ({
      id: tech.slug,
      name: tech.name,
      slug: tech.slug,
      description: tech.description,
      logoUrl: tech.icon ? `https://cdn.simpleicons.org/${tech.icon}` : null,
      websiteUrl: tech.websiteUrl ?? null,
      categoryId: category.slug,
      categoryName: category.name,
    })),
  }),
);

export const FALLBACK_SETTINGS: WebsiteSettings = {
  company: {
    name: COMPANY.displayName,
    tagline: COMPANY.tagline,
    description: COMPANY.description,
    email: COMPANY.email,
    phone: COMPANY.phone,
    address: COMPANY.address.full,
    mapEmbedUrl: COMPANY.mapEmbedUrl,
  },
  branding: {
    logoUrl: DEFAULT_LOGO_URL,
    faviconUrl: '/logo-mark.svg',
    primaryColor: '#F39C2C',
    accentColor: '#E5312F',
  },
  social: { ...COMPANY.social },
  seo: {
    defaultTitle: `${COMPANY.displayName} — ${COMPANY.tagline}`,
    titleTemplate: '%s | KMG Technologies',
    defaultDescription: COMPANY.description,
    keywords: [
      'IT consulting',
      'DevOps consulting',
      'cloud migration',
      'Kubernetes',
      'platform engineering',
      'IT staffing',
      'technology recruitment',
    ],
    ogImageUrl: `${publicEnv.siteUrl}/opengraph-image`,
    twitterHandle: '@kmgtek',
  },
  analytics: { googleAnalyticsId: publicEnv.gaId || null, googleTagManagerId: null },
  footer: {
    about: COMPANY.description,
    copyright: `© ${new Date().getFullYear()} ${COMPANY.legalName}. All rights reserved.`,
  },
  legal: { privacyPolicy: '', terms: '' },
  features: {
    companyIntro: true,
    industries: true,
    whyChooseUs: true,
    toolchain: true,
    testimonials: true,
    stats: true,
    jobsSection: true,
    leadership: false,
    certifications: false,
  },
};

/* ------------------------------ Settings ------------------------------- */

export async function getSettings(): Promise<WebsiteSettings> {
  const settings = await fetchData<WebsiteSettings>('/settings/public', {
    revalidate: 600,
    tags: [CACHE_TAGS.settings],
  });
  if (!settings) return FALLBACK_SETTINGS;
  // Merge so a partially-populated API response still has sane defaults.
  return {
    ...FALLBACK_SETTINGS,
    ...settings,
    company: { ...FALLBACK_SETTINGS.company, ...settings.company },
    branding: { ...FALLBACK_SETTINGS.branding, ...settings.branding },
    seo: { ...FALLBACK_SETTINGS.seo, ...settings.seo },
    social: { ...FALLBACK_SETTINGS.social, ...settings.social },
    footer: { ...FALLBACK_SETTINGS.footer, ...settings.footer },
  };
}

/* ------------------------------ Services ------------------------------- */

export async function getServices(): Promise<Service[]> {
  const services = await fetchData<Service[]>('/services', {
    revalidate: 600,
    tags: [CACHE_TAGS.services],
  });
  return services?.length ? services : FALLBACK_SERVICES;
}

export async function getService(slug: string): Promise<Service | null> {
  const service = await fetchData<Service>(`/services/${slug}`, {
    revalidate: 600,
    tags: [CACHE_TAGS.services, `service:${slug}`],
  });
  return service ?? FALLBACK_SERVICES.find((item) => item.slug === slug) ?? null;
}

/* ---------------------------- Technologies ----------------------------- */

export async function getTechnologies(): Promise<TechnologyCategory[]> {
  const categories = await fetchData<TechnologyCategory[]>('/technologies', {
    revalidate: 600,
    tags: [CACHE_TAGS.technologies],
  });
  return categories?.length ? categories : FALLBACK_TECHNOLOGY_CATEGORIES;
}

/* ----------------------------- Case studies ---------------------------- */

export interface CaseStudyQuery {
  page?: number;
  pageSize?: number;
  industry?: string;
  featured?: boolean;
}

export async function getCaseStudies(query: CaseStudyQuery = {}): Promise<Paginated<CaseStudy>> {
  const result = await fetchList<CaseStudy>('/case-studies', {
    query: { pageSize: 9, ...query },
    revalidate: 300,
    tags: [CACHE_TAGS.caseStudies],
  });
  return result ?? emptyPage<CaseStudy>(query.pageSize ?? 9);
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  return fetchData<CaseStudy>(`/case-studies/${slug}`, {
    revalidate: 300,
    tags: [CACHE_TAGS.caseStudies, `case-study:${slug}`],
  });
}

/* ---------------------------- Social proof ----------------------------- */

export async function getTestimonials(featured?: boolean): Promise<Testimonial[]> {
  const testimonials = await fetchData<Testimonial[]>('/testimonials', {
    query: featured === undefined ? undefined : { featured },
    revalidate: 600,
    tags: [CACHE_TAGS.testimonials],
  });
  return testimonials ?? [];
}

export async function getTeamMembers(leadership?: boolean): Promise<TeamMember[]> {
  const members = await fetchData<TeamMember[]>('/team-members', {
    query: leadership === undefined ? undefined : { leadership },
    revalidate: 600,
    tags: [CACHE_TAGS.team],
  });
  return members ?? [];
}

/* -------------------------------- Jobs --------------------------------- */

export interface JobsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  location?: string;
  department?: string;
  technology?: string;
  employmentType?: string;
  workMode?: string;
  experienceMin?: number;
  experienceMax?: number;
  sort?: 'newest' | 'oldest' | 'title';
}

export async function getJobs(query: JobsQueryParams = {}): Promise<Paginated<JobSummary>> {
  const result = await fetchList<JobSummary>('/jobs', {
    query: { pageSize: 10, ...query },
    revalidate: 60,
    tags: [CACHE_TAGS.jobs],
  });
  return result ?? emptyPage<JobSummary>(query.pageSize ?? 10);
}

export type JobWithSimilar = Job & { similar: JobSummary[] };

export async function getJob(slug: string): Promise<JobWithSimilar | null> {
  return fetchData<JobWithSimilar>(`/jobs/${slug}`, {
    revalidate: 60,
    tags: [CACHE_TAGS.jobs, `job:${slug}`],
  });
}

const EMPTY_FACETS: JobFacets = {
  locations: [],
  technologies: [],
  departments: [],
  employmentTypes: [],
  workModes: [],
};

export async function getJobFacets(): Promise<JobFacets> {
  const facets = await fetchData<JobFacets>('/jobs/facets', {
    revalidate: 300,
    tags: [CACHE_TAGS.jobs],
  });
  return facets ?? EMPTY_FACETS;
}

/* ------------------------------- Sitemap -------------------------------- */

export interface SitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface SitemapData {
  services: SitemapEntry[];
  jobs: SitemapEntry[];
  caseStudies: SitemapEntry[];
}

export async function getSitemapData(): Promise<SitemapData> {
  const data = await fetchData<SitemapData>('/sitemap', {
    revalidate: 3600,
    tags: [CACHE_TAGS.sitemap],
  });
  return (
    data ?? {
      services: FALLBACK_SERVICES.map((service) => ({
        slug: service.slug,
        updatedAt: new Date().toISOString(),
      })),
      jobs: [],
      caseStudies: [],
    }
  );
}

/* --------------------------- Content blocks ----------------------------- */

/** The full set of content blocks, each fully typed and defaulted. */
export type ContentBlocksMap = { [K in ContentBlockKey]: ContentBlockData<K> };

/**
 * Every content block, in one request. Any block missing from the API response, or that
 * fails its zod schema (e.g. a stale/malformed edit), falls back to `DEFAULT_CONTENT_BLOCKS`
 * for that key alone — the rest of the response is trusted as-is. Never throws.
 *
 * Prefer this over multiple `getContentBlock()` calls when a page needs more than one key.
 */
export async function getContentBlocks(): Promise<ContentBlocksMap> {
  const blocks = await fetchData<Partial<Record<ContentBlockKey, unknown>>>('/content-blocks', {
    revalidate: 300,
    tags: [CACHE_TAGS.contentBlocks],
  });

  // Built as a loosely-typed record (TS can't narrow a per-key mapped assignment inside a
  // loop over the key union) and cast once at the end — every value is still validated
  // against its own schema above.
  const result: Record<string, unknown> = {};
  for (const key of CONTENT_BLOCK_KEYS) {
    const raw = blocks?.[key];
    const parsed = raw === undefined ? undefined : CONTENT_BLOCK_SCHEMAS[key].safeParse(raw);
    result[key] = parsed?.success ? parsed.data : DEFAULT_CONTENT_BLOCKS[key];
  }
  return result as ContentBlocksMap;
}

/** A single content block, schema-validated with a fallback to its default value. */
export async function getContentBlock<K extends ContentBlockKey>(key: K): Promise<ContentBlockData<K>> {
  const block = await fetchData<unknown>(`/content-blocks/${key}`, {
    revalidate: 300,
    tags: [CACHE_TAGS.contentBlocks, `content-block:${key}`],
  });
  if (block === null || block === undefined) return DEFAULT_CONTENT_BLOCKS[key];

  const parsed = CONTENT_BLOCK_SCHEMAS[key].safeParse(block);
  return parsed.success ? (parsed.data as ContentBlockData<K>) : DEFAULT_CONTENT_BLOCKS[key];
}
