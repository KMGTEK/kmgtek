import type { Metadata } from 'next';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ContactCta } from '@/components/marketing';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { JsonLd } from '@/components/shared/json-ld';
import { Card } from '@/components/ui/card';
import { getContentBlock } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Industries',
  description: 'Deep domain context paired with modern engineering practice, across regulated and high-growth industries.',
  path: '/industries',
});

export default async function IndustriesPage() {
  const industries = await getContentBlock('site.industries');

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Industries', href: '/industries' },
        ])}
      />

      <PageHero
        eyebrow={industries.eyebrow}
        title={industries.title}
        description={industries.description}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Industries' }]}
      />

      <Section>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {industries.items.map((industry) => (
            <StaggerItem key={industry.slug}>
              <Card id={industry.slug} className="h-full gap-3 p-6">
                <span className="bg-ember-50 text-ember-700 dark:bg-ember-500/12 dark:text-ember-300 grid size-11 place-items-center rounded-xl">
                  <DynamicIcon name={industry.icon} className="size-5" />
                </span>
                <h3 className="font-display mt-1 text-lg font-semibold">{industry.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{industry.description}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <ContactCta />
    </>
  );
}
