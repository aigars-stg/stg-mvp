import { AUTH_ERRORS } from './constants';

/**
 * Represents an auth error from Supabase or similar sources
 */
interface AuthErrorLike {
  message?: string;
  code?: string;
}

/**
 * Maps Supabase auth error codes/messages to user-friendly messages
 */
export function mapAuthError(error: unknown): string {
  if (!error) return AUTH_ERRORS.UNKNOWN_ERROR;

  // Type guard to check if error has message/code properties
  const authError = error as AuthErrorLike;
  const message = authError.message?.toLowerCase() || '';
  const code = authError.code?.toLowerCase() || '';

  // Email errors
  if (message.includes('email not confirmed') || code === 'email_not_confirmed') {
    return AUTH_ERRORS.EMAIL_NOT_CONFIRMED;
  }

  if (message.includes('user not found') || code === 'user_not_found') {
    return AUTH_ERRORS.USER_NOT_FOUND;
  }

  if (message.includes('user already registered') || message.includes('email already exists')) {
    return AUTH_ERRORS.EMAIL_ALREADY_EXISTS;
  }

  // Token errors
  if (message.includes('invalid token') || message.includes('expired')) {
    return AUTH_ERRORS.INVALID_TOKEN;
  }

  if (message.includes('token has expired')) {
    return 'That link has expired — request a fresh one';
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many')) {
    return AUTH_ERRORS.RATE_LIMIT_EXCEEDED;
  }

  // OAuth errors
  if (message.includes('oauth')) {
    return "Couldn't connect with that account. Give it another try?";
  }

  // Generic error
  return authError.message || AUTH_ERRORS.UNKNOWN_ERROR;
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: unknown): boolean {
  const authError = error as AuthErrorLike;
  const message = authError.message?.toLowerCase() || '';
  return message.includes('network') || message.includes('fetch') || message.includes('connection');
}

/**
 * Check if error requires email verification
 */
export function requiresEmailVerification(error: unknown): boolean {
  const authError = error as AuthErrorLike;
  const message = authError.message?.toLowerCase() || '';
  const code = authError.code?.toLowerCase() || '';
  return message.includes('email not confirmed') || code === 'email_not_confirmed';
}
