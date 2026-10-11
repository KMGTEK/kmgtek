import { ApplicationsService, type ApplicationStatusUpdateData } from '../../src/modules/applications/applications.service';
import { EVENTS } from '../../src/modules/events/event-names';

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    status: 'APPLIED',
    rating: null,
    source: 'careers-page',
    fullName: 'Jane Candidate',
    email: 'jane@example.com',
    phone: '+15551234567',
    currentLocation: 'Remote',
    currentCompany: null,
    experienceYears: 4,
    currentCtc: null,
    expectedCtc: null,
    noticePeriod: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    answers: [],
    resume: null,
    coverLetter: null,
    resumeFileId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    job: { id: 'job-1', slug: 'senior-devops-engineer', title: 'Senior DevOps Engineer', location: 'Remote', workMode: 'REMOTE', employmentType: 'FULL_TIME', department: null },
    candidate: { id: 'cand-1', userId: 'user-1', user: { id: 'user-1', name: 'Jane Candidate', email: 'jane@example.com', avatarUrl: null } },
    notes: [],
    history: [],
    interviews: [],
    ...overrides,
  };
}

function buildService(overrides: Record<string, unknown> = {}) {
  const state = { statusUpdates: [] as unknown[], historyCreates: [] as unknown[] };
  const prisma = {
    jobApplication: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({ id: 'app-1', status: 'APPLIED' }) // requireAlive
        .mockResolvedValueOnce(fullRow({ status: 'UNDER_REVIEW' })), // getAdmin after update
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        state.statusUpdates.push(data);
        return Promise.resolve({});
      }),
    },
    applicationStatusHistory: {
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        state.historyCreates.push(data);
        return Promise.resolve({ id: 'history-1', ...data });
      }),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    ...overrides,
  };
  const uploads = { toFileRef: jest.fn() };
  const events = { emit: jest.fn() };
  const candidates = { getProfile: jest.fn() };

  const service = new ApplicationsService(prisma as never, uploads as never, events as never, candidates as never);
  return { service, prisma, events, state };
}

describe('ApplicationsService.updateStatus', () => {
  it('updates the status, writes a history row and emits application.status_changed', async () => {
    const { service, state, events } = buildService();
    const dto: ApplicationStatusUpdateData = { status: 'UNDER_REVIEW', note: 'Looks strong', notifyCandidate: true };

    const result = await service.updateStatus('app-1', dto, 'staff-1');

    expect(state.statusUpdates[0]).toMatchObject({ status: 'UNDER_REVIEW' });
    expect(state.historyCreates[0]).toMatchObject({
      applicationId: 'app-1',
      fromStatus: 'APPLIED',
      toStatus: 'UNDER_REVIEW',
      note: 'Looks strong',
      changedById: 'staff-1',
    });
    expect(events.emit).toHaveBeenCalledWith(EVENTS.APPLICATION_STATUS_CHANGED, {
      applicationId: 'app-1',
      from: 'APPLIED',
      to: 'UNDER_REVIEW',
      note: 'Looks strong',
      notifyCandidate: true,
    });
    expect(result.status).toBe('UNDER_REVIEW');
  });

  it('sets hiredAt when the new status is JOINED', async () => {
    const { service, state } = buildService({
      jobApplication: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'app-1', status: 'OFFER' })
          .mockResolvedValueOnce(fullRow({ status: 'JOINED' })),
        update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
          state.statusUpdates.push(data);
          return Promise.resolve({});
        }),
      },
    });

    await service.updateStatus('app-1', { status: 'JOINED', note: undefined, notifyCandidate: true }, 'staff-1');

    expect(state.statusUpdates[0]).toMatchObject({ status: 'JOINED' });
    expect(state.statusUpdates[0]).toHaveProperty('hiredAt');
    expect((state.statusUpdates[0] as { hiredAt: Date }).hiredAt).toBeInstanceOf(Date);
  });
});
