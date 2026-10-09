import type { Metadata } from 'next';

import { PageHero } from '@/components/layout/page-hero';
import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { JsonLd } from '@/components/shared/json-ld';
import { TechLogo } from '@/components/shared/tech-logo';
import { Card } from '@/components/ui/card';
import { getTechnologies } from '@/lib/api/public';
import { breadcrumbJsonLd, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Technologies',
  description:
    'Cloud, containers, CI/CD, infrastructure as code, configuration management, programming, monitoring and security tooling our engineers work with every day.',
  path: '/technologies',
});

export default async function TechnologiesPage() {
  const categories = await getTechnologies();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'Technologies', href: '/technologies' },
        ])}
      />

      <PageHero
        eyebrow="Toolchain"
        title="Technologies we engineer with"
        description="We are tool-agnostic by design — we recommend what fits your team and constraints, not what we happen to know best."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Technologies' }]}
      />

      <Section>
        <div className="space-y-14">
          {categories.map((category) => (
            <div key={category.slug} id={category.slug}>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{category.name}</h2>
              <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.technologies.map((tech) => (
                  <StaggerItem key={tech.slug} id={tech.slug}>
                    <Card className="h-full flex-row items-start gap-3 p-5">
                      <span className="bg-muted grid size-11 shrink-0 place-items-center rounded-lg">
                        <TechLogo slug={tech.logoUrl ?? tech.slug} name={tech.name} size={26} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold">{tech.name}</p>
                        {tech.description ? (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{tech.description}</p>
                        ) : null}
                        {tech.websiteUrl ? (
                          <a
                            href={tech.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-text dark:text-brand-300 mt-1.5 inline-block text-xs font-medium hover:underline"
                          >
                            Learn more ↗
                          </a>
                        ) : null}
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
