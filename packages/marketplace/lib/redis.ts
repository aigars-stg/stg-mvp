import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Shared Redis singleton. Returns null when env vars are missing.
 * Used by both rate limiting (lib/ratelimit.ts) and caching (lib/cache.ts).
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}
