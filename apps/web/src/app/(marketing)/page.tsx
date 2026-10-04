import type { Metadata } from 'next';

import { ALL_TECHNOLOGIES, COMPANY } from '@kmg/shared';

import { Container } from '@/components/layout/container';
import { Marquee } from '@/components/motion/marquee';
import { TechLogo } from '@/components/shared/tech-logo';
import { ContactCta } from '@/components/marketing';
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

      {/* Tech marquee ------------------------------------------------------ */}
      {settings.features.techMarquee ? (
        <div className="border-y py-8">
          <Container className="mb-5">
            <p className="text-muted-foreground text-center text-xs font-semibold tracking-[0.18em] uppercase">
              Technologies we engineer with
            </p>
          </Container>
          <Marquee speed={45}>
            {ALL_TECHNOLOGIES.slice(0, 18).map((tech) => (
              <div key={tech.slug} className="flex items-center gap-2.5">
                <TechLogo slug={tech.icon} name={tech.name} size={26} />
                <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">{tech.name}</span>
              </div>
            ))}
          </Marquee>
        </div>
      ) : null}

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
      <ContactCta />
    </>
  );
}
