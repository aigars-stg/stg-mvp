/**
 * Structured BGG error types with user-friendly messages and recovery actions
 */

export type BGGErrorCode =
  | 'RATE_LIMIT'        // BGG 429 - too many requests
  | 'NETWORK_ERROR'     // Fetch failed, no internet
  | 'API_UNAVAILABLE'   // BGG server down (500, 502, 503)
  | 'PARSE_ERROR'       // Invalid XML response
  | 'TIMEOUT'           // Request took too long
  | 'UNKNOWN';          // Unexpected error

export interface BGGErrorContext {
  query?: string;
  gameId?: string;
  statusCode?: number;
  originalError?: string;
}

export class BGGError extends Error {
  constructor(
    public code: BGGErrorCode,
    public userMessage: string,
    public context: BGGErrorContext = {},
    public retryAfter?: number // seconds
  ) {
    super(userMessage);
    this.name = 'BGGError';
  }

  /**
   * Check if this error allows using stale cache as fallback
   */
  canUseStaleCacheFallback(): boolean {
    return ['RATE_LIMIT', 'API_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT'].includes(this.code);
  }

  /**
   * Get user-friendly message with recovery action
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get technical details for logging
   */
  getTechnicalDetails(): string {
    return `[${this.code}] ${this.message} | Context: ${JSON.stringify(this.context)}`;
  }
}

/**
 * Factory functions for common error scenarios
 */

export function createRateLimitError(query: string, retryAfter: number = 5): BGGError {
  return new BGGError(
    'RATE_LIMIT',
    'BoardGameGeek is receiving too many requests. We\'ll show you cached results if available.',
    { query },
    retryAfter
  );
}

export function createNetworkError(query: string): BGGError {
  return new BGGError(
    'NETWORK_ERROR',
    'Unable to reach BoardGameGeek. Check your internet connection.',
    { query }
  );
}

export function createAPIUnavailableError(statusCode: number, query?: string): BGGError {
  return new BGGError(
    'API_UNAVAILABLE',
    'BoardGameGeek is temporarily unavailable. We\'ll show you cached results if available.',
    { statusCode, query }
  );
}

export function createParseError(query: string, error: unknown): BGGError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new BGGError(
    'PARSE_ERROR',
    'Received invalid data from BoardGameGeek. This usually resolves itself.',
    { query, originalError: errorMessage }
  );
}

export function createTimeoutError(query: string): BGGError {
  return new BGGError(
    'TIMEOUT',
    'BoardGameGeek is responding slowly. We\'ll show you cached results if available.',
    { query }
  );
}

/**
 * Helper to convert fetch/network errors to BGGError
 */
export function parseFetchError(error: unknown, query?: string): BGGError {
  // Network errors (no response)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError(query || 'unknown');
  }

  // Timeout errors
  if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
    return createTimeoutError(query || 'unknown');
  }

  // Unknown errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new BGGError(
    'UNKNOWN',
    'An unexpected error occurred while contacting BoardGameGeek.',
    { originalError: errorMessage, query }
  );
}
