import { AnalyticsService } from '../../src/modules/analytics/analytics.service';

const DAY_MS = 86_400_000;

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    pageView: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    jobApplication: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    interview: { count: jest.fn().mockResolvedValue(0) },
    job: { count: jest.fn().mockResolvedValue(0) },
    contactLead: { count: jest.fn().mockResolvedValue(0) },
    ...overrides,
  };
  return { service: new AnalyticsService(prisma as never), prisma };
}

describe('AnalyticsService.report — totals math', () => {
  const from = '2026-01-01T00:00:00.000Z';
  const to = '2026-01-05T00:00:00.000Z';

  it('computes unique visitors, leadConversionRate and interviewConversionRate', async () => {
    const pageViews = [
      { sessionId: 's1', path: '/', referrer: null, device: 'desktop', createdAt: new Date('2026-01-02T10:00:00Z') },
      { sessionId: 's1', path: '/careers', referrer: null, device: 'desktop', createdAt: new Date('2026-01-02T10:05:00Z') },
      { sessionId: 's2', path: '/', referrer: 'google', device: 'mobile', createdAt: new Date('2026-01-03T09:00:00Z') },
      { sessionId: 's3', path: '/', referrer: 'google', device: 'mobile', createdAt: new Date('2026-01-03T09:10:00Z') },
    ];
    const { service, prisma } = buildService({
      pageView: { findMany: jest.fn().mockResolvedValue(pageViews), groupBy: jest.fn().mockResolvedValue([]) },
      jobApplication: {
        count: jest.fn().mockResolvedValue(20), // applications in range
        findMany: jest.fn().mockResolvedValue([]), // no JOINED applications
        groupBy: jest.fn().mockResolvedValue([{ source: 'careers-page', _count: { _all: 12 } }]),
      },
      interview: { count: jest.fn().mockResolvedValue(5) },
      contactLead: { count: jest.fn().mockResolvedValue(2) },
      job: { count: jest.fn().mockResolvedValue(8) },
    });

    const report = await service.report({ from, to });

    // 3 distinct sessions across the 4 page views.
    expect(report.totals.visitors).toBe(3);
    expect(report.totals.pageViews).toBe(4);
    expect(report.totals.leads).toBe(2);
    // leadConversionRate = leads / visitors * 100 = 2/3*100 = 66.67
    expect(report.totals.leadConversionRate).toBeCloseTo(66.67, 1);
    expect(report.totals.applications).toBe(20);
    expect(report.totals.activeJobs).toBe(8);
    // interviewConversionRate = interviews / applications * 100 = 5/20*100 = 25
    expect(report.totals.interviewConversionRate).toBe(25);
    expect(report.totals.avgTimeToHireDays).toBe(0);
    expect(prisma.pageView.findMany).toHaveBeenCalled();
  });

  it('returns 0 rates instead of dividing by zero when there is no traffic or no applications', async () => {
    const { service } = buildService();
    const report = await service.report({ from, to });
    expect(report.totals.visitors).toBe(0);
    expect(report.totals.leadConversionRate).toBe(0);
    expect(report.totals.interviewConversionRate).toBe(0);
  });

  it('averages hiredAt - createdAt (in days) across JOINED applications', async () => {
    const { service } = buildService({
      jobApplication: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([
          { createdAt: new Date('2026-01-01T00:00:00Z'), hiredAt: new Date('2026-01-11T00:00:00Z') }, // 10 days
          { createdAt: new Date('2026-01-01T00:00:00Z'), hiredAt: new Date('2026-01-21T00:00:00Z') }, // 20 days
        ]),
      },
    });

    const report = await service.report({ from, to });
    expect(report.totals.avgTimeToHireDays).toBe(15);
  });

  it('ranks topPages by view count and caps referrers/devices grouping passthrough', async () => {
    const pageViews = [
      { sessionId: 's1', path: '/careers', referrer: 'google', device: 'desktop', createdAt: new Date('2026-01-02T00:00:00Z') },
      { sessionId: 's2', path: '/careers', referrer: 'google', device: 'desktop', createdAt: new Date('2026-01-02T01:00:00Z') },
      { sessionId: 's3', path: '/about', referrer: 'twitter', device: 'mobile', createdAt: new Date('2026-01-02T02:00:00Z') },
    ];
    const { service } = buildService({
      pageView: {
        findMany: jest.fn().mockResolvedValue(pageViews),
        groupBy: jest.fn().mockResolvedValue([{ device: 'desktop', _count: { _all: 2 } }, { device: 'mobile', _count: { _all: 1 } }]),
      },
    });

    const report = await service.report({ from, to });
    expect(report.topPages[0]).toEqual({ path: '/careers', views: 2 });
    expect(report.devices).toEqual(
      expect.arrayContaining([{ device: 'desktop', count: 2 }, { device: 'mobile', count: 1 }]),
    );
  });
});

describe('AnalyticsService.report — date range default', () => {
  it('defaults to the last 30 days when no from/to is given', async () => {
    const { service } = buildService();
    const report = await service.report({});
    const spanMs = new Date(report.range.to).getTime() - new Date(report.range.from).getTime();
    expect(Math.round(spanMs / DAY_MS)).toBe(30);
  });
});
