import { Injectable, NotFoundException } from '@nestjs/common';
import { caseStudyUpsertSchema, type CaseStudy as CaseStudyDto, type Paginated } from '@kmg/shared';
import type { z } from 'zod';
import { buildMeta, parsePagination } from '../../common/utils/pagination.util';
import { uniqueSlug } from '../../common/utils/slug.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

// `CaseStudyUpsertInput` from `@kmg/shared` is `z.input` (pre-parse); `ZodValidationPipe` has
// already parsed the body by the time it reaches this service — use the `z.infer`/`z.output`
// shape instead.
export type CaseStudyUpsertData = z.infer<typeof caseStudyUpsertSchema>;

const CASE_STUDY_INCLUDE = {
  images: { orderBy: { order: 'asc' as const } },
  technologies: {
    include: { technology: { select: { id: true, name: true, slug: true, logoUrl: true } } },
  },
} as const;

type CaseStudyRow = {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  industry: string;
  summary: string;
  challenge: string;
  solution: string;
  architecture: string | null;
  results: string;
  metrics: unknown;
  coverImageUrl: string | null;
  featured: boolean;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: { id: string; url: string; caption: string | null }[];
  technologies: { technology: { id: string; name: string; slug: string; logoUrl: string | null } }[];
};

const toDto = (row: CaseStudyRow): CaseStudyDto => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  clientName: row.clientName,
  industry: row.industry,
  summary: row.summary,
  challenge: row.challenge,
  solution: row.solution,
  architecture: row.architecture,
  results: row.results,
  metrics: (row.metrics as CaseStudyDto['metrics']) ?? [],
  coverImageUrl: row.coverImageUrl,
  images: row.images.map((img) => ({ id: img.id, url: img.url, caption: img.caption })),
  technologies: row.technologies.map((t) => t.technology),
  featured: row.featured,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  seoTitle: row.seoTitle,
  seoDescription: row.seoDescription,
});

export interface CaseStudiesListQuery {
  page?: number;
  pageSize?: number;
  industry?: string;
  featured?: boolean;
}

@Injectable()
export class CaseStudiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Public ───────────────────────────────────────────────────────────

  async listPublic(query: CaseStudiesListQuery): Promise<Paginated<CaseStudyDto>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where = {
      published: true,
      ...(query.industry ? { industry: query.industry } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.caseStudy.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        include: CASE_STUDY_INCLUDE,
      }),
      this.prisma.caseStudy.count({ where }),
    ]);
    return { data: rows.map(toDto), meta: buildMeta(total, page, pageSize) };
  }

  async getPublicBySlug(slug: string): Promise<CaseStudyDto> {
    const row = await this.prisma.caseStudy.findFirst({
      where: { slug, published: true },
      include: CASE_STUDY_INCLUDE,
    });
    if (!row) throw new NotFoundException('Case study not found');
    return toDto(row);
  }

  // ── Admin ────────────────────────────────────────────────────────────

  async listAdmin(): Promise<CaseStudyDto[]> {
    const rows = await this.prisma.caseStudy.findMany({
      orderBy: { createdAt: 'desc' },
      include: CASE_STUDY_INCLUDE,
    });
    return rows.map(toDto);
  }

  async getAdmin(id: string): Promise<CaseStudyDto> {
    const row = await this.prisma.caseStudy.findUnique({ where: { id }, include: CASE_STUDY_INCLUDE });
    if (!row) throw new NotFoundException('Case study not found');
    return toDto(row);
  }

  async create(input: CaseStudyUpsertData): Promise<CaseStudyDto> {
    const slug = await uniqueSlug(input.slug ?? input.title, (s) =>
      this.prisma.caseStudy.count({ where: { slug: s } }).then((c) => c > 0),
    );
    const published = input.published ?? true;
    const row = await this.prisma.caseStudy.create({
      data: {
        slug,
        title: input.title,
        clientName: input.clientName ?? null,
        industry: input.industry,
        summary: input.summary,
        challenge: input.challenge,
        solution: input.solution,
        architecture: input.architecture ?? null,
        results: input.results,
        metrics: (input.metrics ?? []) as object,
        coverImageUrl: input.coverImageUrl ?? null,
        featured: input.featured ?? false,
        published,
        publishedAt: published ? new Date() : null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        images: {
          create: (input.images ?? []).map((image, index) => ({
            url: image.url,
            caption: image.caption ?? null,
            order: index,
          })),
        },
        technologies: { create: (input.technologyIds ?? []).map((technologyId) => ({ technologyId })) },
      },
      include: CASE_STUDY_INCLUDE,
    });
    return toDto(row);
  }

  async update(id: string, input: CaseStudyUpsertData): Promise<CaseStudyDto> {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Case study not found');

    const slug =
      input.slug && input.slug !== existing.slug
        ? await uniqueSlug(input.slug, (s) =>
            this.prisma.caseStudy.count({ where: { slug: s, NOT: { id } } }).then((c) => c > 0),
          )
        : existing.slug;

    const published = input.published ?? existing.published;
    // Set publishedAt the first time the record flips from unpublished to published.
    const publishedAt = published ? (existing.publishedAt ?? new Date()) : existing.publishedAt;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.caseStudyImage.deleteMany({ where: { caseStudyId: id } });
      await tx.caseStudyTechnology.deleteMany({ where: { caseStudyId: id } });
      return tx.caseStudy.update({
        where: { id },
        data: {
          slug,
          title: input.title,
          clientName: input.clientName ?? null,
          industry: input.industry,
          summary: input.summary,
          challenge: input.challenge,
          solution: input.solution,
          architecture: input.architecture ?? null,
          results: input.results,
          metrics: (input.metrics ?? []) as object,
          coverImageUrl: input.coverImageUrl ?? null,
          featured: input.featured ?? existing.featured,
          published,
          publishedAt,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          images: {
            create: (input.images ?? []).map((image, index) => ({
              url: image.url,
              caption: image.caption ?? null,
              order: index,
            })),
          },
          technologies: { create: (input.technologyIds ?? []).map((technologyId) => ({ technologyId })) },
        },
        include: CASE_STUDY_INCLUDE,
      });
    });
    return toDto(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Case study not found');
    await this.prisma.caseStudy.delete({ where: { id } });
  }
}
