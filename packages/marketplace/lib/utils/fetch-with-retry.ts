/**
 * Fetch with automatic retry for transient failures
 *
 * Implements exponential backoff for network errors and 5xx server errors.
 * Does not retry on 4xx client errors (those are typically not transient).
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Custom function to determine if a retry should be attempted */
  shouldRetry?: (error: Error, response?: Response, attempt?: number) => boolean;
}

/**
 * Default retry logic: retry on network errors or 5xx server errors
 */
function defaultShouldRetry(error: Error, response?: Response): boolean {
  // Always retry on network errors (no response)
  if (!response) return true;
  // Retry on server errors (5xx)
  return response.status >= 500;
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * @example
 * ```ts
 * // Basic usage - retries up to 3 times on network/server errors
 * const response = await fetchWithRetry('/api/data');
 *
 * // Custom retry configuration
 * const response = await fetchWithRetry('/api/data', {}, {
 *   maxRetries: 5,
 *   retryDelay: 2000,
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = defaultShouldRetry,
  } = retryOptions;

  let lastError: Error | null = null;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if we should retry based on response status
      if (!response.ok && shouldRetry(new Error(`HTTP ${response.status}`), response, attempt)) {
        lastResponse = response;
        if (attempt < maxRetries) {
          // Exponential backoff: delay * 2^attempt
          const delay = retryDelay * Math.pow(2, attempt);
          console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed with status ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry on this error
      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`[fetchWithRetry] Attempt ${attempt + 1} failed with error: ${lastError.message}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // If we exhausted all retries but have a response, return it
  if (lastResponse) {
    return lastResponse;
  }

  // If we exhausted all retries with an error, throw it
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Get a user-friendly error message based on the error type
 */
export function getErrorMessage(error: unknown, response?: Response): string {
  if (response) {
    switch (response.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
      case 504:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return `Request failed (${response.status}). Please try again.`;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('network') || error.message.includes('Network') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}
