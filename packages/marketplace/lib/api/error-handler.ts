import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Standardized API error handler.
 * Logs the error and returns a consistent error response.
 *
 * Usage:
 * ```ts
 * try {
 *   // API logic
 * } catch (error) {
 *   return handleApiError(error, 'Create listing');
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  action = 'Operation',
  statusCode = 500
): NextResponse {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error({ error: message, stack, action }, `${action} failed`);

  return NextResponse.json(
    { error: `${action} failed`, details: message },
    { status: statusCode }
  );
}
