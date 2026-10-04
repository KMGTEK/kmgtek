import type { StatsContent } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { AnimatedCounter } from '@/components/motion/animated-counter';

export function StatsSection({ content }: { content: StatsContent }) {
  return (
    <Section variant="dark" spacing="sm">
      <dl className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
        {content.items.map((stat) => (
          <div key={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            <dd className="font-display gradient-text text-4xl font-semibold tracking-tight">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </dd>
            <p className="text-ink-400 mt-2 text-sm">{stat.label}</p>
          </div>
        ))}
      </dl>
    </Section>
  );
}
