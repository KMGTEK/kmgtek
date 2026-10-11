import { Injectable } from '@nestjs/common';
import { APPLICATION_PIPELINE, type DashboardCharts, type DashboardSummary } from '@kmg/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const DAY_MS = 86_400_000;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalLeads,
      newLeads,
      unreadMessages,
      totalJobs,
      activeJobs,
      applicationsThisMonth,
      interviewsScheduled,
      distinctApplicants,
      visitorSessions,
    ] = await Promise.all([
      this.prisma.contactLead.count({ where: { deletedAt: null } }),
      this.prisma.contactLead.count({ where: { deletedAt: null, status: 'NEW' } }),
      this.prisma.contactLead.count({ where: { deletedAt: null, readAt: null } }),
      this.prisma.job.count({ where: { deletedAt: null } }),
      this.prisma.job.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      this.prisma.jobApplication.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      this.prisma.interview.count({ where: { status: 'SCHEDULED', scheduledAt: { gte: now } } }),
      this.prisma.jobApplication.groupBy({ by: ['candidateId'], where: { deletedAt: null } }),
      this.prisma.pageView.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { sessionId: true }, distinct: ['sessionId'] }),
    ]);

    const visitors = visitorSessions.length;
    const conversionRate = visitors > 0 ? Math.round((totalLeads / visitors) * 10000) / 100 : 0;

    return {
      totalLeads,
      newLeads,
      totalJobs,
      activeJobs,
      totalApplicants: distinctApplicants.length,
      applicationsThisMonth,
      interviewsScheduled,
      unreadMessages,
      visitors,
      conversionRate,
    };
  }

  async charts(months = 12): Promise<DashboardCharts> {
    const now = new Date();
    // Built with Date.UTC (not the local-time `new Date(y, m, d)` constructor) so that
    // `monthKey`, which reads UTC components, lines up with these bucket boundaries
    // regardless of the server's timezone.
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [applications, visitorRows, statusGroups, leadGroups] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: { deletedAt: null, createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      this.prisma.pageView.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { sessionId: true, createdAt: true },
      }),
      this.prisma.jobApplication.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.contactLead.groupBy({ by: ['source'], where: { deletedAt: null }, _count: { _all: true } }),
    ]);

    const monthBuckets = new Map<string, number>();
    for (let i = 0; i < months; i += 1) {
      const d = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() + i, 1));
      monthBuckets.set(monthKey(d), 0);
    }
    for (const app of applications) {
      const key = monthKey(app.createdAt);
      if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
    }

    const dayBuckets = new Map<string, Set<string>>();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(thirtyDaysAgo.getTime() + i * DAY_MS);
      dayBuckets.set(dayKey(d), new Set());
    }
    for (const view of visitorRows) {
      const key = dayKey(view.createdAt);
      if (!dayBuckets.has(key)) dayBuckets.set(key, new Set());
      dayBuckets.get(key)?.add(view.sessionId);
    }

    const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));

    return {
      monthlyApplications: [...monthBuckets.entries()].map(([date, value]) => ({ date, value })),
      websiteVisitors: [...dayBuckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, sessions]) => ({ date, value: sessions.size })),
      hiringFunnel: APPLICATION_PIPELINE.map((stage) => ({ stage, count: statusCounts.get(stage) ?? 0 })),
      leadSources: leadGroups.map((g) => ({ source: g.source ?? 'unknown', count: g._count._all })),
    };
  }
}
