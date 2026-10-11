import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ROLES,
  type AuthResponse,
  type AuthUser,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type RoleName,
} from '@kmg/shared';
import type { Request } from 'express';
import { randomToken, sha256 } from '../../common/utils/crypto.util';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../common/utils/password.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AppEventsService } from '../events/app-events.service';
import { EVENTS } from '../events/event-names';
import { RbacService } from '../rbac/rbac.service';
import { TokenService, type IssuedRefreshToken } from './token.service';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
export const RESET_TOKEN_TTL_MINUTES = 60;

export interface AuthResult {
  auth: AuthResponse;
  refresh: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly rbac: RbacService,
    private readonly events: AppEventsService,
  ) {}

  /** Register a candidate account (staff users are created from the admin UI). */
  async register(input: RegisterInput, request?: Request): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const candidateRole = await this.prisma.role.findUnique({ where: { name: ROLES.CANDIDATE } });
    if (!candidateRole) throw new Error('CANDIDATE role is missing — run the database seed');

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        passwordChangedAt: new Date(),
        status: 'ACTIVE',
        roles: { create: { roleId: candidateRole.id } },
        candidate: { create: {} },
      },
    });

    this.events.emit(EVENTS.USER_REGISTERED, { userId: user.id });
    return this.issueSession(user.id, request);
  }

  /**
   * Password login. Five consecutive failures lock the account for 15 minutes;
   * a successful login clears the counter.
   */
  async login(input: LoginInput, request?: Request): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });

    if (!user?.passwordHash) {
      // Equalize timing so the response cannot be used to enumerate accounts.
      await verifyPassword(input.password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${minutes} minute(s).`);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      if (lock) {
        this.logger.warn(`Account ${user.email} locked after ${MAX_FAILED_LOGINS} failed attempts`);
        throw new UnauthorizedException(
          `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') throw new ForbiddenException('This account is suspended');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        ...(user.status === 'INVITED' ? { status: 'ACTIVE' as const } : {}),
      },
    });

    return this.issueSession(user.id, request);
  }

  /** Rotate the refresh token and mint a fresh access token. */
  async refresh(refreshToken: string, request?: Request): Promise<AuthResult> {
    const { userId, issued } = await this.tokens.rotate(refreshToken, request);
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || user.status === 'SUSPENDED') {
      await this.tokens.revokeFamily(issued.familyId);
      throw new UnauthorizedException('Session is no longer valid');
    }
    const auth = await this.buildAuthResponse(userId);
    return { auth, refresh: issued };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  async me(userId: string): Promise<AuthUser> {
    return this.buildAuthUser(userId);
  }

  /** Always resolves — never reveals whether the email exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user) return;

    const token = randomToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    });
    this.events.emit(EVENTS.USER_PASSWORD_RESET_REQUESTED, { userId: user.id, token });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This password reset link is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hashPassword(password),
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          status: 'ACTIVE',
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.tokens.revokeAllForUser(record.userId);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('This account has no password set');

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date() },
    });
    await this.tokens.revokeAllForUser(userId);
  }

  /** Mint the access token + refresh token pair for a user id. */
  async issueSession(userId: string, request?: Request): Promise<AuthResult> {
    const [auth, refresh] = await Promise.all([
      this.buildAuthResponse(userId),
      this.tokens.issueRefreshToken(userId, request),
    ]);
    return { auth, refresh };
  }

  async buildAuthResponse(userId: string): Promise<AuthResponse> {
    const user = await this.buildAuthUser(userId);
    const accessToken = await this.tokens.signAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      candidateId: user.candidateId,
    });
    return { accessToken, expiresIn: this.tokens.accessTtlSeconds, user };
  }

  private async buildAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } }, candidate: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('Account not found');

    const roles = user.roles.map((r) => r.role.name as RoleName);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      roles,
      permissions: await this.rbac.permissionsForRoles(roles),
      emailVerified: Boolean(user.emailVerifiedAt),
      candidateId: user.candidate?.id ?? null,
    };
  }
}
