import { getRedis } from './redis';

// In-memory fallback for when Redis is unavailable
const memoryFallback = new Map<string, { data: string; expiresAt: number }>();

/**
 * Get a cached value. Tries Redis first, falls back to in-memory Map.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const value = await redis.get<string>(key);
      if (value === null || value === undefined) return null;
      return (typeof value === 'string' ? JSON.parse(value) : value) as T;
    } catch (error) {
      console.warn(`[Cache] Redis get failed for ${key}:`, error);
    }
  }

  // In-memory fallback
  const cached = memoryFallback.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return JSON.parse(cached.data) as T;
  }
  return null;
}

/**
 * Set a cached value. Writes to Redis and in-memory fallback.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const serialized = JSON.stringify(value);

  // Always write to in-memory (serves as L1 cache and fallback)
  memoryFallback.set(key, {
    data: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, serialized, { ex: ttlSeconds });
    } catch (error) {
      console.warn(`[Cache] Redis set failed for ${key}:`, error);
    }
  }
}
