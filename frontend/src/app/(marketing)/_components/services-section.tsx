import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import type { HomeServicesContent, Service } from '@kmg/shared';

import { Section } from '@/components/layout/section';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { ServiceCard } from '@/components/marketing';
import { Button } from '@/components/ui/button';

export function ServicesSection({ services, content }: { services: Service[]; content: HomeServicesContent }) {
  return (
    <Section
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
      action={
        <Button asChild variant="soft">
          <Link href="/services">
            All services <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.slice(0, 6).map((service) => (
          <StaggerItem key={service.slug}>
            <ServiceCard service={service} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
