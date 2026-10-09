import type { Metadata } from 'next';

import { COMPANY } from '@kmg/shared';

import { getContentBlocks, getJobs, getServices, getSettings, getTechnologies, getTestimonials } from '@/lib/api/public';
import { buildMetadata } from '@/lib/seo';

import { CompanyIntro } from './_components/company-intro';
import { Hero } from './_components/hero';
import { IndustriesSection } from './_components/industries-section';
import { JobsSection } from './_components/jobs-section';
import { ServicesSection } from './_components/services-section';
import { StatsSection } from './_components/stats-section';
import { TechnologiesPreview } from './_components/technologies-preview';
import { TestimonialsSection } from './_components/testimonials-section';
import { WhyChooseUs } from './_components/why-choose-us';

export const metadata: Metadata = buildMetadata({
  title: undefined,
  description: COMPANY.description,
  path: '/',
});

export default async function HomePage() {
  const [services, technologies, testimonials, jobs, content, settings] = await Promise.all([
    getServices(),
    getTechnologies(),
    getTestimonials(true),
    getJobs({ pageSize: 6, sort: 'newest' }),
    getContentBlocks(),
    getSettings(),
  ]);

  return (
    <>
      <Hero content={content['home.hero']} />

      {settings.features.companyIntro ? <CompanyIntro content={content['home.company_intro']} /> : null}
      <ServicesSection services={services} content={content['home.services']} />
      {settings.features.industries ? <IndustriesSection content={content['site.industries']} /> : null}
      {settings.features.whyChooseUs ? <WhyChooseUs content={content['home.why_choose_us']} /> : null}
      {settings.features.toolchain ? (
        <TechnologiesPreview categories={technologies} content={content['home.toolchain']} />
      ) : null}
      {settings.features.testimonials ? <TestimonialsSection testimonials={testimonials} /> : null}
      {settings.features.stats ? <StatsSection content={content['home.stats']} /> : null}
      {settings.features.jobsSection ? <JobsSection jobs={jobs.data} /> : null}
    </>
  );
}
