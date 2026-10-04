import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@kmgtek.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

// A tiny but well-formed PDF (matches the %PDF-1.4 magic bytes the upload validator checks).
const PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
);

describe('Jobs (public + admin) (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: () => request.Agent;
  let adminToken: string;

  const suffix = Date.now();
  const departmentName = `E2E Department ${suffix}`;
  const jobTitle = `E2E Test Engineer ${suffix}`;
  const applicantEmail = `e2e-jobs-${suffix}@example.com`;

  let jobId: string;
  let jobSlug: string;
  let departmentId: string;
  let applicationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());

    const login = await http().post('/api/v1/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    if (applicationId) await prisma.jobApplication.deleteMany({ where: { id: applicationId } });
    const candidateUser = await prisma.user.findUnique({ where: { email: applicantEmail } });
    if (candidateUser) {
      await prisma.candidate.deleteMany({ where: { userId: candidateUser.id } });
      await prisma.user.deleteMany({ where: { id: candidateUser.id } });
    }
    if (jobId) await prisma.job.deleteMany({ where: { id: jobId } });
    if (departmentId) await prisma.jobCategory.deleteMany({ where: { id: departmentId } });
    await app?.close();
  });

  it('creates a department and a published job via the admin API', async () => {
    const category = await http()
      .post('/api/v1/admin/job-categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: departmentName })
      .expect(201);
    departmentId = category.body.data.id;

    const job = await http()
      .post('/api/v1/admin/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: jobTitle,
        departmentId,
        summary: 'A summary long enough to pass validation.',
        description: 'A sufficiently long HTML job description for e2e testing purposes.',
        skills: ['AWS', 'Kubernetes'],
        employmentType: 'FULL_TIME',
        workMode: 'REMOTE',
        location: 'Remote',
        status: 'PUBLISHED',
      })
      .expect(201);

    jobId = job.body.data.id;
    jobSlug = job.body.data.slug;
    expect(job.body.data.status).toBe('PUBLISHED');
    expect(jobSlug).toContain('e2e-test-engineer');
  });

  it('GET /jobs lists the published job', async () => {
    const response = await http().get('/api/v1/jobs').query({ search: jobTitle }).expect(200);
    expect(response.body.data.some((j: { id: string }) => j.id === jobId)).toBe(true);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /jobs/facets includes the new department and skills', async () => {
    const response = await http().get('/api/v1/jobs/facets').expect(200);
    expect(response.body.data.technologies).toContain('AWS');
    expect(response.body.data.departments.some((d: { id: string }) => d.id === departmentId)).toBe(true);
  });

  it('GET /jobs/:slug returns the job and increments views', async () => {
    const before = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

    const response = await http().get(`/api/v1/jobs/${jobSlug}`).expect(200);
    expect(response.body.data.id).toBe(jobId);
    expect(Array.isArray(response.body.data.similar)).toBe(true);

    const after = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    expect(after.views).toBeGreaterThan(before.views);
  });

  it('anonymous POST /jobs/:slug/apply creates a candidate account and the application', async () => {
    const response = await http()
      .post(`/api/v1/jobs/${jobSlug}/apply`)
      .field('name', 'E2E Applicant')
      .field('email', applicantEmail)
      .field('phone', '+1 555 987 6543')
      .field('currentLocation', 'Remote')
      .field('experienceYears', '5')
      .field('consent', 'true')
      .attach('resume', PDF_BUFFER, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .expect(201);

    expect(response.body.data.candidateAccountCreated).toBe(true);
    expect(response.body.data.applicationId).toBeDefined();
    applicationId = response.body.data.applicationId;

    const user = await prisma.user.findUnique({ where: { email: applicantEmail } });
    expect(user?.status).toBe('INVITED');
    expect(user?.passwordHash).toBeNull();
  });

  it('rejects a second application to the same job from the same candidate with 409', async () => {
    await http()
      .post(`/api/v1/jobs/${jobSlug}/apply`)
      .field('name', 'E2E Applicant')
      .field('email', applicantEmail)
      .field('phone', '+1 555 987 6543')
      .field('currentLocation', 'Remote')
      .field('experienceYears', '5')
      .field('consent', 'true')
      .attach('resume', PDF_BUFFER, { filename: 'resume.pdf', contentType: 'application/pdf' })
      .expect(409);
  });

  it('admin login → PATCH application status → GET dashboard summary reflects it', async () => {
    const list = await http()
      .get('/api/v1/admin/applications')
      .query({ jobId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data.some((a: { id: string }) => a.id === applicationId)).toBe(true);

    const before = await http()
      .get('/api/v1/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const patched = await http()
      .patch(`/api/v1/admin/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REVIEW', note: 'Moving forward', notifyCandidate: false })
      .expect(200);
    expect(patched.body.data.status).toBe('UNDER_REVIEW');
    expect(patched.body.data.history[0]).toMatchObject({ fromStatus: 'APPLIED', toStatus: 'UNDER_REVIEW' });

    const after = await http()
      .get('/api/v1/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(after.body.data.applicationsThisMonth).toBeGreaterThanOrEqual(before.body.data.applicationsThisMonth);
    expect(after.body.data.totalJobs).toBeGreaterThanOrEqual(1);
  });
});
