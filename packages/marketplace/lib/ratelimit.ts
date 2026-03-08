import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis';

// Re-export shared utility for backwards compatibility
export { getClientIP } from '@/lib/utils/request-helpers';

// Initialize rate limiters using shared Redis client
const redis = getRedis();
let rateLimiters: Record<string, Ratelimit> | null = null;

if (redis) {

  // Create rate limiters for different actions
  rateLimiters = {
    // Auth limiters
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

    // Magic link security (critical for passwordless)
    magicLinkGenerate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 magic links per email per hour
      analytics: true,
      prefix: '@upstash/ratelimit/magic-link-generate',
    }),

    magicLinkValidate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 m'), // 10 attempts per IP per 10 min
      analytics: true,
      prefix: '@upstash/ratelimit/magic-link-validate',
    }),

    // Messaging limiters
    messageCreate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 messages per minute
      analytics: true,
      prefix: '@upstash/ratelimit/message-create',
    }),

    conversationCreate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 new conversations per hour
      analytics: true,
      prefix: '@upstash/ratelimit/conversation-create',
    }),

    // Checkout (same for buyer/seller)
    checkout: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, '1 h'), // 15 checkouts per hour
      analytics: true,
      prefix: '@upstash/ratelimit/checkout',
    }),

    // Listing creation - Buyer limits
    'listingCreate-buyer': new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, '1 d'), // 2 per day for buyers
      analytics: true,
      prefix: '@upstash/ratelimit/listing-create-buyer',
    }),

    // Listing creation - Seller limits
    'listingCreate-seller': new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 d'), // 50 per day for sellers
      analytics: true,
      prefix: '@upstash/ratelimit/listing-create-seller',
    }),

    // Upload - Buyer limits
    'upload-buyer': new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 per hour for buyers
      analytics: true,
      prefix: '@upstash/ratelimit/upload-buyer',
    }),

    // Upload - Seller limits
    'upload-seller': new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 per hour for sellers
      analytics: true,
      prefix: '@upstash/ratelimit/upload-seller',
    }),

    // Review creation
    reviewCreate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 reviews per hour
      analytics: true,
      prefix: '@upstash/ratelimit/review-create',
    }),

    // Feedback submission (IP-based, supports anonymous)
    feedback: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 submissions per hour per IP
      analytics: true,
      prefix: '@upstash/ratelimit/feedback',
    }),

    // Newsletter subscribe (IP-based, supports anonymous)
    newsletterSubscribe: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 subscriptions per hour per IP
      analytics: true,
      prefix: '@upstash/ratelimit/newsletter-subscribe',
    }),

    // Global limit per IP (DoS protection)
    global: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute per IP
      analytics: true,
      prefix: '@upstash/ratelimit/global',
    }),
  };
}

export type RateLimitAction =
  | 'signIn'
  | 'signUp'
  | 'passwordReset'
  | 'emailResend'
  | 'magicLinkGenerate'
  | 'magicLinkValidate'
  | 'messageCreate'
  | 'conversationCreate'
  | 'checkout'
  | 'listingCreate-buyer'
  | 'listingCreate-seller'
  | 'upload-buyer'
  | 'upload-seller'
  | 'reviewCreate'
  | 'feedback'
  | 'newsletterSubscribe'
  | 'global';

/**
 * Get rate limit action key with role awareness
 * @param action - Base action name (e.g., 'listingCreate', 'upload')
 * @param isSeller - Whether the user is a seller
 * @returns Role-specific action key
 */
export function getRateLimitAction(action: 'listingCreate' | 'upload', isSeller: boolean): RateLimitAction {
  return `${action}-${isSeller ? 'seller' : 'buyer'}` as RateLimitAction;
}

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
  // If rate limiting is not configured, block in production, warn in dev
  if (!redis || !rateLimiters) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Rate limiting not configured in production! Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now(),
        error: 'Service temporarily unavailable',
      };
    }
    // Dev mode: allow but with low limits for testing
    console.warn('Rate limiting not configured - using development fallback');
    return {
      success: true,
      limit: 10,
      remaining: 10,
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
