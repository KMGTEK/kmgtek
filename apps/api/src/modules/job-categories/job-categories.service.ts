import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobCategory } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { slugify, uniqueSlug } from '../../common/utils/slug.util';

export interface JobCategoryInput {
  name: string;
  slug?: string;
}

@Injectable()
export class JobCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All departments with a count of jobs attached to each (used by admin + facets). */
  async list(): Promise<JobCategory[]> {
    const rows = await this.prisma.jobCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { jobs: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      jobCount: row._count.jobs,
    }));
  }

  async get(id: string) {
    const row = await this.prisma.jobCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Department not found');
    return row;
  }

  async create(input: JobCategoryInput): Promise<JobCategory> {
    const slug = input.slug
      ? slugify(input.slug)
      : await uniqueSlug(input.name, (s) => this.prisma.jobCategory.count({ where: { slug: s } }).then((c) => c > 0));

    const existing = await this.prisma.jobCategory.findUnique({ where: { name: input.name } });
    if (existing) throw new BadRequestException('A department with this name already exists');

    const row = await this.prisma.jobCategory.create({ data: { name: input.name, slug } });
    return { id: row.id, name: row.name, slug: row.slug, jobCount: 0 };
  }

  async update(id: string, input: Partial<JobCategoryInput>): Promise<JobCategory> {
    await this.get(id);
    const row = await this.prisma.jobCategory.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.slug ? { slug: slugify(input.slug) } : {}),
      },
      include: { _count: { select: { jobs: true } } },
    });
    return { id: row.id, name: row.name, slug: row.slug, jobCount: row._count.jobs };
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.prisma.jobCategory.delete({ where: { id } });
  }
}
