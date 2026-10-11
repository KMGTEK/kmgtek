import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { REFRESH_COOKIE_NAME, SESSION_HINT_COOKIE_NAME, type Permission, type RoleName } from '@kmg/shared';
import type { CookieOptions, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../config/config.module';
import type { JwtPayload } from '../../common/types';
import { randomToken, sha256 } from '../../common/utils/crypto.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface AccessTokenSubject {
  id: string;
  email: string;
  roles: RoleName[];
  permissions: Permission[];
  candidateId?: string | null;
}

export interface IssuedRefreshToken {
  token: string;
  familyId: string;
  expiresAt: Date;
}

const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Convert `15m` / `2h` / `45s` / `900` into seconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  switch (match[2]) {
    case 'd':
      return amount * 86400;
    case 'h':
      return amount * 3600;
    case 'm':
      return amount * 60;
    default:
      return amount;
  }
}

/**
 * Mints access tokens and manages the hashed, rotating refresh-token family
 * described in docs/API_CONTRACT.md.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  get accessTtlSeconds(): number {
    return parseDuration(this.config.jwt.accessTtl);
  }

  async signAccessToken(subject: AccessTokenSubject): Promise<string> {
    const payload: JwtPayload = {
      sub: subject.id,
      email: subject.email,
      roles: subject.roles,
      perms: subject.permissions,
      cid: subject.candidateId ?? null,
    };
    return this.jwt.signAsync(payload);
  }

  /** Create a new refresh token, optionally continuing an existing family. */
  async issueRefreshToken(
    userId: string,
    request?: Request,
    familyId: string = randomUUID(),
  ): Promise<IssuedRefreshToken> {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + this.config.jwt.refreshTtlDays * 86400_000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: sha256(token),
        expiresAt,
        userAgent: request?.headers['user-agent']?.slice(0, 500) ?? null,
        ip: request?.ip ?? null,
      },
    });
    return { token, familyId, expiresAt };
  }

  /**
   * Rotate a refresh token. Reusing an already-rotated token is treated as theft:
   * the whole family is revoked and the caller must log in again.
   */
  async rotate(plainToken: string, request?: Request): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(plainToken) },
    });
    if (!record) throw new UnauthorizedException('Invalid refresh token');

    if (record.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${record.userId} — revoking family`);
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token reuse detected — please sign in again');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const issued = await this.issueRefreshToken(record.userId, request, record.familyId);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: sha256(issued.token) },
    });
    return { userId: record.userId, issued };
  }

  async revoke(plainToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(plainToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private cookieOptions(path: string, httpOnly: boolean): CookieOptions {
    return {
      httpOnly,
      secure: this.config.cookie.secure,
      sameSite: 'lax',
      path,
      ...(this.config.cookie.domain ? { domain: this.config.cookie.domain } : {}),
    };
  }

  /** Sets `kmg_rt` (HttpOnly) and the non-secret `kmg_session=1` hint cookie. */
  setAuthCookies(response: Response, token: string, expiresAt: Date): void {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.cookieOptions(REFRESH_COOKIE_PATH, true),
      maxAge,
    });
    response.cookie(SESSION_HINT_COOKIE_NAME, '1', {
      ...this.cookieOptions('/', false),
      maxAge,
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions(REFRESH_COOKIE_PATH, true));
    response.clearCookie(SESSION_HINT_COOKIE_NAME, this.cookieOptions('/', false));
  }

  readRefreshCookie(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[REFRESH_COOKIE_NAME];
  }
}
