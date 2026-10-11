import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface SitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface SitemapResult {
  services: SitemapEntry[];
  jobs: SitemapEntry[];
  caseStudies: SitemapEntry[];
}

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async build(): Promise<SitemapResult> {
    const [services, jobs, caseStudies] = await Promise.all([
      this.prisma.service.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.job.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.caseStudy.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const toEntry = (row: { slug: string; updatedAt: Date }): SitemapEntry => ({
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
    });

    return {
      services: services.map(toEntry),
      jobs: jobs.map(toEntry),
      caseStudies: caseStudies.map(toEntry),
    };
  }
}
