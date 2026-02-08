'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'griddy-icons';
import { Button } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/**
 * Locale-scoped error boundary — renders inside the locale layout (navbar, footer visible).
 * Follows the same visual pattern as the offline page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('ErrorPage');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-aurora-red/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-aurora-red" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {t('title')}
          </h1>
          <p className="text-text-secondary">
            {t('description')}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button variant="primary" size="lg" fullWidth onClick={reset}>
            {t('tryAgain')}
          </Button>
          <Link href="/">
            <Button variant="ghost" size="md" fullWidth>
              {t('goHome')}
            </Button>
          </Link>
        </div>

        {/* Error digest */}
        {error.digest && (
          <p className="text-xs text-text-muted opacity-60">
            {t('referenceCode', { code: error.digest })}
          </p>
        )}
      </div>
    </div>
  );
}
