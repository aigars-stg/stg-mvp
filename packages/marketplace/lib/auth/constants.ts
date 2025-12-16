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
  INVALID_CREDENTIALS: "Hmm, that email or password doesn't look right. Give it another try?",
  EMAIL_NOT_CONFIRMED: 'Check your inbox — you need to verify your email before signing in',
  USER_NOT_FOUND: "We couldn't find an account with that email",
  EMAIL_ALREADY_EXISTS: 'Looks like you already have an account. Try signing in instead?',
  WEAK_PASSWORD: 'Make it a bit stronger — 8+ characters with uppercase, lowercase, and a number',
  RATE_LIMIT_EXCEEDED: "Whoa, slow down! Too many attempts. Take a breather and try again in a few minutes",
  INVALID_TOKEN: 'That link has expired. Request a fresh one and you should be good',
  NETWORK_ERROR: "Can't reach our servers. Check your connection and try again",
  UNKNOWN_ERROR: 'Oops! Something went sideways. Give it another shot?',
} as const;
