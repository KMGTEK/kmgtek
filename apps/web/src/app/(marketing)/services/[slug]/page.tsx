import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Section } from '@/components/layout/section';
import { PageHero } from '@/components/layout/page-hero';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { JsonLd } from '@/components/shared/json-ld';
import { TechLogo } from '@/components/shared/tech-logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { getService, getServices } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, serviceJsonLd } from '@/lib/seo';

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return buildMetadata({ title: 'Service', path: `/services/${slug}` });
  return buildMetadata({
    title: service.seoTitle ?? service.title,
    description: service.seoDescription ?? service.shortDescription,
    path: `/services/${service.slug}`,
    type: 'website',
  });
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', href: '/' },
            { name: 'Services', href: '/services' },
            { name: service.title, href: `/services/${service.slug}` },
          ]),
          serviceJsonLd(service),
          ...(service.faqs.length ? [faqJsonLd(service.faqs)] : []),
        ]}
      />

      <PageHero
        eyebrow="Service"
        title={service.title}
        description={service.shortDescription}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: service.title },
        ]}
      >
        <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 inline-grid size-12 place-items-center rounded-xl">
          <DynamicIcon name={service.icon} className="size-6" />
        </span>
      </PageHero>

      {/* Overview ------------------------------------------------------------ */}
      <Section eyebrow="Overview" title="What this engagement covers">
        <Reveal>
          <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed text-pretty">{service.overview}</p>
        </Reveal>
      </Section>

      {/* Benefits -------------------------------------------------------------- */}
      {service.benefits.length ? (
        <Section variant="muted" eyebrow="Benefits" title="Why clients choose this">
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {service.benefits.map((benefit) => (
              <StaggerItem key={benefit.title}>
                <Card className="h-full gap-2.5 p-6">
                  <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-10 place-items-center rounded-xl">
                    <DynamicIcon name={benefit.icon ?? 'Sparkles'} className="size-4.5" />
                  </span>
                  <h3 className="font-display mt-1 text-base font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      {/* Process ---------------------------------------------------------------- */}
      {service.process.length ? (
        <Section eyebrow="Our process" title="How we deliver it">
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {service.process.map((step, index) => (
              <Reveal key={step.title} as="li" delay={index * 0.06}>
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-to-r from-brand-600 to-ember-600 grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  {index < service.process.length - 1 ? (
                    <span className="bg-border hidden h-px flex-1 sm:block" aria-hidden />
                  ) : null}
                </div>
                <h3 className="font-display mt-3 text-base font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{step.description}</p>
              </Reveal>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* Technologies -------------------------------------------------------------- */}
      {service.technologies.length ? (
        <Section variant="muted" eyebrow="Toolchain" title="Technologies used">
          <Stagger className="flex flex-wrap gap-3">
            {service.technologies.map((tech) => (
              <StaggerItem key={tech.slug}>
                <a
                  href={`/technologies#${tech.slug}`}
                  className="focus-ring hover:border-brand-300 hover:shadow-soft bg-card flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
                >
                  <TechLogo slug={tech.logoUrl ?? tech.slug} name={tech.name} size={20} />
                  {tech.name}
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>
      ) : null}

      {/* FAQs ---------------------------------------------------------------------- */}
      {service.faqs.length ? (
        <Section size="prose" eyebrow="FAQs" title="Frequently asked questions">
          <Accordion type="single" collapsible className="w-full">
            {service.faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="font-display text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>
      ) : null}
    </>
  );
}
