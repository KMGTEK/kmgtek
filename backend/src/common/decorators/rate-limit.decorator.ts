import { Throttle } from '@nestjs/throttler';

/**
 * Stricter rate limit for a route (auth, contact, apply, comments…).
 *
 * ```ts
 * @RateLimit(10, 60) // 10 requests per 60 seconds per IP
 * ```
 */
export const RateLimit = (limit: number, ttlSeconds = 60) =>
  Throttle({ default: { limit, ttl: ttlSeconds * 1000 } });
