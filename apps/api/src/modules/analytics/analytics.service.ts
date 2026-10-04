import { Injectable } from '@nestjs/common';
import type { AnalyticsReport } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const DAY_MS = 86_400_000;
const dayKey = (date: Date): string => date.toISOString().slice(0, 10);
const pct = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0;

export interface AnalyticsQuery {
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async report(query: AnalyticsQuery): Promise<AnalyticsReport> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * DAY_MS);

    const [pageViews, applications, joinedApplications, interviewCount, activeJobs, leads, devicesGroup, referrersGroup] =
      await Promise.all([
        this.prisma.pageView.findMany({ where: { createdAt: { gte: from, lte: to } } }),
        this.prisma.jobApplication.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
        this.prisma.jobApplication.findMany({
          where: { deletedAt: null, status: 'JOINED', hiredAt: { not: null }, createdAt: { gte: from, lte: to } },
          select: { createdAt: true, hiredAt: true },
        }),
        this.prisma.interview.count({ where: { createdAt: { gte: from, lte: to } } }),
        this.prisma.job.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
        this.prisma.contactLead.count({ where: { deletedAt: null, createdAt: { gte: from, lte: to } } }),
        this.prisma.pageView.groupBy({ by: ['device'], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
        this.prisma.pageView.groupBy({
          by: ['referrer'],
          where: { createdAt: { gte: from, lte: to } },
          _count: { _all: true },
          orderBy: { _count: { referrer: 'desc' } },
          take: 10,
        }),
      ]);

    const applicantSourceGroups = await this.prisma.jobApplication.groupBy({
      by: ['source'],
      where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });

    const dayVisitors = new Map<string, Set<string>>();
    const dayPageViews = new Map<string, number>();
    const pathCounts = new Map<string, number>();
    for (let cursor = new Date(from); cursor <= to; cursor = new Date(cursor.getTime() + DAY_MS)) {
      const key = dayKey(cursor);
      dayVisitors.set(key, new Set());
      dayPageViews.set(key, 0);
    }
    for (const view of pageViews) {
      const key = dayKey(view.createdAt);
      if (!dayVisitors.has(key)) dayVisitors.set(key, new Set());
      dayVisitors.get(key)?.add(view.sessionId);
      dayPageViews.set(key, (dayPageViews.get(key) ?? 0) + 1);
      pathCounts.set(view.path, (pathCounts.get(view.path) ?? 0) + 1);
    }

    const uniqueVisitors = new Set(pageViews.map((v) => v.sessionId)).size;
    const avgTimeToHireDays =
      joinedApplications.length > 0
        ? Math.round(
            (joinedApplications.reduce((sum, app) => sum + (app.hiredAt!.getTime() - app.createdAt.getTime()), 0) /
              joinedApplications.length /
              DAY_MS) *
              10,
          ) / 10
        : 0;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      visitors: [...dayVisitors.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, sessions]) => ({ date, value: sessions.size })),
      pageViews: [...dayPageViews.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })),
      totals: {
        visitors: uniqueVisitors,
        pageViews: pageViews.length,
        leads,
        leadConversionRate: pct(leads, uniqueVisitors),
        applications,
        activeJobs,
        interviewConversionRate: pct(interviewCount, applications),
        avgTimeToHireDays,
      },
      topPages: [...pathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })),
      applicantSources: applicantSourceGroups.map((g) => ({ source: g.source ?? 'unknown', count: g._count._all })),
      devices: devicesGroup.map((g) => ({ device: (g.device ?? 'other') as AnalyticsReport['devices'][number]['device'], count: g._count._all })),
      referrers: referrersGroup.map((g) => ({ referrer: g.referrer ?? 'direct', count: g._count._all })),
    };
  }
}
