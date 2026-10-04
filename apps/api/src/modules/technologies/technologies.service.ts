import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { technologyUpsertSchema, type Technology as TechnologyDto, type TechnologyCategory as TechnologyCategoryDto } from '@kmg/shared';
import type { z } from 'zod';
import { uniqueSlug } from '../../common/utils/slug.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { TechnologyCategoryUpsertData } from './technology-category.schema';

// `TechnologyUpsertInput` from `@kmg/shared` is `z.input` (pre-parse); the value in hand here
// has already been through `ZodValidationPipe`, so use the parsed `z.infer`/`z.output` shape.
export type TechnologyUpsertData = z.infer<typeof technologyUpsertSchema>;

type TechnologyRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  categoryId: string;
  order: number;
  category?: { name: string } | null;
};

const toTechnologyDto = (row: TechnologyRow): TechnologyDto => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  logoUrl: row.logoUrl,
  websiteUrl: row.websiteUrl,
  categoryId: row.categoryId,
  categoryName: row.category?.name,
  order: row.order,
});

@Injectable()
export class TechnologiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: categories with nested technologies, ordered. */
  async listPublic(): Promise<TechnologyCategoryDto[]> {
    const categories = await this.prisma.technologyCategory.findMany({
      orderBy: { order: 'asc' },
      include: { technologies: { orderBy: { order: 'asc' } } },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      order: category.order,
      technologies: category.technologies.map((tech) => toTechnologyDto({ ...tech, category: null })),
    }));
  }

  // ── Admin: categories ──────────────────────────────────────────────

  async listCategories(): Promise<TechnologyCategoryDto[]> {
    const categories = await this.prisma.technologyCategory.findMany({
      orderBy: { order: 'asc' },
      include: { technologies: { orderBy: { order: 'asc' } } },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      order: category.order,
      technologies: category.technologies.map((tech) => toTechnologyDto({ ...tech, category: null })),
    }));
  }

  async createCategory(input: TechnologyCategoryUpsertData): Promise<TechnologyCategoryDto> {
    const slug = await uniqueSlug(input.slug ?? input.name, (s) =>
      this.prisma.technologyCategory.count({ where: { slug: s } }).then((c) => c > 0),
    );
    const category = await this.prisma.technologyCategory.create({
      data: { name: input.name, slug, order: input.order ?? 0 },
    });
    return { id: category.id, name: category.name, slug: category.slug, order: category.order, technologies: [] };
  }

  async updateCategory(id: string, input: TechnologyCategoryUpsertData): Promise<TechnologyCategoryDto> {
    const existing = await this.prisma.technologyCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology category not found');

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug(input.slug, (s) =>
            this.prisma.technologyCategory.count({ where: { slug: s, NOT: { id } } }).then((c) => c > 0),
          )
        : existing.slug;

    const category = await this.prisma.technologyCategory.update({
      where: { id },
      data: { name: input.name, slug, order: input.order ?? existing.order },
      include: { technologies: { orderBy: { order: 'asc' } } },
    });
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      order: category.order,
      technologies: category.technologies.map((tech) => toTechnologyDto({ ...tech, category: null })),
    };
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await this.prisma.technologyCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology category not found');
    const used = await this.prisma.technology.count({ where: { categoryId: id } });
    if (used) throw new ConflictException('Category still has technologies assigned to it');
    await this.prisma.technologyCategory.delete({ where: { id } });
  }

  // ── Admin: technologies ─────────────────────────────────────────────

  async listTechnologies(): Promise<TechnologyDto[]> {
    const rows = await this.prisma.technology.findMany({
      orderBy: [{ categoryId: 'asc' }, { order: 'asc' }],
      include: { category: { select: { name: true } } },
    });
    return rows.map(toTechnologyDto);
  }

  async getTechnology(id: string): Promise<TechnologyDto> {
    const row = await this.prisma.technology.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Technology not found');
    return toTechnologyDto(row);
  }

  async createTechnology(input: TechnologyUpsertData): Promise<TechnologyDto> {
    const category = await this.prisma.technologyCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundException('Technology category not found');

    const slug = await uniqueSlug(input.slug ?? input.name, (s) =>
      this.prisma.technology.count({ where: { slug: s } }).then((c) => c > 0),
    );
    const row = await this.prisma.technology.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        categoryId: input.categoryId,
        order: input.order ?? 0,
      },
      include: { category: { select: { name: true } } },
    });
    return toTechnologyDto(row);
  }

  async updateTechnology(id: string, input: TechnologyUpsertData): Promise<TechnologyDto> {
    const existing = await this.prisma.technology.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology not found');

    if (input.categoryId !== existing.categoryId) {
      const category = await this.prisma.technologyCategory.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new NotFoundException('Technology category not found');
    }

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug(input.slug, (s) =>
            this.prisma.technology.count({ where: { slug: s, NOT: { id } } }).then((c) => c > 0),
          )
        : existing.slug;

    const row = await this.prisma.technology.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        categoryId: input.categoryId,
        order: input.order ?? existing.order,
      },
      include: { category: { select: { name: true } } },
    });
    return toTechnologyDto(row);
  }

  async deleteTechnology(id: string): Promise<void> {
    const existing = await this.prisma.technology.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology not found');
    await this.prisma.technology.delete({ where: { id } });
  }

  async reorderTechnologies(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.technology.update({ where: { id }, data: { order: index } })),
    );
  }
}
