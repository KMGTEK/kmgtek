import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';

import type { CompanyIntroContent } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Company introduction — who KMG is and the pillars of the practice. */
export function CompanyIntro({ content }: { content: CompanyIntroContent }) {
  const { eyebrow, title, description, pillars } = content;

  return (
    <Section eyebrow={eyebrow} title={title} description={description}>
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => (
          <StaggerItem key={pillar.title}>
            <Card className="h-full gap-2.5 p-6">
              <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-10 place-items-center rounded-xl">
                <SparklesIcon className="size-4.5" />
              </span>
              <h3 className="font-display mt-1 text-base font-semibold">{pillar.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal delay={0.1}>
        <div className="mt-8 text-center">
          <Button asChild variant="soft">
            <Link href="/about">
              More about KMG Technologies <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </Section>
  );
}
