import { AUTH_ERRORS } from './constants';

/**
 * Maps Supabase auth error codes/messages to user-friendly messages
 */
export function mapAuthError(error: any): string {
  if (!error) return AUTH_ERRORS.UNKNOWN_ERROR;

  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // Email/password errors
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }

  if (message.includes('email not confirmed') || code === 'email_not_confirmed') {
    return AUTH_ERRORS.EMAIL_NOT_CONFIRMED;
  }

  if (message.includes('user not found') || code === 'user_not_found') {
    return AUTH_ERRORS.USER_NOT_FOUND;
  }

  if (message.includes('user already registered') || message.includes('email already exists')) {
    return AUTH_ERRORS.EMAIL_ALREADY_EXISTS;
  }

  // Password errors
  if (message.includes('password') && message.includes('weak')) {
    return AUTH_ERRORS.WEAK_PASSWORD;
  }

  if (message.includes('password') && message.includes('short')) {
    return 'Password must be at least 8 characters';
  }

  // Token errors
  if (message.includes('invalid token') || message.includes('expired')) {
    return AUTH_ERRORS.INVALID_TOKEN;
  }

  if (message.includes('token has expired')) {
    return 'Reset link has expired. Please request a new one';
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
    return 'Authentication with provider failed. Please try again';
  }

  // Generic error
  return error.message || AUTH_ERRORS.UNKNOWN_ERROR;
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  return message.includes('network') || message.includes('fetch') || message.includes('connection');
}

/**
 * Check if error requires email verification
 */
export function requiresEmailVerification(error: any): boolean {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  return message.includes('email not confirmed') || code === 'email_not_confirmed';
}
