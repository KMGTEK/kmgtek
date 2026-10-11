import { StarIcon } from 'lucide-react';
import Image from 'next/image';

import type { Testimonial } from '@kmg/shared';

import { Card } from '@/components/ui/card';
import { cn, initials } from '@/lib/utils';

export interface TestimonialCardProps {
  testimonial: Testimonial;
  className?: string;
}

export function TestimonialCard({ testimonial, className }: TestimonialCardProps) {
  return (
    <Card className={cn('h-full w-[22rem] shrink-0 gap-4 p-6', className)}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <StarIcon
            key={index}
            className={cn(
              'size-3.5',
              index < testimonial.rating ? 'fill-brand-500 text-brand-500' : 'fill-muted text-muted',
            )}
          />
        ))}
      </div>
      <p className="text-foreground text-sm leading-relaxed text-pretty">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="mt-auto flex items-center gap-3 pt-2">
        {testimonial.avatarUrl ? (
          <Image
            src={testimonial.avatarUrl}
            alt={testimonial.authorName}
            width={40}
            height={40}
            unoptimized
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300 grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold">
            {initials(testimonial.authorName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{testimonial.authorName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {[testimonial.authorTitle, testimonial.company].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>
    </Card>
  );
}
