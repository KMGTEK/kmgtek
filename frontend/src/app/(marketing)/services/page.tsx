import type { Metadata } from 'next';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ServiceCard } from '@/components/marketing';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { JsonLd } from '@/components/shared/json-ld';
import { Card } from '@/components/ui/card';
import { getContentBlock, getServices } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Services',
  description:
    'Business analytics consulting practices, with cloud data platforms and applied AI as supporting capabilities — delivered by senior analysts and engineers.',
  path: '/services',
});

export default async function ServicesPage() {
  const [services, content] = await Promise.all([getServices(), getContentBlock('services.intro')]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
        ])}
      />

      <PageHero
        eyebrow={content.heroEyebrow}
        title={content.heroTitle}
        description={content.heroDescription}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Services' }]}
      />

      <Section>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <StaggerItem key={service.slug}>
              <ServiceCard service={service} />
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section
        variant="muted"
        eyebrow={content.processEyebrow}
        title={content.processTitle}
        description={content.processDescription}
      >
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {content.process.map((step, index) => (
            <StaggerItem key={step.title}>
              <Card className="h-full gap-2.5 p-6">
                <div className="flex items-center justify-between">
                  <DynamicIcon name={step.icon} className="text-primary-text dark:text-brand-300 size-6" aria-hidden />
                  <span className="text-muted-foreground font-display text-2xl font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display mt-1 text-base font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>
    </>
  );
}
