import pino from 'pino';

/**
 * Structured logger for the marketplace application.
 *
 * Uses pino for fast JSON logging compatible with Vercel's log parsing.
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User signed in', { userId: user.id });
 * logger.error('Payment failed', { orderId, error: err.message });
 * logger.warn('Rate limit approaching', { endpoint, remaining: 10 });
 * ```
 *
 * Log levels (in order of severity):
 * - trace: Very detailed debugging (disabled in production)
 * - debug: Debugging information (disabled in production)
 * - info: Normal operation events
 * - warn: Warning conditions
 * - error: Error conditions
 * - fatal: Critical errors requiring immediate attention
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Vercel parses JSON logs automatically
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Add timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Base context added to all logs
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with additional context.
 * Useful for adding request-specific or module-specific context.
 *
 * Usage:
 * ```ts
 * const reqLogger = createLogger({ requestId: 'abc123', userId: user.id });
 * reqLogger.info('Processing order');
 * ```
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Pre-configured loggers for common modules.
 * These add a 'module' field to help filter logs.
 */
export const loggers = {
  auth: logger.child({ module: 'auth' }),
  stripe: logger.child({ module: 'stripe' }),
  listings: logger.child({ module: 'listings' }),
  orders: logger.child({ module: 'orders' }),
  bgg: logger.child({ module: 'bgg' }),
  cron: logger.child({ module: 'cron' }),
  email: logger.child({ module: 'email' }),
};

export type Logger = typeof logger;
