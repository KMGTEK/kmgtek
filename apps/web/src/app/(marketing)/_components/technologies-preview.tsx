import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import type { TechnologyCategory, ToolchainContent } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { TechLogo } from '@/components/shared/tech-logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Compact technologies preview, grouped by category, linking to the full `/technologies` page. */
export function TechnologiesPreview({
  categories,
  content,
}: {
  categories: TechnologyCategory[];
  content: ToolchainContent;
}) {
  return (
    <Section
      variant="muted"
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      action={
        <Button asChild variant="soft">
          <Link href="/technologies">
            All technologies <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 8).map((category) => (
          <StaggerItem key={category.slug}>
            <Card className="h-full gap-3 p-5">
              <h3 className="font-display text-sm font-semibold">{category.name}</h3>
              <div className="flex flex-wrap gap-2">
                {category.technologies.slice(0, 6).map((tech) => (
                  <span
                    key={tech.slug}
                    title={tech.name}
                    className="bg-muted grid size-9 place-items-center rounded-lg"
                  >
                    <TechLogo slug={tech.logoUrl ?? tech.slug} name={tech.name} size={20} />
                  </span>
                ))}
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
