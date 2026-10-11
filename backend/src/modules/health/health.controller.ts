import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { PrismaHealthIndicator } from './prisma.health';

/** Unversioned probes — excluded from the `/api/v1` global prefix. */
@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: PrismaHealthIndicator,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — the process is up' })
  live() {
    return { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — dependencies (database) are reachable' })
  ready() {
    return this.health.check([() => this.database.isHealthy('database')]);
  }
}
