'use client';

import { WifiOff, RefreshCw } from 'griddy-icons';
import { Button } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';

interface OfflineErrorProps {
  onRetry?: () => void;
  message?: string;
}

/**
 * A contextual offline error state to show when data fetching fails due to no connection.
 * Use this instead of generic error messages when isOfflineError() returns true.
 */
export function OfflineError({ onRetry, message }: OfflineErrorProps) {
  const t = useTranslations('OfflineError');

  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-aurora-orange/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-aurora-orange" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-polar-night mb-2">
        {t('title')}
      </h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">
        {message || t('defaultMessage')}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('tryAgain')}
        </Button>
      )}
    </div>
  );
}
