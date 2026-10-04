import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tap } from 'rxjs';
import { AUDIT_KEY, type AuditMetadata } from '../../common/decorators/audit.decorator';
import { AuditService } from './audit.service';

/**
 * Writes an `AuditLog` row after any handler annotated with `@Audit(...)`
 * completes successfully. Registered globally — modules only add the decorator.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata || context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap((result) => {
        const rawParam = request.params?.[metadata.idParam ?? 'id'];
        const fromParams = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        const fromResult =
          result && typeof result === 'object'
            ? ((result as { data?: { id?: string }; id?: string }).data?.id ??
              (result as { id?: string }).id)
            : undefined;
        void this.audit.logRequest(request, {
          action: metadata.action,
          entityType: metadata.entityType,
          entityId: fromParams ?? fromResult ?? null,
          changes: this.changes(request),
        });
      }),
    );
  }

  private changes(request: Request): Record<string, unknown> | null {
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return Object.keys(body).length ? body : null;
  }
}
