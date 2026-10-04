import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import type { Service } from '@kmg/shared';

import { DynamicIcon } from '@/components/shared/dynamic-icon';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ServiceCardProps {
  service: Pick<Service, 'slug' | 'title' | 'shortDescription' | 'icon'>;
  className?: string;
}

/** Service grid item — used on the home page and `/services`. */
export function ServiceCard({ service, className }: ServiceCardProps) {
  return (
    <Link href={`/services/${service.slug}`} className="focus-ring group block h-full rounded-xl">
      <Card
        className={cn(
          'hover:border-brand-300 hover:shadow-lift h-full gap-3 p-6 transition-all duration-300',
          className,
        )}
      >
        <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-11 place-items-center rounded-xl">
          <DynamicIcon name={service.icon} className="size-5" />
        </span>
        <h3 className="font-display mt-2 text-lg font-semibold">{service.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{service.shortDescription}</p>
        <span className="text-primary-text dark:text-brand-300 mt-1 inline-flex items-center gap-1 text-sm font-medium">
          Learn more
          <ArrowRightIcon className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
      </Card>
    </Link>
  );
}
