'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from '@/lib/icons';
import { Button, ResultPage } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Locale-scoped error boundary — renders inside the locale layout (navbar, footer visible).
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
    <ResultPage
      variant="error"
      icon={<AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />}
      title={t('title')}
      description={t('description')}
      fullHeight={false}
    >
      <ResultPage.Actions>
        <Button variant="primary" fullWidth onClick={reset}>
          {t('tryAgain')}
        </Button>
        <Link href="/" className="block">
          <Button variant="secondary" fullWidth>
            {t('goHome')}
          </Button>
        </Link>
      </ResultPage.Actions>

      {error.digest && (
        <div className="text-center pb-6">
          <p className="text-xs text-text-muted opacity-60">
            {t('referenceCode', { code: error.digest })}
          </p>
        </div>
      )}
    </ResultPage>
  );
}
