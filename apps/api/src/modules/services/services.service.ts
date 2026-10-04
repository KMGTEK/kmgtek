import { Injectable, NotFoundException } from '@nestjs/common';
import { serviceUpsertSchema, type Service as ServiceDto } from '@kmg/shared';
import type { z } from 'zod';
import { uniqueSlug } from '../../common/utils/slug.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// `ServiceUpsertInput` from `@kmg/shared` is `z.input` (pre-parse; e.g. `order: string | number
// | undefined`). `ZodValidationPipe` has already parsed the body by the time it reaches this
// service, so the value in hand is the *output* shape — use `z.infer`/`z.output` instead.
export type ServiceUpsertData = z.infer<typeof serviceUpsertSchema>;

const SERVICE_INCLUDE = {
  technologies: {
    include: { technology: { select: { id: true, name: true, slug: true, logoUrl: true } } },
  },
} as const;

type ServiceRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  overview: string;
  icon: string;
  benefits: unknown;
  process: unknown;
  faqs: unknown;
  order: number;
  seoTitle: string | null;
  seoDescription: string | null;
  technologies: { technology: { id: string; name: string; slug: string; logoUrl: string | null } }[];
};

const toDto = (row: ServiceRow): ServiceDto => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  shortDescription: row.shortDescription,
  overview: row.overview,
  icon: row.icon,
  benefits: (row.benefits as ServiceDto['benefits']) ?? [],
  process: (row.process as ServiceDto['process']) ?? [],
  faqs: (row.faqs as ServiceDto['faqs']) ?? [],
  technologies: row.technologies.map((t) => t.technology),
  order: row.order,
  seoTitle: row.seoTitle,
  seoDescription: row.seoDescription,
});

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ───────────────────────────────────────────────────────────

  async listPublic(): Promise<ServiceDto[]> {
    const rows = await this.prisma.service.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: SERVICE_INCLUDE,
    });
    return rows.map(toDto);
  }

  async getPublicBySlug(slug: string): Promise<ServiceDto> {
    const row = await this.prisma.service.findFirst({
      where: { slug, published: true },
      include: SERVICE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Service not found');
    return toDto(row);
  }

  // ── Admin ────────────────────────────────────────────────────────────

  async listAdmin(): Promise<ServiceDto[]> {
    const rows = await this.prisma.service.findMany({ orderBy: { order: 'asc' }, include: SERVICE_INCLUDE });
    return rows.map(toDto);
  }

  async getAdmin(id: string): Promise<ServiceDto> {
    const row = await this.prisma.service.findUnique({ where: { id }, include: SERVICE_INCLUDE });
    if (!row) throw new NotFoundException('Service not found');
    return toDto(row);
  }

  async create(input: ServiceUpsertData): Promise<ServiceDto> {
    const slug = await uniqueSlug(input.slug ?? input.title, (s) =>
      this.prisma.service.count({ where: { slug: s } }).then((c) => c > 0),
    );
    const row = await this.prisma.service.create({
      data: {
        slug,
        title: input.title,
        shortDescription: input.shortDescription,
        overview: input.overview,
        icon: input.icon,
        benefits: (input.benefits ?? []) as object,
        process: (input.process ?? []) as object,
        faqs: (input.faqs ?? []) as object,
        order: input.order ?? 0,
        published: input.published ?? true,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        technologies: { create: (input.technologyIds ?? []).map((technologyId) => ({ technologyId })) },
      },
      include: SERVICE_INCLUDE,
    });
    return toDto(row);
  }

  async update(id: string, input: ServiceUpsertData): Promise<ServiceDto> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug(input.slug, (s) =>
            this.prisma.service.count({ where: { slug: s, NOT: { id } } }).then((c) => c > 0),
          )
        : existing.slug;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.serviceTechnology.deleteMany({ where: { serviceId: id } });
      return tx.service.update({
        where: { id },
        data: {
          slug,
          title: input.title,
          shortDescription: input.shortDescription,
          overview: input.overview,
          icon: input.icon,
          benefits: (input.benefits ?? []) as object,
          process: (input.process ?? []) as object,
          faqs: (input.faqs ?? []) as object,
          order: input.order ?? existing.order,
          published: input.published ?? existing.published,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          technologies: { create: (input.technologyIds ?? []).map((technologyId) => ({ technologyId })) },
        },
        include: SERVICE_INCLUDE,
      });
    });
    return toDto(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    await this.prisma.service.delete({ where: { id } });
  }

  async reorder(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.service.update({ where: { id }, data: { order: index } })),
    );
  }
}
