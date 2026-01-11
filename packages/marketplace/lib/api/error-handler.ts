import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Standardized API error handler.
 * Logs the error and returns a consistent error response.
 *
 * Security: In production, error details are sanitized to prevent
 * information disclosure. Full details are only logged server-side.
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

  // Always log full details server-side
  logger.error({ error: message, stack, action }, `${action} failed`);

  // In production, return generic error to client
  // In development, return full details for debugging
  const clientResponse = isProduction
    ? { error: `${action} failed` }
    : { error: `${action} failed`, details: message };

  return NextResponse.json(clientResponse, { status: statusCode });
}

/**
 * Create a safe error response for validation errors
 * These can include user-facing details since they're validation messages
 */
export function handleValidationError(
  message: string,
  action = 'Validation'
): NextResponse {
  logger.warn({ action, message }, `${action} failed: ${message}`);

  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

/**
 * Create a safe error response for auth errors
 * Always returns generic message to prevent user enumeration
 */
export function handleAuthError(
  action = 'Authentication'
): NextResponse {
  logger.warn({ action }, `${action} failed`);

  return NextResponse.json(
    { error: 'Authentication failed' },
    { status: 401 }
  );
}

/**
 * Create a safe error response for authorization errors
 */
export function handleForbiddenError(
  action = 'Authorization'
): NextResponse {
  logger.warn({ action }, `${action} denied`);

  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  );
}

/**
 * Create a safe error response for not found errors
 */
export function handleNotFoundError(
  resource = 'Resource'
): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
}
