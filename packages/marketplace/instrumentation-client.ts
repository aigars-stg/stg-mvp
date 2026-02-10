import * as Sentry from '@sentry/nextjs';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  // Capture all errors, sample 5% of transactions for performance
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.05,

  // Filter out common browser noise
  ignoreErrors: [
    'ResizeObserver loop',
    'ResizeObserver loop completed with undelivered notifications',
    /Loading chunk \d+ failed/,
    /ChunkLoadError/,
    'AbortError',
    'TypeError: Failed to fetch',
    'TypeError: NetworkError when attempting to fetch resource',
    'TypeError: cancelled',
  ],

  // Ignore errors from browser extensions
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],

  // Strip PII from error messages (email addresses)
  beforeSend(event) {
    if (event.message) {
      event.message = event.message.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        '[email]'
      );
    }
    return event;
  },
});
