import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Terminus indicator that runs `SELECT 1` against Postgres. */
@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy(key = 'database') {
    const check = this.indicator.check(key);
    const startedAt = Date.now();
    try {
      await this.prisma.ping();
      return check.up({ responseTimeMs: Date.now() - startedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unreachable';
      return check.down({ message });
    }
  }
}

export { HealthCheckError };
