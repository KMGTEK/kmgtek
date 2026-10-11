import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuditLogEntry, Paginated } from '@kmg/shared';
import type { Request } from 'express';
import { paginate, parsePagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface AuditListQuery {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  actorId?: string;
  entityType?: string;
  action?: string;
  from?: string | Date;
  to?: string | Date;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
]);

/** Strip credentials before persisting a request body into the audit trail. */
export function redactChanges(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactChanges(item, depth + 1));
  const output: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : redactChanges(raw, depth + 1);
  }
  return output;
}

/**
 * Append-only admin activity trail.
 *
 * ```ts
 * await this.audit.log({ actorId: user.id, action: 'job.update', entityType: 'Job', entityId: job.id, changes: dto });
 * ```
 *
 * Most modules should prefer the declarative `@Audit('job.update', 'Job')` decorator.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          changes: (redactChanges(input.changes ?? null) ?? undefined) as Prisma.InputJsonValue,
          ip: input.ip ?? null,
          userAgent: input.userAgent?.slice(0, 500) ?? null,
          requestId: input.requestId ?? null,
        },
      });
    } catch (error) {
      // Auditing must never break the request it describes.
      this.logger.error(`Failed to write audit log for ${input.action}`, error as Error);
    }
  }

  /** Convenience for controllers: pull actor/ip/user-agent straight off the request. */
  async logRequest(
    request: Request,
    input: Omit<AuditInput, 'actorId' | 'ip' | 'userAgent' | 'requestId'>,
  ): Promise<void> {
    await this.log({
      ...input,
      actorId: request.user?.id ?? null,
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.requestId ?? null,
    });
  }

  async list(query: AuditListQuery): Promise<Paginated<AuditLogEntry>> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({
        id: row.id,
        actor: row.actor ? { id: row.actor.id, name: row.actor.name, email: row.actor.email } : null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        changes: (row.changes ?? null) as Record<string, unknown> | null,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      { page, pageSize },
    );
  }
}
