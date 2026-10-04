import { UnauthorizedException } from '@nestjs/common';
import { AuthService, LOCKOUT_MINUTES, MAX_FAILED_LOGINS } from '../../src/modules/auth/auth.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { hashPassword } from '../../src/common/utils/password.util';
import { sha256 } from '../../src/common/utils/crypto.util';

const PASSWORD = 'Sup3rSecret!';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'dev@example.com',
    name: 'Dev User',
    passwordHash: 'hash',
    status: 'ACTIVE',
    failedLoginCount: 0,
    lockedUntil: null,
    deletedAt: null,
    emailVerifiedAt: new Date(),
    avatarUrl: null,
    ...overrides,
  };
}

function buildAuthService(user: ReturnType<typeof buildUser> | null) {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(user),
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return Promise.resolve({ ...user, ...data });
      }),
    },
  };
  const tokens = {
    issueRefreshToken: jest.fn().mockResolvedValue({
      token: 'refresh-token',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 86_400_000),
    }),
    signAccessToken: jest.fn().mockResolvedValue('access-token'),
    accessTtlSeconds: 900,
  };
  const rbac = { permissionsForRoles: jest.fn().mockResolvedValue(['jobs:read']) };
  const events = { emit: jest.fn() };

  const service = new AuthService(
    prisma as never,
    tokens as never,
    rbac as never,
    events as never,
  );
  return { service, prisma, tokens, updates };
}

describe('AuthService.login', () => {
  it('issues an access token and a refresh token for valid credentials', async () => {
    const user = buildUser({ passwordHash: await hashPassword(PASSWORD) });
    // findFirst is used both for the credential check and for building the AuthUser.
    const { service, prisma, updates } = buildAuthService(user);
    prisma.user.findFirst.mockResolvedValue({ ...user, roles: [{ role: { name: 'CANDIDATE' } }], candidate: { id: 'cand-1' } });

    const result = await service.login({ email: user.email, password: PASSWORD });

    expect(result.auth.accessToken).toBe('access-token');
    expect(result.auth.user.email).toBe(user.email);
    expect(result.refresh.token).toBe('refresh-token');
    // Counters are reset and last login recorded.
    expect(updates.some((u) => u.failedLoginCount === 0 && u.lockedUntil === null)).toBe(true);
  });

  it('rejects a wrong password and increments the failure counter', async () => {
    const user = buildUser({ passwordHash: await hashPassword(PASSWORD), failedLoginCount: 1 });
    const { service, updates } = buildAuthService(user);

    await expect(service.login({ email: user.email, password: 'wrong-password' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(updates[0].failedLoginCount).toBe(2);
    expect(updates[0].lockedUntil).toBeNull();
  });

  it(`locks the account after ${MAX_FAILED_LOGINS} consecutive failures`, async () => {
    const user = buildUser({
      passwordHash: await hashPassword(PASSWORD),
      failedLoginCount: MAX_FAILED_LOGINS - 1,
    });
    const { service, updates } = buildAuthService(user);

    await expect(service.login({ email: user.email, password: 'wrong-password' })).rejects.toThrow(
      /locked for 15 minutes/i,
    );

    const lockedUntil = updates[0].lockedUntil as Date;
    expect(lockedUntil).toBeInstanceOf(Date);
    const minutes = (lockedUntil.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(LOCKOUT_MINUTES - 1);
    expect(updates[0].failedLoginCount).toBe(0);
  });

  it('refuses login while the account is locked, even with the right password', async () => {
    const user = buildUser({
      passwordHash: await hashPassword(PASSWORD),
      lockedUntil: new Date(Date.now() + 10 * 60_000),
    });
    const { service } = buildAuthService(user);

    await expect(service.login({ email: user.email, password: PASSWORD })).rejects.toThrow(
      /temporarily locked/i,
    );
  });

  it('does not reveal whether an account exists', async () => {
    const { service } = buildAuthService(null);
    await expect(service.login({ email: 'nobody@example.com', password: PASSWORD })).rejects.toThrow(
      'Invalid email or password',
    );
  });
});

describe('TokenService refresh rotation', () => {
  const config = {
    jwt: { accessSecret: 'x'.repeat(40), accessTtl: '15m', refreshTtlDays: 30 },
    cookie: { secure: false },
  };

  function buildTokenService(record: Record<string, unknown> | null) {
    const state = { updateManyArgs: [] as unknown[], updateArgs: [] as unknown[], created: [] as unknown[] };
    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue(record),
        create: jest.fn().mockImplementation((args: unknown) => {
          state.created.push(args);
          return Promise.resolve({ id: 'new-token' });
        }),
        update: jest.fn().mockImplementation((args: unknown) => {
          state.updateArgs.push(args);
          return Promise.resolve({});
        }),
        updateMany: jest.fn().mockImplementation((args: unknown) => {
          state.updateManyArgs.push(args);
          return Promise.resolve({ count: 2 });
        }),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const service = new TokenService(prisma as never, jwt as never, config as never);
    return { service, prisma, state };
  }

  const activeRecord = {
    id: 'rt-1',
    userId: 'user-1',
    familyId: 'family-1',
    tokenHash: sha256('old-token'),
    expiresAt: new Date(Date.now() + 86_400_000),
    revokedAt: null,
  };

  it('rotates a valid token and revokes the previous one', async () => {
    const { service, state } = buildTokenService(activeRecord);

    const { userId, issued } = await service.rotate('old-token');

    expect(userId).toBe('user-1');
    expect(issued.familyId).toBe('family-1'); // stays in the same family
    expect(issued.token).not.toBe('old-token');
    const revoke = state.updateArgs[0] as { where: { id: string }; data: { revokedAt: Date; replacedBy: string } };
    expect(revoke.where.id).toBe('rt-1');
    expect(revoke.data.revokedAt).toBeInstanceOf(Date);
    expect(revoke.data.replacedBy).toBe(sha256(issued.token));
  });

  it('detects reuse of a revoked token and revokes the whole family', async () => {
    const { service, state } = buildTokenService({ ...activeRecord, revokedAt: new Date() });

    await expect(service.rotate('old-token')).rejects.toThrow(/reuse detected/i);

    expect(state.updateManyArgs).toHaveLength(1);
    expect(state.updateManyArgs[0]).toMatchObject({ where: { familyId: 'family-1', revokedAt: null } });
  });

  it('rejects an unknown token', async () => {
    const { service } = buildTokenService(null);
    await expect(service.rotate('nope')).rejects.toThrow('Invalid refresh token');
  });

  it('rejects an expired token', async () => {
    const { service } = buildTokenService({ ...activeRecord, expiresAt: new Date(Date.now() - 1000) });
    await expect(service.rotate('old-token')).rejects.toThrow(/expired/i);
  });
});
