import { Injectable, NotFoundException } from '@nestjs/common';
import { testimonialUpsertSchema, type Testimonial as TestimonialDto } from '@kmg/shared';
import type { z } from 'zod';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// `TestimonialUpsertInput` from `@kmg/shared` is `z.input` (pre-parse); `ZodValidationPipe` has
// already parsed the body by the time it reaches this service — use the `z.infer`/`z.output`
// shape instead.
export type TestimonialUpsertData = z.infer<typeof testimonialUpsertSchema>;

type TestimonialRow = {
  id: string;
  authorName: string;
  authorTitle: string | null;
  company: string | null;
  avatarUrl: string | null;
  quote: string;
  rating: number;
  featured: boolean;
  published: boolean;
  order: number;
};

const toDto = (row: TestimonialRow): TestimonialDto => ({
  id: row.id,
  authorName: row.authorName,
  authorTitle: row.authorTitle,
  company: row.company,
  avatarUrl: row.avatarUrl,
  quote: row.quote,
  rating: row.rating,
  featured: row.featured,
  published: row.published,
  order: row.order,
});

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(featured?: boolean): Promise<TestimonialDto[]> {
    const rows = await this.prisma.testimonial.findMany({
      where: { published: true, ...(featured !== undefined ? { featured } : {}) },
      orderBy: { order: 'asc' },
    });
    return rows.map(toDto);
  }

  async listAdmin(): Promise<TestimonialDto[]> {
    const rows = await this.prisma.testimonial.findMany({ orderBy: { order: 'asc' } });
    return rows.map(toDto);
  }

  async get(id: string): Promise<TestimonialDto> {
    const row = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Testimonial not found');
    return toDto(row);
  }

  async create(input: TestimonialUpsertData): Promise<TestimonialDto> {
    const row = await this.prisma.testimonial.create({
      data: {
        authorName: input.authorName,
        authorTitle: input.authorTitle ?? null,
        company: input.company ?? null,
        avatarUrl: input.avatarUrl ?? null,
        quote: input.quote,
        rating: input.rating ?? 5,
        featured: input.featured ?? false,
        published: input.published ?? true,
        order: input.order ?? 0,
      },
    });
    return toDto(row);
  }

  async update(id: string, input: TestimonialUpsertData): Promise<TestimonialDto> {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    const row = await this.prisma.testimonial.update({
      where: { id },
      data: {
        authorName: input.authorName,
        authorTitle: input.authorTitle ?? null,
        company: input.company ?? null,
        avatarUrl: input.avatarUrl ?? null,
        quote: input.quote,
        rating: input.rating ?? existing.rating,
        featured: input.featured ?? existing.featured,
        published: input.published ?? existing.published,
        order: input.order ?? existing.order,
      },
    });
    return toDto(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    await this.prisma.testimonial.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.testimonial.update({ where: { id }, data: { order: index } })),
    );
  }
}
