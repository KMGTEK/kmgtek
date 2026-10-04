import type { Metadata } from 'next';

import { COMPANY, type CaseStudy, type FAQ, type Job, type Service, type WebsiteSettings } from '@kmg/shared';

import { publicEnv } from '@/lib/env';
import { stripHtml, truncate } from '@/lib/utils';

export const SITE_NAME = COMPANY.displayName;
export const DEFAULT_DESCRIPTION = COMPANY.description;
export const DEFAULT_OG_IMAGE = '/opengraph-image';

export interface BuildMetadataOptions {
  title?: string;
  description?: string;
  /** Path relative to the site root, e.g. `/services/devops-consulting`. */
  path?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  noIndex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
}

/**
 * Build page `Metadata`: canonical URL, OpenGraph and Twitter cards.
 *
 * ```ts
 * export const metadata = buildMetadata({ title: 'Careers', path: '/careers' });
 * ```
 */
export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  keywords,
  noIndex = false,
  publishedTime,
  modifiedTime,
  authors,
}: BuildMetadataOptions = {}): Metadata {
  const url = `${publicEnv.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const resolvedImage = image ? (image.startsWith('http') ? image : `${publicEnv.siteUrl}${image}`) : undefined;
  const cleanDescription = truncate(stripHtml(description) || DEFAULT_DESCRIPTION, 300);

  return {
    title,
    description: cleanDescription,
    keywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: type === 'profile' ? 'profile' : type,
      url,
      siteName: SITE_NAME,
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description: cleanDescription,
      images: resolvedImage ? [{ url: resolvedImage, width: 1200, height: 630, alt: title ?? SITE_NAME }] : undefined,
      ...(type === 'article'
        ? {
            publishedTime: publishedTime ?? undefined,
            modifiedTime: modifiedTime ?? undefined,
            authors,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@kmgtek',
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description: cleanDescription,
      images: resolvedImage ? [resolvedImage] : undefined,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                     */
/* -------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

/**
 * `company`/`social` default to the static `COMPANY` fallback so this still renders
 * correctly if called before settings are fetched; pass `settings.company`/`settings.social`
 * (from `getSettings()`) to reflect what an admin configured in Website Settings.
 */
export function organizationJsonLd(
  company: Pick<WebsiteSettings['company'], 'name' | 'description' | 'email' | 'phone' | 'address'> = {
    name: COMPANY.displayName,
    description: COMPANY.description,
    email: COMPANY.email,
    phone: COMPANY.phone,
    address: COMPANY.address.full,
  },
  social: WebsiteSettings['social'] = COMPANY.social,
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${publicEnv.siteUrl}/#organization`,
    name: company.name,
    legalName: COMPANY.legalName,
    url: publicEnv.siteUrl,
    logo: `${publicEnv.siteUrl}/logo.svg`,
    description: company.description,
    email: company.email,
    telephone: company.phone,
    foundingDate: String(COMPANY.foundedYear),
    address: { '@type': 'PostalAddress', streetAddress: company.address },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: company.phone,
        email: company.email,
        contactType: 'sales',
        areaServed: 'US',
        availableLanguage: ['English'],
      },
    ],
    sameAs: Object.values(social).filter(Boolean),
  };
}

export function webSiteJsonLd(name: string = COMPANY.displayName): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${publicEnv.siteUrl}/#website`,
    url: publicEnv.siteUrl,
    name,
    publisher: { '@id': `${publicEnv.siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${publicEnv.siteUrl}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${publicEnv.siteUrl}${item.href}`,
    })),
  };
}

export function serviceJsonLd(service: Pick<Service, 'slug' | 'title' | 'shortDescription'>): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.shortDescription,
    url: `${publicEnv.siteUrl}/services/${service.slug}`,
    provider: { '@id': `${publicEnv.siteUrl}/#organization` },
    areaServed: 'US',
    serviceType: service.title,
  };
}

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  CONTRACT_TO_HIRE: 'CONTRACTOR',
  INTERNSHIP: 'INTERN',
};

/** Google Jobs rich result. */
export function jobPostingJsonLd(job: Job): Json {
  const salary =
    job.showSalary && (job.salaryMin || job.salaryMax)
      ? {
          '@type': 'MonetaryAmount',
          currency: job.salaryCurrency ?? 'USD',
          value: {
            '@type': 'QuantitativeValue',
            minValue: job.salaryMin ?? undefined,
            maxValue: job.salaryMax ?? undefined,
            unitText: job.salaryPeriod ?? 'YEAR',
          },
        }
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.summary,
    datePosted: job.publishedAt ?? undefined,
    validThrough: job.closingDate ?? undefined,
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.employmentType] ?? 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: COMPANY.displayName,
      sameAs: publicEnv.siteUrl,
      logo: `${publicEnv.siteUrl}/logo.svg`,
    },
    jobLocationType: job.workMode === 'REMOTE' ? 'TELECOMMUTE' : undefined,
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'US' },
    },
    baseSalary: salary,
    skills: job.skills?.join(', '),
    directApply: true,
    url: `${publicEnv.siteUrl}/careers/${job.slug}`,
  };
}

export function caseStudyJsonLd(study: CaseStudy): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.title,
    description: study.summary,
    image: study.coverImageUrl ? [study.coverImageUrl] : undefined,
    datePublished: study.publishedAt ?? undefined,
    publisher: { '@id': `${publicEnv.siteUrl}/#organization` },
    mainEntityOfPage: `${publicEnv.siteUrl}/case-studies/${study.slug}`,
  };
}

export function faqJsonLd(faqs: FAQ[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
