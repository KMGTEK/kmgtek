import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../../config/config.module';

/** Models that use `deletedAt` instead of hard deletes. */
export type SoftDeletableModel =
  | 'user'
  | 'fileObject'
  | 'contactLead'
  | 'job'
  | 'jobApplication';

/** Reusable `where` fragment: `{ ...NOT_DELETED }`. */
export const NOT_DELETED = { deletedAt: null } as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({
      log: config.isProd ? ['warn', 'error'] : ['warn', 'error'],
      errorFormat: config.isProd ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Cheap liveness probe used by `/health/ready`. */
  async ping(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }

  /** Soft-delete a record (sets `deletedAt`), keeping it for audit/history. */
  async softDelete(model: SoftDeletableModel, id: string): Promise<unknown> {
    const delegate = this[model] as unknown as {
      update(args: { where: { id: string }; data: { deletedAt: Date } }): Promise<unknown>;
    };
    return delegate.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Merge `deletedAt: null` into a where clause. */
  alive<T extends Record<string, unknown>>(where: T = {} as T): T & { deletedAt: null } {
    return { ...where, deletedAt: null };
  }
}
