import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationType, RoleName } from '@kmg/shared';
import type { AppNotification, PaginationMeta } from '@kmg/shared';
import { buildMeta, parsePagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  /** Relative admin/portal path, e.g. `/admin/applications/123`. */
  link?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ```ts
   * await this.notifications.create(userId, { type: 'INTERVIEW_SCHEDULED', title, body, link });
   * await this.notifications.notifyRoles(['HR', 'RECRUITER'], { type: 'APPLICATION_RECEIVED', title, body, link });
   * ```
   */
  async create(userId: string, input: NotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
  }

  /** Fan out one notification to every active user holding any of the roles. */
  async notifyRoles(roles: RoleName[], input: NotificationInput): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { name: { in: roles } } } },
      },
      select: { id: true },
    });
    if (!users.length) return 0;
    const result = await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      })),
    });
    return result.count;
  }

  async list(
    userId: string,
    query: { page?: number; pageSize?: number; unread?: boolean },
  ): Promise<{ data: AppNotification[]; meta: PaginationMeta & { unread: number } }> {
    const { page, pageSize, skip, take } = parsePagination(query);
    const where = { userId, ...(query.unread ? { readAt: null } : {}) };

    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      meta: { ...buildMeta(total, page, pageSize), unread },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const exists = await this.prisma.notification.count({ where: { id, userId } });
      if (!exists) throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
