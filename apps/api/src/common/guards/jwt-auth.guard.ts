import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, OPTIONAL_AUTH_KEY } from '../decorators/public.decorator';
import type { JwtPayload, RequestUser } from '../types';

/**
 * Global authentication guard.
 * - `@Public()` routes are skipped entirely.
 * - `@OptionalAuth()` routes attach `request.user` when a valid token is present.
 * - Everything else requires a valid `Authorization: Bearer <accessToken>`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, targets);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic || isOptional) return true;
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = JwtAuthGuard.toRequestUser(payload);
    } catch {
      if (isPublic || isOptional) return true;
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }

  static toRequestUser(payload: JwtPayload): RequestUser {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.perms ?? [],
      candidateId: payload.cid ?? null,
    };
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : undefined;
  }
}
