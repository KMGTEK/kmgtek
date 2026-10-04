import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppConfigService } from '../../config/config.module';
import { CSRF_PROTECTED_KEY } from '../decorators/csrf.decorator';

/**
 * Protects cookie-authenticated endpoints: they must be issued by our own web app
 * (`X-Requested-With: XMLHttpRequest` — a header a cross-site form cannot set —
 * plus an allow-listed `Origin`).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const protectedRoute = this.reflector.getAllAndOverride<boolean>(CSRF_PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!protectedRoute) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const requestedWith = request.headers['x-requested-with'];
    if (String(requestedWith ?? '').toLowerCase() !== 'xmlhttprequest') {
      throw new ForbiddenException('Missing X-Requested-With header');
    }

    const origin = request.headers.origin;
    if (origin && !this.config.corsOrigins.includes(origin)) {
      throw new ForbiddenException('Origin not allowed');
    }
    return true;
  }
}
