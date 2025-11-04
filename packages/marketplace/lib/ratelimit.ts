import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client only if env vars are available
let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Create rate limiters for different actions
  rateLimiters = {
    signIn: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
      analytics: true,
      prefix: '@upstash/ratelimit/signin',
    }),

    signUp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
      analytics: true,
      prefix: '@upstash/ratelimit/signup',
    }),

    passwordReset: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
      analytics: true,
      prefix: '@upstash/ratelimit/password-reset',
    }),

    emailResend: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '5 m'), // 1 request per 5 minutes
      analytics: true,
      prefix: '@upstash/ratelimit/email-resend',
    }),
  };
}

export type RateLimitAction = 'signIn' | 'signUp' | 'passwordReset' | 'emailResend';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

/**
 * Check rate limit for a given action and identifier
 * @param action - The type of action to rate limit
 * @param identifier - Unique identifier (usually email or IP)
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!redis || !rateLimiters) {
    console.warn('Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  try {
    const limiter = rateLimiters[action];
    if (!limiter) {
      console.error(`No rate limiter found for action: ${action}`);
      return {
        success: true,
        limit: 999,
        remaining: 999,
        reset: Date.now() + 60000,
      };
    }

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
      error: success ? undefined : 'Too many attempts. Please try again later.',
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request but log it
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
      error: undefined,
    };
  }
}

/**
 * Get the client IP address from request headers
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIP(headers: Headers): string {
  // Try various headers that might contain the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Format time remaining until rate limit reset
 * @param reset - Timestamp when rate limit resets
 * @returns Human-readable string
 */
export function formatResetTime(reset: number): string {
  const now = Date.now();
  const diffMs = reset - now;

  if (diffMs <= 0) return 'now';

  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
