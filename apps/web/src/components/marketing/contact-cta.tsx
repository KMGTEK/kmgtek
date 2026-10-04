import { ArrowRightIcon, PhoneIcon } from 'lucide-react';
import Link from 'next/link';

import { COMPANY } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ContactCtaProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Reusable bottom-of-page contact CTA band. */
export function ContactCta({
  title = "Let's build something that scales",
  description = 'Tell us about your roadmap — cloud, DevOps, platform or talent. We reply within one business day.',
  className,
}: ContactCtaProps) {
  return (
    <Section variant="dark" spacing="lg" className={cn(className)}>
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
            <p className="text-ink-400 mt-3 text-lg text-pretty">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="xl" variant="gradient">
              <Link href="/contact">
                Book a Consultation <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-ink-700 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={COMPANY.phoneHref}>
                <PhoneIcon className="size-4" />
                {COMPANY.phone}
              </a>
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
