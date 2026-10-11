import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Logger } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/config.module';

/**
 * Rate-limit configuration. Uses Redis when `REDIS_URL` is set (so limits are shared
 * across replicas) and falls back to in-memory storage for local development.
 */
export function buildThrottlerOptions(config: AppConfigService): ThrottlerModuleOptions {
  const logger = new Logger('Throttler');
  const throttlers = [{ name: 'default', ttl: 60_000, limit: config.rateLimitPerMinute }];

  if (!config.redisUrl) {
    return { throttlers };
  }

  logger.log('Using Redis-backed throttler storage');
  return {
    throttlers,
    storage: new ThrottlerStorageRedisService(new Redis(config.redisUrl, { lazyConnect: false })),
  };
}
