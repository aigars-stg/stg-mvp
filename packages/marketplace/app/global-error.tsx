'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Root-level error boundary — last resort when the locale layout itself fails.
 * Must include its own <html>/<body> and use inline styles only (no design system).
 * Nordic color palette hardcoded for visual consistency.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: '#ECEFF4',
          color: '#2E3440',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: 'rgba(191, 97, 106, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#BF616A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 8,
              color: '#2E3440',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 15,
              color: '#4C566A',
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            We hit an unexpected problem. Please try again or return to the
            homepage.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: '#D08770',
                color: '#FEFEFE',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 500,
                color: '#5E81AC',
                textDecoration: 'none',
              }}
            >
              Go to homepage
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#4C566A',
                opacity: 0.6,
                marginTop: 32,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
