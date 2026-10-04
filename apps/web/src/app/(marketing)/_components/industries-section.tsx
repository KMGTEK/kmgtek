import type { IndustriesContent } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { Card } from '@/components/ui/card';

/** Industries we serve — mirrors the anchors used on `/industries`. */
export function IndustriesSection({ content }: { content: IndustriesContent }) {
  const { eyebrow, title, description, items } = content;

  return (
    <Section variant="muted" eyebrow={eyebrow} title={title} description={description}>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((industry) => (
          <StaggerItem key={industry.slug}>
            <Card id={industry.slug} className="h-full gap-2 p-5">
              <span className="bg-ember-50 text-ember-700 dark:bg-ember-500/12 dark:text-ember-300 grid size-10 place-items-center rounded-xl">
                <DynamicIcon name={industry.icon} className="size-4.5" />
              </span>
              <h3 className="font-display mt-1 text-sm font-semibold">{industry.name}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{industry.description}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
