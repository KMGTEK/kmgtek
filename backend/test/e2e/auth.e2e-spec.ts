import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { REFRESH_COOKIE_NAME, SESSION_HINT_COOKIE_NAME } from '@kmg/shared';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

const CSRF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  Origin: 'http://localhost:3000',
};

describe('Auth flow (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: () => request.Agent;

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'E2ePassw0rd!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app?.close();
  });

  const cookieValue = (cookies: string[] | undefined, name: string): string | undefined =>
    cookies
      ?.find((cookie) => cookie.startsWith(`${name}=`))
      ?.split(';')[0]
      .split('=')
      .slice(1)
      .join('=');

  it('GET /health/live is public and unversioned', async () => {
    const response = await http().get('/health/live').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /health/ready reports the database as up', async () => {
    const response = await http().get('/health/ready').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.info.database.status).toBe('up');
  });

  it('GET /api/v1/settings/public returns settings without the email group', async () => {
    const response = await http().get('/api/v1/settings/public').expect(200);
    expect(response.body.data.company.name).toBeDefined();
    expect(response.body.data.email).toBeUndefined();
  });

  it('rejects an unauthenticated /auth/me', async () => {
    const response = await http().get('/api/v1/auth/me').expect(401);
    expect(response.body).toMatchObject({ statusCode: 401, error: 'Unauthorized' });
    expect(response.body.requestId).toBeDefined();
  });

  it('rejects a registration that fails validation', async () => {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  describe('register → login → me → refresh → logout', () => {
    let accessToken: string;
    let refreshCookie: string;

    it('registers a candidate and sets both cookies', async () => {
      const response = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Candidate', email, password })
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.roles).toContain('CANDIDATE');
      expect(response.body.data.user.candidateId).toBeTruthy();

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookieValue(cookies, REFRESH_COOKIE_NAME)).toBeTruthy();
      expect(cookieValue(cookies, SESSION_HINT_COOKIE_NAME)).toBe('1');
      expect(cookies.find((c) => c.startsWith(REFRESH_COOKIE_NAME))).toMatch(/HttpOnly/i);
    });

    it('logs in with the new credentials', async () => {
      const response = await http()
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);

      accessToken = response.body.data.accessToken;
      const cookies = response.headers['set-cookie'] as unknown as string[];
      refreshCookie = `${REFRESH_COOKIE_NAME}=${cookieValue(cookies, REFRESH_COOKIE_NAME)}`;
      expect(accessToken).toBeDefined();
      expect(response.body.data.expiresIn).toBeGreaterThan(0);
    });

    it('rejects a wrong password', async () => {
      await http().post('/api/v1/auth/login').send({ email, password: 'Wrong-Password1' }).expect(401);
    });

    it('returns the authenticated user from /auth/me', async () => {
      const response = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({ email, name: 'E2E Candidate' });
      expect(response.body.data.roles).toEqual(['CANDIDATE']);
    });

    it('refuses /auth/refresh without the CSRF header', async () => {
      await http().post('/api/v1/auth/refresh').set('Cookie', refreshCookie).expect(403);
    });

    it('rotates the refresh token and issues a new access token', async () => {
      const response = await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', refreshCookie)
        .expect(200);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const rotated = `${REFRESH_COOKIE_NAME}=${cookieValue(cookies, REFRESH_COOKIE_NAME)}`;
      expect(rotated).not.toBe(refreshCookie);
      expect(response.body.data.accessToken).toBeDefined();

      // Reusing the old (now revoked) token must fail and kill the family.
      await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF_HEADERS)
        .set('Cookie', refreshCookie)
        .expect(401);

      // The rotated token was in the revoked family, so it no longer works either.
      await http().post('/api/v1/auth/refresh').set(CSRF_HEADERS).set('Cookie', rotated).expect(401);
    });

    it('logs out and clears the cookies', async () => {
      const login = await http().post('/api/v1/auth/login').send({ email, password }).expect(200);
      const cookies = login.headers['set-cookie'] as unknown as string[];
      const cookie = `${REFRESH_COOKIE_NAME}=${cookieValue(cookies, REFRESH_COOKIE_NAME)}`;

      const response = await http()
        .post('/api/v1/auth/logout')
        .set(CSRF_HEADERS)
        .set('Cookie', cookie)
        .expect(204);

      const cleared = response.headers['set-cookie'] as unknown as string[];
      expect(cookieValue(cleared, REFRESH_COOKIE_NAME)).toBeFalsy();

      await http().post('/api/v1/auth/refresh').set(CSRF_HEADERS).set('Cookie', cookie).expect(401);
    });
  });
});
