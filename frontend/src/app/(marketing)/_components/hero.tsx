import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';

import type { HeroContent } from '@kmg/shared';

import { Container } from '@/components/layout/container';
import { FloatingIcons } from '@/components/motion/floating-icons';
import { Reveal } from '@/components/motion/reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** Home page hero: headline, gradient CTA, decorative floating tech icons. */
export function Hero({ content }: { content: HeroContent }) {
  const { eyebrow, headline, headlineHighlight, headlineSuffix, description, trustPoints, primaryCtaLabel, secondaryCtaLabel } =
    content;

  return (
    <section className="bg-hero-glow relative isolate overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 -z-10" />
      <FloatingIcons className="-z-10 hidden lg:block" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Badge variant="outline" className="border-brand-400/70 bg-brand-100/80 dark:border-brand-300/60 dark:bg-brand-500/10">
              <span className="bg-ember-500 mr-1.5 inline-block size-1.5 rounded-full" aria-hidden />
              {eyebrow}
            </Badge>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-display mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {headline}{' '}
              <span className="gradient-text">{headlineHighlight}</span>
              {headlineSuffix}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
              {description}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="xl" variant="gradient">
                <Link href="/contact">
                  {primaryCtaLabel} <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/services">{secondaryCtaLabel}</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="text-muted-foreground mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              {trustPoints.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="text-brand-600 dark:text-brand-400 size-4" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
