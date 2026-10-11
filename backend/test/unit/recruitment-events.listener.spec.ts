import { RecruitmentEventsListener } from '../../src/modules/recruitment-events/recruitment-events.listener';

function buildListener(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    jobApplication: { findUnique: jest.fn() },
    interview: { findUnique: jest.fn() },
    ...prismaOverrides,
  };
  const mail = { queueTemplate: jest.fn(), notifyAddresses: jest.fn().mockResolvedValue(['ops@kmgtek.com']) };
  const notifications = { create: jest.fn(), notifyRoles: jest.fn() };
  const config = { webUrl: 'http://localhost:3000', mail: { fromAddress: 'contactus@kmgtek.com' } };
  const storage = { get: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')) };

  const listener = new RecruitmentEventsListener(
    prisma as never,
    mail as never,
    notifications as never,
    config as never,
    storage as never,
  );
  return { listener, prisma, mail, notifications, storage };
}

const application = {
  id: 'app-1',
  phone: '+15551234567',
  currentLocation: 'Remote',
  experienceYears: 4,
  source: 'careers-page',
  job: { title: 'Senior DevOps Engineer', location: 'Remote' },
  candidate: { id: 'cand-1', userId: 'user-1', user: { id: 'user-1', name: 'Jane Candidate', email: 'jane@example.com' } },
  resume: { id: 'file-resume-1', key: 'resumes/2026/01/abc.pdf', visibility: 'PRIVATE', originalName: 'jane-resume.pdf', mimeType: 'application/pdf' },
  coverLetter: null,
};

describe('RecruitmentEventsListener.onApplicationCreated', () => {
  it('emails the candidate + staff inbox (with the résumé attached) and notifies RECRUITER/HR in-app', async () => {
    const { listener, prisma, mail, notifications, storage } = buildListener({
      jobApplication: { findUnique: jest.fn().mockResolvedValue(application) },
    });

    await listener.onApplicationCreated({ applicationId: 'app-1' });

    expect(prisma.jobApplication.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'app-1' } }));
    expect(mail.queueTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com', templateKey: 'application.received.candidate' }),
    );
    expect(storage.get).toHaveBeenCalledWith('resumes/2026/01/abc.pdf', 'PRIVATE');
    expect(mail.queueTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ops@kmgtek.com'],
        templateKey: 'application.received.admin',
        attachments: [expect.objectContaining({ filename: 'jane-resume.pdf', contentType: 'application/pdf' })],
      }),
    );
    expect(notifications.notifyRoles).toHaveBeenCalledWith(['RECRUITER', 'HR'], expect.objectContaining({ type: 'APPLICATION_RECEIVED' }));
  });

  it('does nothing if the application no longer exists', async () => {
    const { listener, mail, notifications } = buildListener({ jobApplication: { findUnique: jest.fn().mockResolvedValue(null) } });
    await listener.onApplicationCreated({ applicationId: 'gone' });
    expect(mail.queueTemplate).not.toHaveBeenCalled();
    expect(notifications.notifyRoles).not.toHaveBeenCalled();
  });
});

describe('RecruitmentEventsListener.onApplicationStatusChanged', () => {
  it('emails application.status_updated and notifies the candidate for a normal transition', async () => {
    const { listener, mail, notifications } = buildListener({
      jobApplication: { findUnique: jest.fn().mockResolvedValue(application) },
    });

    await listener.onApplicationStatusChanged({
      applicationId: 'app-1',
      from: 'APPLIED',
      to: 'TECHNICAL_ROUND',
      note: 'Great fit',
      notifyCandidate: true,
    });

    expect(mail.queueTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        templateKey: 'application.status_updated',
        variables: expect.objectContaining({ status: 'TECHNICAL_ROUND', note: 'Great fit' }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'APPLICATION_STATUS_UPDATED' }),
    );
  });

  it('sends offer.released and an OFFER_RELEASED notification when moving to OFFER', async () => {
    const { listener, mail, notifications } = buildListener({
      jobApplication: { findUnique: jest.fn().mockResolvedValue(application) },
    });

    await listener.onApplicationStatusChanged({ applicationId: 'app-1', from: 'HR_ROUND', to: 'OFFER', notifyCandidate: true });

    expect(mail.queueTemplate).toHaveBeenCalledWith(expect.objectContaining({ templateKey: 'offer.released' }));
    expect(notifications.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'OFFER_RELEASED' }));
  });

  it('still records the in-app notification but skips email when notifyCandidate is false', async () => {
    const { listener, mail, notifications } = buildListener({
      jobApplication: { findUnique: jest.fn().mockResolvedValue(application) },
    });

    await listener.onApplicationStatusChanged({ applicationId: 'app-1', from: 'APPLIED', to: 'REJECTED', notifyCandidate: false });

    expect(mail.queueTemplate).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalled();
  });
});

describe('RecruitmentEventsListener.onInterviewScheduled', () => {
  const interview = {
    id: 'iv-1',
    round: 'TECHNICAL',
    scheduledAt: new Date('2026-04-01T15:00:00.000Z'),
    durationMinutes: 60,
    timezone: 'America/New_York',
    meetingUrl: 'https://meet.jit.si/kmg-abc123',
    location: null,
    notes: null,
    interviewers: [{ userId: 'staff-1', user: { id: 'staff-1', name: 'Alex Interviewer', email: 'alex@kmgtek.com' } }],
    application,
  };

  it('emails the candidate and every interviewer with an ICS attachment, and notifies both in-app', async () => {
    const { listener, mail, notifications } = buildListener({ interview: { findUnique: jest.fn().mockResolvedValue(interview) } });

    await listener.onInterviewScheduled({ interviewId: 'iv-1' });

    const candidateMail = mail.queueTemplate.mock.calls.find((call: unknown[]) => (call[0] as { to: string }).to === 'jane@example.com');
    const interviewerMail = mail.queueTemplate.mock.calls.find((call: unknown[]) => (call[0] as { to: string }).to === 'alex@kmgtek.com');
    expect(candidateMail?.[0]).toMatchObject({ templateKey: 'interview.scheduled' });
    expect(interviewerMail?.[0]).toMatchObject({ templateKey: 'interview.scheduled' });
    expect(candidateMail?.[0].attachments?.[0]).toMatchObject({ filename: 'interview.ics' });
    expect(candidateMail?.[0].attachments?.[0].content).toContain('BEGIN:VEVENT');

    expect(notifications.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'INTERVIEW_SCHEDULED' }));
    expect(notifications.create).toHaveBeenCalledWith('staff-1', expect.objectContaining({ type: 'INTERVIEW_SCHEDULED' }));
  });
});
