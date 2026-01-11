/**
 * Authentication constants and configuration
 */

export const RATE_LIMITS = {
  magicLink: {
    requests: 3,
    window: '5 m', // 5 minutes
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
  EMAIL_NOT_CONFIRMED: 'Check your inbox — you need to verify your email before signing in',
  USER_NOT_FOUND: "We couldn't find an account with that email",
  EMAIL_ALREADY_EXISTS: 'Looks like you already have an account. Try signing in instead?',
  RATE_LIMIT_EXCEEDED: "Whoa, slow down! Too many attempts. Take a breather and try again in a few minutes",
  INVALID_TOKEN: 'That link has expired. Request a fresh one and you should be good',
  NETWORK_ERROR: "Can't reach our servers. Check your connection and try again",
  UNKNOWN_ERROR: 'Oops! Something went sideways. Give it another shot?',
} as const;
