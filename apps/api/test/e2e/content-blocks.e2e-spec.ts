import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { CONTENT_BLOCK_KEYS, DEFAULT_CONTENT_BLOCKS } from '@kmg/shared';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

describe('Content blocks (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: () => request.Agent;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());

    const login = await http()
      .post('/api/v1/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@kmgtek.com',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
      })
      .expect(200);
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    // Leave home.hero back at its default so no other tooling / the live site sees test data.
    await prisma.contentBlock.deleteMany({ where: { key: 'home.hero' } }).catch(() => undefined);
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it('GET /content-blocks returns all 13 keys with valid shapes', async () => {
    const response = await http().get('/api/v1/content-blocks').expect(200);
    const keys = Object.keys(response.body.data);
    expect(keys.sort()).toEqual([...CONTENT_BLOCK_KEYS].sort());
    for (const key of CONTENT_BLOCK_KEYS) {
      expect(response.body.data[key]).toBeDefined();
    }
  });

  it('GET /content-blocks/home.hero returns that key default-merged', async () => {
    const response = await http().get('/api/v1/content-blocks/home.hero').expect(200);
    expect(response.body.data).toMatchObject({ headline: expect.any(String) });
  });

  it('GET /content-blocks/:key 404s for an unknown key', async () => {
    await http().get('/api/v1/content-blocks/not.a.real.key').expect(404);
  });

  it('GET /admin/content-blocks requires auth', async () => {
    await http().get('/api/v1/admin/content-blocks').expect(401);
  });

  it('GET /admin/content-blocks lists all 13 with label/group/updatedAt', async () => {
    const response = await http().get('/api/v1/admin/content-blocks').set(auth()).expect(200);
    expect(response.body.data).toHaveLength(13);
    const hero = response.body.data.find((b: { key: string }) => b.key === 'home.hero');
    expect(hero).toMatchObject({ key: 'home.hero', label: 'Hero', group: 'Home page' });
  });

  it('GET /admin/content-blocks/:key 404s for an unknown key', async () => {
    await http().get('/api/v1/admin/content-blocks/not.a.real.key').set(auth()).expect(404);
  });

  it('rejects an unauthenticated PUT', async () => {
    await http()
      .put('/api/v1/admin/content-blocks/home.hero')
      .send({ ...DEFAULT_CONTENT_BLOCKS['home.hero'], headline: 'Should be rejected' })
      .expect(401);
  });

  it('PUT /admin/content-blocks/:key 404s for an unknown key', async () => {
    await http().put('/api/v1/admin/content-blocks/not.a.real.key').set(auth()).send({}).expect(404);
  });

  it('full admin edit → public read → invalid body 400 → reset → public read reverts', async () => {
    const updated = {
      ...DEFAULT_CONTENT_BLOCKS['home.hero'],
      headline: 'E2E Updated Headline',
    };

    const put = await http().put('/api/v1/admin/content-blocks/home.hero').set(auth()).send(updated).expect(200);
    expect(put.body.data.data.headline).toBe('E2E Updated Headline');
    expect(put.body.data.updatedAt).toBeDefined();

    const afterUpdate = await http().get('/api/v1/content-blocks/home.hero').expect(200);
    expect(afterUpdate.body.data.headline).toBe('E2E Updated Headline');

    // Missing required fields (e.g. `headline`, `description`) → 400 with field-level details.
    const invalid = await http()
      .put('/api/v1/admin/content-blocks/home.hero')
      .set(auth())
      .send({ eyebrow: 'only one field' })
      .expect(400);
    expect(invalid.body.message).toBe('Validation failed');
    expect(Array.isArray(invalid.body.details)).toBe(true);
    expect(invalid.body.details.length).toBeGreaterThan(0);

    await http().post('/api/v1/admin/content-blocks/home.hero/reset').set(auth()).expect(204);

    const afterReset = await http().get('/api/v1/content-blocks/home.hero').expect(200);
    expect(afterReset.body.data).toEqual(DEFAULT_CONTENT_BLOCKS['home.hero']);
  });
});
