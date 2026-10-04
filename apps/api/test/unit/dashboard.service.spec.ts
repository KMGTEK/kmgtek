import { DashboardService } from '../../src/modules/dashboard/dashboard.service';

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    contactLead: {
      count: jest.fn().mockResolvedValueOnce(40).mockResolvedValueOnce(6).mockResolvedValueOnce(3),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    job: { count: jest.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(12) },
    jobApplication: {
      count: jest.fn().mockResolvedValue(9),
      groupBy: jest.fn().mockResolvedValue([{ candidateId: 'a' }, { candidateId: 'b' }, { candidateId: 'c' }]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    interview: { count: jest.fn().mockResolvedValue(4) },
    pageView: {
      findMany: jest.fn().mockResolvedValue([
        { sessionId: 's1' },
        { sessionId: 's2' },
        { sessionId: 's3' },
        { sessionId: 's4' },
      ]),
    },
    ...overrides,
  };
  return { service: new DashboardService(prisma as never), prisma };
}

describe('DashboardService.summary', () => {
  it('computes totals and the leads/visitors conversion rate', async () => {
    const { service } = buildService();

    const summary = await service.summary();

    expect(summary.totalLeads).toBe(40);
    expect(summary.newLeads).toBe(6);
    expect(summary.unreadMessages).toBe(3);
    expect(summary.totalJobs).toBe(20);
    expect(summary.activeJobs).toBe(12);
    expect(summary.totalApplicants).toBe(3); // 3 distinct candidateId groups
    expect(summary.applicationsThisMonth).toBe(9);
    expect(summary.interviewsScheduled).toBe(4);
    expect(summary.visitors).toBe(4); // 4 distinct sessions
    // conversionRate = totalLeads / visitors * 100 = 40/4*100 = 1000%
    expect(summary.conversionRate).toBe(1000);
  });

  it('returns a 0 conversion rate instead of dividing by zero when there are no visitors', async () => {
    const { service } = buildService({ pageView: { findMany: jest.fn().mockResolvedValue([]) } });
    const summary = await service.summary();
    expect(summary.visitors).toBe(0);
    expect(summary.conversionRate).toBe(0);
  });
});

describe('DashboardService.charts', () => {
  it('buckets applications by month and counts the hiring funnel + lead sources', async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
    const { service, prisma } = buildService({
      jobApplication: {
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'APPLIED', _count: { _all: 5 } },
          { status: 'OFFER', _count: { _all: 2 } },
        ]),
        findMany: jest.fn().mockResolvedValue([{ createdAt: thisMonth }, { createdAt: thisMonth }]),
      },
      contactLead: {
        count: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([
          { source: 'contact-form', _count: { _all: 7 } },
          { source: null, _count: { _all: 2 } },
        ]),
      },
      pageView: { findMany: jest.fn().mockResolvedValue([]) },
    });

    const charts = await service.charts(3);

    const currentBucketKey = `${thisMonth.getUTCFullYear()}-${String(thisMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    const currentBucket = charts.monthlyApplications.find((p) => p.date === currentBucketKey);
    expect(currentBucket?.value).toBe(2);
    expect(charts.monthlyApplications).toHaveLength(3);

    expect(charts.hiringFunnel.find((f) => f.stage === 'APPLIED')?.count).toBe(5);
    expect(charts.hiringFunnel.find((f) => f.stage === 'OFFER')?.count).toBe(2);
    expect(charts.hiringFunnel.find((f) => f.stage === 'JOINED')?.count).toBe(0);

    expect(charts.leadSources).toEqual(
      expect.arrayContaining([
        { source: 'contact-form', count: 7 },
        { source: 'unknown', count: 2 },
      ]),
    );

    expect(prisma.jobApplication.findMany).toHaveBeenCalled();
  });
});
