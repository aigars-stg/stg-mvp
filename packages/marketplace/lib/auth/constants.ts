/**
 * Authentication constants and configuration
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Can be enabled later
} as const;

export const RATE_LIMITS = {
  signIn: {
    requests: 5,
    window: '15 m', // 15 minutes
  },
  signUp: {
    requests: 3,
    window: '1 h', // 1 hour
  },
  passwordReset: {
    requests: 3,
    window: '1 h',
  },
  emailResend: {
    requests: 1,
    window: '5 m', // 5 minutes
  },
} as const;

export const SESSION_CONFIG = {
  defaultDuration: 7 * 24 * 60 * 60, // 7 days in seconds
  rememberMeDuration: 30 * 24 * 60 * 60, // 30 days in seconds
} as const;

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_CONFIRMED: 'Please verify your email before signing in',
  USER_NOT_FOUND: 'No account found with this email',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later',
  INVALID_TOKEN: 'Invalid or expired reset link',
  NETWORK_ERROR: 'Network error. Please check your connection',
  UNKNOWN_ERROR: 'Something went wrong. Please try again',
} as const;
