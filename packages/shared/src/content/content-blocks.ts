import { z } from 'zod';

import { COMPANY } from '../company';
import { coercedNumber } from '../schemas/common';

/**
 * "Content blocks" are the marketing-copy sections that used to be hardcoded directly in
 * `apps/web` components (hero headline, pillar lists, industries, about-page copy, careers
 * copy, etc). Each is a named, schema-validated JSON blob an admin with `content:write` can
 * edit from `/admin/content` — no code change or redeploy required.
 *
 * The pattern: one zod schema per key (below), a matching TypeScript shape, and a default
 * value that is BOTH the initial seed and the runtime fallback the website renders when a
 * block hasn't been customized yet (or the API is unreachable). Web components must always
 * render the default shape correctly — nothing should look broken before an admin touches it.
 */

const icon = z.string().trim().min(1).max(60);
const shortText = (max: number) => z.string().trim().min(1).max(max);

/* ------------------------------- Home page ------------------------------- */

export const heroContentSchema = z.object({
  eyebrow: shortText(120),
  headline: shortText(200),
  /** Gradient-highlighted phrase inside the headline. */
  headlineHighlight: shortText(120),
  /** Text after the highlighted phrase, e.g. ", Cloud & AI". May be empty. */
  headlineSuffix: z.string().trim().max(120).default(''),
  description: shortText(600),
  trustPoints: z.array(shortText(60)).max(6).default([]),
  primaryCtaLabel: shortText(40),
  secondaryCtaLabel: shortText(40),
});
export type HeroContent = z.infer<typeof heroContentSchema>;

export const companyIntroContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: z.string().trim().max(600).default(''),
  pillars: z
    .array(z.object({ title: shortText(80), description: shortText(300) }))
    .max(8)
    .default([]),
});
export type CompanyIntroContent = z.infer<typeof companyIntroContentSchema>;

export const homeServicesContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: shortText(300),
});
export type HomeServicesContent = z.infer<typeof homeServicesContentSchema>;

export const whyChooseUsContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: shortText(300),
  reasons: z
    .array(z.object({ icon, title: shortText(80), description: shortText(300) }))
    .max(8)
    .default([]),
});
export type WhyChooseUsContent = z.infer<typeof whyChooseUsContentSchema>;

export const statsContentSchema = z.object({
  items: z
    .array(z.object({ label: shortText(60), value: coercedNumber(z.number().int().min(0).max(1_000_000)), suffix: z.string().trim().max(10).default('+') }))
    .min(1)
    .max(6),
});
export type StatsContent = z.infer<typeof statsContentSchema>;

/** Also used by the standalone `/industries` page. */
export const industriesContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: shortText(300),
  items: z
    .array(
      z.object({
        slug: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only'),
        name: shortText(60),
        icon,
        description: shortText(300),
      }),
    )
    .min(1)
    .max(24),
});
export type IndustriesContent = z.infer<typeof industriesContentSchema>;

export const footerCtaContentSchema = z.object({
  title: shortText(120),
  titleHighlight: shortText(60),
  description: shortText(300),
});
export type FooterCtaContent = z.infer<typeof footerCtaContentSchema>;

export const toolchainContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: shortText(300),
});
export type ToolchainContent = z.infer<typeof toolchainContentSchema>;

/* -------------------------------- About page ------------------------------- */

export const aboutStoryContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  paragraphs: z.array(shortText(1200)).min(1).max(6),
});
export type AboutStoryContent = z.infer<typeof aboutStoryContentSchema>;

export const aboutMissionVisionContentSchema = z.object({
  missionTitle: shortText(80),
  missionText: shortText(600),
  visionTitle: shortText(80),
  visionText: shortText(600),
});
export type AboutMissionVisionContent = z.infer<typeof aboutMissionVisionContentSchema>;

export const aboutValuesContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  values: z
    .array(z.object({ icon, title: shortText(80), description: shortText(300) }))
    .max(8)
    .default([]),
});
export type AboutValuesContent = z.infer<typeof aboutValuesContentSchema>;

export const aboutCertificationsContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  items: z
    .array(z.object({ name: shortText(80), description: shortText(200) }))
    .max(12)
    .default([]),
});
export type AboutCertificationsContent = z.infer<typeof aboutCertificationsContentSchema>;

export const aboutGlobalPresenceContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  regions: z
    .array(z.object({ name: shortText(60), detail: shortText(300) }))
    .max(8)
    .default([]),
});
export type AboutGlobalPresenceContent = z.infer<typeof aboutGlobalPresenceContentSchema>;

/* -------------------------------- Careers page ------------------------------ */

export const careersIntroContentSchema = z.object({
  heroEyebrow: shortText(120),
  heroTitle: shortText(200),
  heroTitleHighlight: shortText(80),
  heroDescription: shortText(400),
  whyUsEyebrow: shortText(120),
  whyUsTitle: shortText(200),
  whyUsDescription: shortText(300),
  whyUs: z
    .array(z.object({ icon, title: shortText(80), description: shortText(300) }))
    .max(8)
    .default([]),
  benefitsEyebrow: shortText(120),
  benefitsTitle: shortText(200),
  benefits: z
    .array(z.object({ icon, label: shortText(150) }))
    .max(12)
    .default([]),
  cultureEyebrow: shortText(120),
  cultureTitle: shortText(200),
  culturePoints: z.array(shortText(300)).max(8).default([]),
  cultureQuote: shortText(400),
  cultureQuoteAttribution: shortText(120),
  openingsEyebrow: shortText(120),
  openingsTitle: shortText(200),
  noRoleTitle: shortText(120),
  noRoleDescription: shortText(300),
  noRoleButtonLabel: shortText(40),
});
export type CareersIntroContent = z.infer<typeof careersIntroContentSchema>;

/* -------------------------------- Services page ------------------------------ */

export const servicesIntroContentSchema = z.object({
  heroEyebrow: shortText(120),
  heroTitle: shortText(200),
  heroDescription: shortText(400),
  processEyebrow: shortText(120),
  processTitle: shortText(200),
  processDescription: shortText(300),
  process: z
    .array(z.object({ icon, title: shortText(80), description: shortText(300) }))
    .min(1)
    .max(8)
    .default([]),
});
export type ServicesIntroContent = z.infer<typeof servicesIntroContentSchema>;

/* -------------------------------- Contact page ------------------------------ */

export const contactHeroContentSchema = z.object({
  eyebrow: shortText(120),
  title: shortText(200),
  description: shortText(400),
});
export type ContactHeroContent = z.infer<typeof contactHeroContentSchema>;

/* --------------------------------- Registry --------------------------------- */

export const CONTENT_BLOCK_SCHEMAS = {
  'home.hero': heroContentSchema,
  'home.company_intro': companyIntroContentSchema,
  'home.services': homeServicesContentSchema,
  'home.why_choose_us': whyChooseUsContentSchema,
  'home.stats': statsContentSchema,
  'site.industries': industriesContentSchema,
  'home.toolchain': toolchainContentSchema,
  'footer.cta': footerCtaContentSchema,
  'about.story': aboutStoryContentSchema,
  'about.mission_vision': aboutMissionVisionContentSchema,
  'about.values': aboutValuesContentSchema,
  'about.certifications': aboutCertificationsContentSchema,
  'about.global_presence': aboutGlobalPresenceContentSchema,
  'careers.intro': careersIntroContentSchema,
  'services.intro': servicesIntroContentSchema,
  'contact.hero': contactHeroContentSchema,
} as const;

export type ContentBlockKey = keyof typeof CONTENT_BLOCK_SCHEMAS;
export const CONTENT_BLOCK_KEYS = Object.keys(CONTENT_BLOCK_SCHEMAS) as ContentBlockKey[];

export type ContentBlockData<K extends ContentBlockKey> = z.infer<(typeof CONTENT_BLOCK_SCHEMAS)[K]>;

/** Human-readable label + grouping for the admin content list. */
export const CONTENT_BLOCK_META: Record<
  ContentBlockKey,
  { label: string; group: 'Home page' | 'About page' | 'Careers page' | 'Services page' | 'Contact page' | 'Site-wide' }
> = {
  'home.hero': { label: 'Hero', group: 'Home page' },
  'home.company_intro': { label: 'Company Introduction', group: 'Home page' },
  'home.services': { label: 'What We Do', group: 'Home page' },
  'home.why_choose_us': { label: 'Why Choose Us', group: 'Home page' },
  'home.stats': { label: 'Statistics', group: 'Home page' },
  'site.industries': { label: 'Industries We Serve', group: 'Site-wide' },
  'home.toolchain': { label: 'Toolchain', group: 'Home page' },
  'footer.cta': { label: 'Footer Call-to-Action', group: 'Site-wide' },
  'about.story': { label: 'Our Story', group: 'About page' },
  'about.mission_vision': { label: 'Mission & Vision', group: 'About page' },
  'about.values': { label: 'Our Values', group: 'About page' },
  'about.certifications': { label: 'Certifications', group: 'About page' },
  'about.global_presence': { label: 'Global Presence', group: 'About page' },
  'careers.intro': { label: 'Careers Overview', group: 'Careers page' },
  'services.intro': { label: 'What We Do & How We Work', group: 'Services page' },
  'contact.hero': { label: 'Contact Hero', group: 'Contact page' },
};

/**
 * Defaults — the exact copy the site shipped with. Used as (a) the seed data written into
 * `content_blocks` on first run and (b) the fallback every server-side fetcher renders if a
 * block is missing or the API can't be reached, so the site never looks broken.
 */
export const DEFAULT_CONTENT_BLOCKS: { [K in ContentBlockKey]: ContentBlockData<K> } = {
  'home.hero': {
    eyebrow: 'Business Analytics · Cloud · AI',
    headline: 'Turning Data Into Decisions Through',
    headlineHighlight: 'Business Analytics',
    headlineSuffix: ', Cloud & AI',
    description: COMPANY.description,
    trustPoints: ['Data-driven decisions', 'Governed & secure', 'Fixed-fee assessments'],
    primaryCtaLabel: 'Get Started',
    secondaryCtaLabel: 'Explore Services',
  },
  'home.company_intro': {
    eyebrow: 'Who we are',
    title: 'Analysts first. Consultants second.',
    description: COMPANY.description,
    pillars: [
      { title: 'Business Analytics', description: 'BI, reporting and data visualization that turn raw data into decisions leadership trusts.' },
      { title: 'Data Engineering', description: 'Warehousing and ETL pipelines that give every report and model a clean, governed foundation.' },
      { title: 'Cloud & AI', description: 'A small, focused practice that extends analytics — cloud data platforms and applied AI, not general IT.' },
      { title: 'Talent Solutions', description: 'Connecting exceptional analysts and engineers with exceptional opportunities, fast.' },
    ],
  },
  'home.services': {
    eyebrow: 'What we do',
    title: 'Business analytics first. Cloud & AI in support.',
    description: 'From dashboards to predictive models — delivered by senior analysts who stay until your team owns the outcome.',
  },
  'home.why_choose_us': {
    eyebrow: 'Why KMG',
    title: 'Built for decisions, not billable hours',
    description: 'A pragmatic, senior-led approach that treats your data like our own.',
    reasons: [
      { icon: 'UsersRound', title: 'Senior analysts, not just advisors', description: 'Every engagement is staffed by practitioners who build the dashboards and stay to hand them over.' },
      { icon: 'Clock', title: 'Fast time to value', description: 'Fixed-fee assessments and 90-day roadmaps get you a trusted dashboard before the next planning cycle.' },
      { icon: 'ShieldCheck', title: 'Governance built in', description: 'SOC 2, HIPAA and PCI-aware data governance from day one — not retrofitted after an audit finding.' },
      { icon: 'Handshake', title: 'Outcome-based partnership', description: 'Decisions made, dollars saved and adoption rates tell us — and you — whether the engagement is working.' },
    ],
  },
  'home.stats': {
    items: [
      { label: 'Years in business', value: new Date().getFullYear() - COMPANY.foundedYear, suffix: '+' },
      { label: 'Enterprise engagements', value: 120, suffix: '+' },
      { label: 'Technologies mastered', value: 22, suffix: '+' },
      { label: 'Engineers placed', value: 2500, suffix: '+' },
    ],
  },
  'site.industries': {
    eyebrow: 'Who we serve',
    title: 'Industries we accelerate',
    description: 'Deep domain context paired with modern engineering practice, across regulated and high-growth industries alike.',
    items: [
      { slug: 'banking', name: 'Banking', icon: 'Landmark', description: 'Risk, fraud and customer analytics — plus secure cloud platforms — for banks and credit unions.' },
      { slug: 'healthcare', name: 'Healthcare', icon: 'HeartPulse', description: 'Clinical and operational analytics that improve outcomes while staying HIPAA-ready.' },
      { slug: 'insurance', name: 'Insurance', icon: 'Umbrella', description: 'Underwriting, claims and pricing analytics for carriers and MGAs.' },
      { slug: 'telecom', name: 'Telecom', icon: 'RadioTower', description: 'Network performance and customer analytics for telecom operators.' },
      { slug: 'it', name: 'IT', icon: 'Cpu', description: 'Analytics-led modernization and cloud/AI adoption for software and IT services companies.' },
      { slug: 'manufacturing', name: 'Manufacturing', icon: 'Factory', description: 'Production, quality and supply-chain analytics for Industry 4.0 operations.' },
      { slug: 'hospitality', name: 'Hospitality', icon: 'Hotel', description: 'Guest experience, occupancy and revenue analytics for hotels and hospitality groups.' },
      { slug: 'logistics', name: 'Logistics', icon: 'Truck', description: 'Fleet, route and supply-chain analytics that cut cost and delay.' },
      { slug: 'federal', name: 'Federal', icon: 'Building2', description: 'Secure, compliant data and analytics platforms for federal agencies.' },
    ],
  },
  'home.toolchain': {
    eyebrow: 'Toolchain',
    title: 'Technologies we engineer with',
    description: 'Tool-agnostic by design — we recommend what fits your team, not what we happen to know.',
  },
  'footer.cta': {
    title: "Let's build something that",
    titleHighlight: 'scales',
    description: "Tell us about your roadmap — analytics, cloud, platform or talent. We'll reply within one business day.",
  },
  'about.story': {
    eyebrow: 'Our story',
    title: 'From analytics desk to full-service consultancy',
    paragraphs: [
      `KMG Technologies was founded in ${COMPANY.foundedYear} in Edison, New Jersey, with a simple premise: the best business outcomes come from pairing exceptional analysts and engineers with the clients who need them most. What began as a business analytics practice grew, engagement by engagement, into a full-service consultancy — adding cloud data platforms, DevOps, platform engineering, security and applied AI to support and extend that analytics core.`,
      'Today we combine hands-on delivery with talent solutions: our consultants build the platforms, and our recruiters build the teams that run them. That dual perspective is what keeps our advice grounded in what is actually achievable with the engineers available to a given organization.',
    ],
  },
  'about.mission_vision': {
    missionTitle: 'Our Mission',
    missionText:
      "To turn every client's data into better decisions through business analytics — supported by cloud and AI expertise — delivered by consultants who stay accountable to outcomes, and to connect exceptional talent with exceptional opportunities along the way.",
    visionTitle: 'Our Vision',
    visionText:
      'To be the most trusted analytics partner for enterprises turning data into decisions — known equally for analytical rigor and for the careers we help build.',
  },
  'about.values': {
    eyebrow: 'What guides us',
    title: 'Our values',
    values: [
      { icon: 'Target', title: 'Outcomes over output', description: 'We measure success in decisions made, dollars saved and dashboards adopted — not hours billed.' },
      { icon: 'ShieldCheck', title: 'Security by default', description: 'Every recommendation assumes it will be audited. We build it right the first time.' },
      { icon: 'HeartHandshake', title: 'Radical transparency', description: 'Clear roadmaps, honest tradeoffs and no surprise invoices.' },
      { icon: 'Lightbulb', title: 'Continuous learning', description: 'The toolchain changes fast — our engineers invest in staying ahead of it.' },
    ],
  },
  'about.certifications': {
    eyebrow: 'Certifications',
    title: 'Certifications & partnerships',
    items: [
      { name: 'ISO 27001', description: 'Information security management (illustrative)' },
      { name: 'AWS Advanced Tier Partner', description: 'Cloud migration & well-architected reviews (illustrative)' },
      { name: 'Microsoft Azure Solutions Partner', description: 'Infrastructure & DevOps (illustrative)' },
      { name: 'Google Cloud Partner', description: 'Data & Kubernetes engineering (illustrative)' },
      { name: 'SOC 2 Type II', description: 'Security, availability & confidentiality (illustrative)' },
      { name: 'CMMI Level 3', description: 'Process maturity for delivery engagements (illustrative)' },
    ],
  },
  'about.global_presence': {
    eyebrow: 'Where we work',
    title: 'Global presence',
    regions: [
      { name: 'North America', detail: 'Headquarters in Edison, New Jersey — serving clients across the US and Canada.' },
      { name: 'EMEA', detail: 'Remote delivery pods supporting European enterprise engagements.' },
      { name: 'APAC', detail: 'Follow-the-sun coverage for managed services and 24×7 operations.' },
    ],
  },
  'careers.intro': {
    heroEyebrow: 'Careers',
    heroTitle: "Build what's next with",
    heroTitleHighlight: 'KMG Technologies',
    heroDescription:
      "We're a team of senior analysts and engineers solving hard analytics, cloud and AI problems for enterprise clients. Come do the best work of your career.",
    whyUsEyebrow: 'Why work with us',
    whyUsTitle: 'Analytics, taken seriously',
    whyUsDescription: "We invest in the people who build our clients' dashboards and data platforms — because the work only gets harder from here.",
    whyUs: [
      { icon: 'Rocket', title: 'Ship real platforms', description: 'Work on production systems for enterprise clients from day one — not internal tooling.' },
      { icon: 'GraduationCap', title: 'Deliberate growth', description: 'Certification sponsorship, conference budget and a technical ladder that actually promotes.' },
      { icon: 'UsersRound', title: 'Senior-led teams', description: "You're mentored by analysts and engineers who've run this stack in production, not just talked about it." },
      { icon: 'Globe2', title: 'Remote-friendly', description: 'Hybrid and remote roles across most of our practices, with async-first collaboration.' },
    ],
    benefitsEyebrow: 'Benefits',
    benefitsTitle: 'What you get, day one',
    benefits: [
      { icon: 'HeartPulse', label: 'Health insurance for you and your family' },
      { icon: 'Coins', label: 'Competitive salary + annual performance bonus' },
      { icon: 'Plane', label: 'Generous paid time off and flexible holidays' },
      { icon: 'Laptop', label: 'Latest hardware and a home-office stipend' },
      { icon: 'GraduationCap', label: 'Learning budget + certification reimbursement' },
      { icon: 'HandHeart', label: 'Parental leave and wellness support' },
    ],
    cultureEyebrow: 'Culture',
    cultureTitle: 'How we actually work',
    culturePoints: [
      'Async-first, documentation-heavy — meetings are the exception, not the default.',
      'Blameless postmortems: we fix the system, not point fingers.',
      'Every analyst and engineer ships to production — no ivory-tower architecture.',
      'Quarterly hack days and an internal conference for knowledge sharing.',
    ],
    cultureQuote:
      "The best engineering culture I've worked in — senior by default, opinionated about quality, and nobody pretends meetings are work.",
    cultureQuoteAttribution: '— Engineering team, KMG Technologies',
    openingsEyebrow: 'Open roles',
    openingsTitle: 'Current openings',
    noRoleTitle: "Don't see the right role?",
    noRoleDescription: "We're always meeting strong engineers. Reach out and tell us what you're great at.",
    noRoleButtonLabel: 'Get in touch',
  },
  'services.intro': {
    heroEyebrow: 'What we do',
    heroTitle: 'Business analytics services built for measurable outcomes',
    heroDescription:
      'From dashboards to predictive models — with cloud data platforms and applied AI in support — each engagement is delivered by senior analysts and engineers who stay until your team owns the outcome.',
    processEyebrow: 'How we work',
    processTitle: 'A simple, repeatable process',
    processDescription: 'Every engagement — regardless of scope — follows the same four-phase approach.',
    process: [
      { icon: 'Search', title: 'Discover', description: 'We assess your current state, constraints and goals.' },
      { icon: 'ClipboardList', title: 'Plan', description: 'A prioritized, costed roadmap with clear milestones.' },
      { icon: 'Rocket', title: 'Deliver', description: 'Senior engineers implement alongside your team.' },
      { icon: 'Handshake', title: 'Enable', description: 'Documentation and hands-on handover so you own it.' },
    ],
  },
  'contact.hero': {
    eyebrow: 'Get in touch',
    title: "Let's talk about your roadmap",
    description: "Tell us about your analytics, cloud or talent needs — we'll reply within one business day with next steps.",
  },
};
