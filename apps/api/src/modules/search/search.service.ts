import { Injectable } from '@nestjs/common';
import type { SearchResults } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 5): Promise<SearchResults> {
    const insensitiveContains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

    const [jobs, services, technologies] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          OR: [{ title: insensitiveContains(q) }, { skills: { has: q } }],
        },
        select: { id: true, slug: true, title: true, location: true, workMode: true },
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.service.findMany({
        where: {
          published: true,
          OR: [{ title: insensitiveContains(q) }, { shortDescription: insensitiveContains(q) }],
        },
        select: { id: true, slug: true, title: true, shortDescription: true },
        take: limit,
        orderBy: { order: 'asc' },
      }),
      this.prisma.technology.findMany({
        where: { name: insensitiveContains(q) },
        select: { id: true, slug: true, name: true, category: { select: { name: true } } },
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      jobs,
      services,
      technologies: technologies.map((t) => ({ id: t.id, slug: t.slug, name: t.name, categoryName: t.category.name })),
    };
  }
}
