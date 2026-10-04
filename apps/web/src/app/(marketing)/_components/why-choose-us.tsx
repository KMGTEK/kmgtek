import type { WhyChooseUsContent } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { Card } from '@/components/ui/card';

/** "Why choose us" differentiators. */
export function WhyChooseUs({ content }: { content: WhyChooseUsContent }) {
  const { eyebrow, title, description, reasons } = content;

  return (
    <Section eyebrow={eyebrow} title={title} description={description}>
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((reason) => (
          <StaggerItem key={reason.title}>
            <Card className="h-full gap-2.5 p-6">
              <DynamicIcon name={reason.icon} className="text-primary-text dark:text-brand-300 size-6" aria-hidden />
              <h3 className="font-display mt-1 text-base font-semibold">{reason.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{reason.description}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
