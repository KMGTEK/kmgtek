import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

describe('Public content, leads, search & sitemap (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: () => request.Agent;
  let adminToken: string;

  const suffix = Date.now();
  const staffEmail = `e2e-staff-${suffix}@example.com`;
  const leadEmail = `e2e-lead-${suffix}@example.com`;
  const honeypotEmail = `e2e-honeypot-${suffix}@example.com`;

  const createdIds = {
    leadId: '',
    staffUserId: '',
    caseStudyId: '',
    teamMemberId: '',
    testimonialId: '',
    serviceId: '',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: process.env.SEED_ADMIN_EMAIL ?? 'admin@kmgtek.com', password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!' })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    // Best-effort cleanup — leave the test database as close to how we found it as possible.
    if (createdIds.caseStudyId) await prisma.caseStudy.delete({ where: { id: createdIds.caseStudyId } }).catch(() => undefined);
    if (createdIds.teamMemberId) await prisma.teamMember.delete({ where: { id: createdIds.teamMemberId } }).catch(() => undefined);
    if (createdIds.testimonialId) await prisma.testimonial.delete({ where: { id: createdIds.testimonialId } }).catch(() => undefined);
    if (createdIds.serviceId) await prisma.service.delete({ where: { id: createdIds.serviceId } }).catch(() => undefined);
    await prisma.contactLead.deleteMany({ where: { email: { in: [leadEmail, honeypotEmail] } } }).catch(() => undefined);
    if (createdIds.staffUserId) await prisma.user.delete({ where: { id: createdIds.staffUserId } }).catch(() => undefined);
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  describe('Services & technologies (public)', () => {
    it('GET /services lists published services with nested technologies', async () => {
      const response = await http().get('/api/v1/services').expect(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      const biReporting = response.body.data.find(
        (s: { slug: string }) => s.slug === 'business-intelligence-reporting',
      );
      expect(biReporting).toBeDefined();
      expect(Array.isArray(biReporting.technologies)).toBe(true);
    });

    it('GET /services/:slug returns one published service', async () => {
      const response = await http().get('/api/v1/services/business-intelligence-reporting').expect(200);
      expect(response.body.data.title).toBe('Business Intelligence & Reporting');
    });

    it('GET /services/:slug 404s for an unknown slug', async () => {
      await http().get('/api/v1/services/does-not-exist').expect(404);
    });

    it('GET /technologies lists categories with nested technologies, ordered', async () => {
      const response = await http().get('/api/v1/technologies').expect(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].technologies.length).toBeGreaterThan(0);
    });

    it('admin can create, reorder and delete a service', async () => {
      const create = await http()
        .post('/api/v1/admin/services')
        .set(auth())
        .send({ title: `E2E Test Service ${suffix}`, shortDescription: 'A short description of the service.', overview: 'A much longer overview of the service goes here.' })
        .expect(201);
      createdIds.serviceId = create.body.data.id;
      expect(create.body.data.slug).toContain('e2e-test-service');

      await http().patch('/api/v1/admin/services/reorder').set(auth()).send({ ids: [createdIds.serviceId] }).expect(200);

      await http().delete(`/api/v1/admin/services/${createdIds.serviceId}`).set(auth()).expect(204);
      createdIds.serviceId = '';
    });
  });

  describe('Team members & testimonials (public + admin)', () => {
    it('creates, lists publicly and deletes a team member', async () => {
      const create = await http()
        .post('/api/v1/admin/team-members')
        .set(auth())
        .send({ name: `E2E Person ${suffix}`, title: 'Engineer', isLeadership: true })
        .expect(201);
      createdIds.teamMemberId = create.body.data.id;

      const publicList = await http().get('/api/v1/team-members?leadership=true').expect(200);
      expect(publicList.body.data.some((m: { id: string }) => m.id === createdIds.teamMemberId)).toBe(true);

      await http().delete(`/api/v1/admin/team-members/${createdIds.teamMemberId}`).set(auth()).expect(204);
      createdIds.teamMemberId = '';
    });

    it('creates, lists publicly and deletes a testimonial', async () => {
      const create = await http()
        .post('/api/v1/admin/testimonials')
        .set(auth())
        .send({ authorName: `E2E Client ${suffix}`, quote: 'They delivered a fantastic result for us.', featured: true })
        .expect(201);
      createdIds.testimonialId = create.body.data.id;

      const publicList = await http().get('/api/v1/testimonials?featured=true').expect(200);
      expect(publicList.body.data.some((t: { id: string }) => t.id === createdIds.testimonialId)).toBe(true);

      await http().delete(`/api/v1/admin/testimonials/${createdIds.testimonialId}`).set(auth()).expect(204);
      createdIds.testimonialId = '';
    });
  });

  describe('Case studies', () => {
    it('creates a published case study and exposes it publicly', async () => {
      const create = await http()
        .post('/api/v1/admin/case-studies')
        .set(auth())
        .send({
          title: `E2E Case Study ${suffix}`,
          industry: 'Fintech',
          summary: 'A summary of the case study that is long enough.',
          challenge: 'The challenge the client faced was significant.',
          solution: 'The solution we built for them was effective.',
          results: 'The results delivered were measurable and strong.',
          published: true,
        })
        .expect(201);
      createdIds.caseStudyId = create.body.data.id;
      expect(create.body.data.publishedAt).toBeTruthy();

      const list = await http().get('/api/v1/case-studies').expect(200);
      expect(list.body.data.some((c: { id: string }) => c.id === createdIds.caseStudyId)).toBe(true);
      expect(list.body.meta.total).toBeGreaterThan(0);

      const bySlug = await http().get(`/api/v1/case-studies/${create.body.data.slug}`).expect(200);
      expect(bySlug.body.data.title).toBe(`E2E Case Study ${suffix}`);
    });
  });

  describe('Contact form → leads (public + admin)', () => {
    it('POST /contact creates a lead and queues admin + visitor emails', async () => {
      const response = await http()
        .post('/api/v1/contact')
        .send({ name: 'E2E Prospect', email: leadEmail, message: 'We are interested in a cloud migration engagement, please reach out.', website: '' })
        .expect(201);
      expect(response.body.data.id).toBeTruthy();
      createdIds.leadId = response.body.data.id;

      const lead = await prisma.contactLead.findUnique({ where: { id: createdIds.leadId } });
      expect(lead?.email).toBe(leadEmail);

      // The log mail driver still writes an EmailLog row for every send.
      await new Promise((resolve) => setTimeout(resolve, 350)); // events run async
      const emailLogs = await prisma.emailLog.findMany({
        where: { templateKey: { in: ['contact.received.admin', 'contact.received.visitor'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      expect(emailLogs.length).toBeGreaterThan(0);
      expect(emailLogs.some((l) => l.status === 'SENT')).toBe(true);
    });

    it('honeypot on the contact form silently no-ops instead of creating a lead', async () => {
      const response = await http()
        .post('/api/v1/contact')
        .send({
          name: 'Spam Bot',
          email: honeypotEmail,
          message: 'This should never be stored anywhere in the database.',
          website: 'http://spambot.example',
        })
        .expect(201);
      expect(response.body.data.id).toBeNull();

      const lead = await prisma.contactLead.findFirst({ where: { email: honeypotEmail } });
      expect(lead).toBeNull();
    });

    it('admin lists, reads (marking it read), updates status and assigns the lead', async () => {
      const staff = await http()
        .post('/api/v1/admin/users')
        .set(auth())
        .send({ name: 'E2E Sales Rep', email: staffEmail, roles: ['SALES'], password: 'Sup3rSecret!1' })
        .expect(201);
      createdIds.staffUserId = staff.body.data.id;

      const list = await http().get('/api/v1/admin/leads').set(auth()).expect(200);
      expect(list.body.data.some((l: { id: string }) => l.id === createdIds.leadId)).toBe(true);

      const get = await http().get(`/api/v1/admin/leads/${createdIds.leadId}`).set(auth()).expect(200);
      expect(get.body.data.readAt).toBeTruthy();

      const statusUpdate = await http()
        .patch(`/api/v1/admin/leads/${createdIds.leadId}`)
        .set(auth())
        .send({ status: 'CONTACTED' })
        .expect(200);
      expect(statusUpdate.body.data.status).toBe('CONTACTED');

      const assign = await http()
        .patch(`/api/v1/admin/leads/${createdIds.leadId}`)
        .set(auth())
        .send({ assignedToId: createdIds.staffUserId })
        .expect(200);
      expect(assign.body.data.assignedTo.id).toBe(createdIds.staffUserId);

      await new Promise((resolve) => setTimeout(resolve, 350)); // LEAD_ASSIGNED listener runs async
      const notification = await prisma.notification.findFirst({
        where: { userId: createdIds.staffUserId, type: 'LEAD_ASSIGNED' },
      });
      expect(notification).not.toBeNull();
      const assignedEmail = await prisma.emailLog.findFirst({ where: { templateKey: 'lead.assigned' } });
      expect(assignedEmail).not.toBeNull();
    });

    it('adds a note to the lead', async () => {
      const response = await http()
        .post(`/api/v1/admin/leads/${createdIds.leadId}/notes`)
        .set(auth())
        .send({ content: 'Called the prospect, scheduling a demo.' })
        .expect(201);
      expect(response.body.data.notes.some((n: { content: string }) => n.content.includes('Called the prospect'))).toBe(true);
    });

    it('exports leads as CSV', async () => {
      const response = await http().get('/api/v1/admin/leads/export').set(auth()).expect(200);
      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.text).toContain('Name,Email');
      expect(response.text).toContain('E2E Prospect');
    });

    it('a SALES-only user cannot reassign a lead (missing leads:assign)', async () => {
      const login = await http().post('/api/v1/auth/login').send({ email: staffEmail, password: 'Sup3rSecret!1' }).expect(200);
      await http()
        .patch(`/api/v1/admin/leads/${createdIds.leadId}`)
        .set({ Authorization: `Bearer ${login.body.data.accessToken}` })
        .send({ assignedToId: createdIds.staffUserId })
        .expect(403);
    });

    it('deletes the lead', async () => {
      await http().delete(`/api/v1/admin/leads/${createdIds.leadId}`).set(auth()).expect(204);
      await http().get(`/api/v1/admin/leads/${createdIds.leadId}`).set(auth()).expect(404);
      createdIds.leadId = '';
    });
  });

  describe('Search', () => {
    it('returns cross-entity results for a shared keyword', async () => {
      const response = await http().get('/api/v1/search?q=Cloud&limit=5').expect(200);
      expect(response.body.data.services.some((s: { title: string }) => /cloud/i.test(s.title))).toBe(true);
      expect(Array.isArray(response.body.data.jobs)).toBe(true);
      expect(Array.isArray(response.body.data.technologies)).toBe(true);
    });

    it('rejects a query shorter than 2 characters', async () => {
      await http().get('/api/v1/search?q=a').expect(400);
    });

    it('caps results at the requested limit', async () => {
      const response = await http().get('/api/v1/search?q=en&limit=1').expect(200);
      expect(response.body.data.services.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Sitemap', () => {
    it('returns minimal published fields for every content type', async () => {
      const response = await http().get('/api/v1/sitemap').expect(200);
      const { services, jobs, caseStudies } = response.body.data;
      expect(services.length).toBeGreaterThan(0);
      expect(services[0]).toEqual(expect.objectContaining({ slug: expect.any(String), updatedAt: expect.any(String) }));
      expect(Array.isArray(jobs)).toBe(true);
      expect(Array.isArray(caseStudies)).toBe(true);
    });
  });

  describe('Site analytics', () => {
    it('POST /analytics/track always returns 204 and records a parsed page view', async () => {
      const sessionId = `e2e-session-${suffix}`;
      await http()
        .post('/api/v1/analytics/track')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36')
        .send({ path: '/services', sessionId, title: 'Services' })
        .expect(204);

      const pageView = await prisma.pageView.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' } });
      expect(pageView).not.toBeNull();
      expect(pageView?.device).toBe('desktop');
      expect(pageView?.browser).toBe('Chrome');

      await prisma.pageView.deleteMany({ where: { sessionId } });
    });

    it('never rejects a malformed tracking payload', async () => {
      await http().post('/api/v1/analytics/track').send({ path: 123 }).expect(204);
    });
  });
});
