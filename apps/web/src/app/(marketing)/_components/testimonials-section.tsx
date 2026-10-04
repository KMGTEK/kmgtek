import type { Testimonial } from '@kmg/shared';

import { Container } from '@/components/layout/container';
import { Marquee } from '@/components/motion/marquee';
import { Reveal } from '@/components/motion/reveal';
import { TestimonialCard } from '@/components/marketing';

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (!testimonials.length) return null;
  return (
    <section className="section-y bg-muted/40">
      <Container>
        <Reveal>
          <div className="mb-10 max-w-2xl md:mb-14">
            <p className="text-primary-text dark:text-brand-300 text-xs font-semibold tracking-[0.16em] uppercase">
              Client testimonials
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Trusted by teams who ship
            </h2>
          </div>
        </Reveal>
      </Container>
      <Marquee speed={55} className="py-2">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </Marquee>
    </section>
  );
}
