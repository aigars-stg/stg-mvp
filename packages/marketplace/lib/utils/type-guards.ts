/**
 * Type guard utilities for safe type narrowing
 *
 * Use these helpers to safely narrow `unknown` types instead of using `any`.
 */

/**
 * Check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extract an error message from an unknown caught value
 * Use this in catch blocks instead of `(err: any) => err.message`
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

/**
 * Check if a Supabase result has data (no error)
 */
export function hasData<T>(
  result: { data: T | null; error: unknown }
): result is { data: T; error: null } {
  return result.data !== null && result.error === null;
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Safely get a property from an unknown object
 */
export function getProperty<T>(
  obj: unknown,
  key: string,
  defaultValue: T
): T {
  if (isObject(obj) && key in obj) {
    return obj[key] as T;
  }
  return defaultValue;
}
