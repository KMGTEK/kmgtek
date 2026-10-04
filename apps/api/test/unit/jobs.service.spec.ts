import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JobsService, type JobApplicationData } from '../../src/modules/jobs/jobs.service';
import { EVENTS } from '../../src/modules/events/event-names';

const PUBLISHED_JOB = {
  id: 'job-1',
  slug: 'senior-devops-engineer',
  title: 'Senior DevOps Engineer',
  status: 'PUBLISHED',
  deletedAt: null,
  screeningQuestions: [],
  skills: ['AWS', 'Kubernetes'],
  departmentId: null,
};

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    job: {
      findFirst: jest.fn().mockResolvedValue(PUBLISHED_JOB),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    candidate: { findFirst: jest.fn().mockResolvedValue(null) },
    role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-candidate', name: 'CANDIDATE' }) },
    user: {
      create: jest.fn().mockResolvedValue({ id: 'user-new', email: 'new@example.com', candidate: { id: 'cand-new' } }),
    },
    jobApplication: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'app-1' }),
    },
    resume: { findFirst: jest.fn() },
    passwordResetToken: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
  const uploads = { store: jest.fn().mockResolvedValue({ id: 'file-1', url: 'http://files/file-1' }) };
  const mail = { queueTemplate: jest.fn() };
  const config = { webUrl: 'http://localhost:3000' };
  const events = { emit: jest.fn() };

  const service = new JobsService(prisma as never, uploads as never, mail as never, config as never, events as never);
  return { service, prisma, uploads, mail, events };
}

const baseDto: JobApplicationData = {
  name: 'Jane Candidate',
  email: 'Jane@Example.com',
  phone: '+1 555 123 4567',
  currentLocation: 'Remote',
  experienceYears: 4,
};

const fakeRequest = { ip: '127.0.0.1' } as never;

describe('JobsService.apply', () => {
  it('creates a new User + Candidate for a first-time anonymous applicant and sends a set-password email', async () => {
    const { service, prisma, uploads, mail, events } = buildService();

    const result = await service.apply(
      'senior-devops-engineer',
      baseDto,
      { resume: [{ originalname: 'cv.pdf', mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('x') } as never] },
      undefined,
      fakeRequest,
    );

    expect(result).toEqual({ applicationId: 'app-1', candidateAccountCreated: true });
    expect(prisma.candidate.findFirst).toHaveBeenCalledWith({ where: { user: { email: 'jane@example.com' } } });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(uploads.store).toHaveBeenCalledWith(expect.anything(), 'RESUME', 'user-new');
    expect(prisma.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ jobId: 'job-1', candidateId: 'cand-new' }) }),
    );
    // Welcome email with a set-password link (password reset token created first).
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    expect(mail.queueTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        templateKey: 'auth.welcome',
        variables: expect.objectContaining({ portalUrl: expect.stringContaining('/reset-password?token=') }),
      }),
    );
    expect(events.emit).toHaveBeenCalledWith(EVENTS.APPLICATION_CREATED, { applicationId: 'app-1' });
  });

  it('links directly to an existing candidate profile found by email (no new account, no welcome email)', async () => {
    const { service, prisma, mail } = buildService({
      candidate: { findFirst: jest.fn().mockResolvedValue({ id: 'cand-existing' }) },
    });

    const result = await service.apply(
      'senior-devops-engineer',
      baseDto,
      { resume: [{ originalname: 'cv.pdf', mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('x') } as never] },
      undefined,
      fakeRequest,
    );

    expect(result.candidateAccountCreated).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(mail.queueTemplate).not.toHaveBeenCalled();
    expect(prisma.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidateId: 'cand-existing' }) }),
    );
  });

  it('rejects a duplicate application to the same job with 409', async () => {
    const { service } = buildService({
      candidate: { findFirst: jest.fn().mockResolvedValue({ id: 'cand-existing' }) },
      jobApplication: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-app' }),
        create: jest.fn(),
      },
    });

    await expect(
      service.apply(
        'senior-devops-engineer',
        baseDto,
        { resume: [{ originalname: 'cv.pdf', mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('x') } as never] },
        undefined,
        fakeRequest,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('treats a P2002 race on create() as a duplicate application (409)', async () => {
    const { service } = buildService({
      candidate: { findFirst: jest.fn().mockResolvedValue({ id: 'cand-existing' }) },
      jobApplication: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    });

    await expect(
      service.apply(
        'senior-devops-engineer',
        baseDto,
        { resume: [{ originalname: 'cv.pdf', mimetype: 'application/pdf', size: 1000, buffer: Buffer.from('x') } as never] },
        undefined,
        fakeRequest,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('requires a resume file when no resumeId is given', async () => {
    const { service } = buildService({
      candidate: { findFirst: jest.fn().mockResolvedValue({ id: 'cand-existing' }) },
    });

    await expect(service.apply('senior-devops-engineer', baseDto, {}, undefined, fakeRequest)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lets a signed-in candidate reuse one of their own stored resumes via resumeId', async () => {
    const { service, prisma, uploads } = buildService({
      resume: { findFirst: jest.fn().mockResolvedValue({ id: 'resume-1', fileId: 'file-existing', candidateId: 'cand-me' }) },
    });
    const currentUser = { id: 'user-me', candidateId: 'cand-me', email: 'me@example.com', roles: ['CANDIDATE'], permissions: [] };

    const result = await service.apply(
      'senior-devops-engineer',
      { ...baseDto, resumeId: 'resume-1' },
      {},
      currentUser as never,
      fakeRequest,
    );

    expect(result.candidateAccountCreated).toBe(false);
    expect(uploads.store).not.toHaveBeenCalled();
    expect(prisma.jobApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ candidateId: 'cand-me', resumeFileId: 'file-existing' }) }),
    );
  });

  it('404s when the job does not exist or is not published', async () => {
    const { service } = buildService({ job: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn(), count: jest.fn() } });

    await expect(service.apply('missing-job', baseDto, {}, undefined, fakeRequest)).rejects.toThrow(NotFoundException);
  });
});

describe('JobsService.create — slug generation', () => {
  it('auto-slugs from the title when no slug is given, and de-dupes on collision', async () => {
    const { service, prisma } = buildService({
      job: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        // First candidate slug is taken, so uniqueSlug should try "-2".
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
        create: jest.fn().mockResolvedValue({ id: 'job-new', slug: 'senior-devops-engineer-2', department: null, hiringManager: null }),
        update: jest.fn(),
      },
    });

    const dto = {
      title: 'Senior DevOps Engineer',
      summary: 'summary text here',
      description: 'a'.repeat(30),
      skills: [],
      responsibilities: [],
      requirements: [],
      preferredSkills: [],
      benefits: [],
      hiringProcess: [],
      screeningQuestions: [],
      experienceMin: 0,
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      location: 'Remote',
      showSalary: false,
      openings: 1,
      status: 'DRAFT',
    } as never;

    await service.create(dto, 'staff-1');

    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'senior-devops-engineer-2', createdById: 'staff-1' }) }),
    );
  });

  it('rejects an explicit slug that is already taken', async () => {
    const { service } = buildService({
      job: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn().mockResolvedValue(1), create: jest.fn(), update: jest.fn() },
    });

    const dto = {
      title: 'Another Role',
      slug: 'taken-slug',
      summary: 'summary text here',
      description: 'a'.repeat(30),
      skills: [],
      responsibilities: [],
      requirements: [],
      preferredSkills: [],
      benefits: [],
      hiringProcess: [],
      screeningQuestions: [],
      experienceMin: 0,
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      location: 'Remote',
      showSalary: false,
      openings: 1,
      status: 'DRAFT',
    } as never;

    await expect(service.create(dto, 'staff-1')).rejects.toThrow(BadRequestException);
  });
});
