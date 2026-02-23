'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import {
  AlertCircle,
  RefreshCw as Loader2,
  FileText,
} from '@/lib/icons';

interface SellerLabelFailedProps {
  labelError: string | null | undefined;
  retryError: string | null;
  retryingLabel: boolean;
  handleRetryLabel: () => Promise<void>;
}

export function SellerLabelFailed({
  labelError,
  retryError,
  retryingLabel,
  handleRetryLabel,
}: SellerLabelFailedProps) {
  const t = useTranslations('SellerOrderDetail');

  return (
    <div className="bg-aurora-red/10 border-2 border-aurora-red/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-aurora-red/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-aurora-red" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-polar-night mb-1">
            {t('labelFailed.title')}
          </h3>
          <p className="text-sm text-text-secondary mb-2">
            {t('labelFailed.description')}
          </p>
          {labelError && (
            <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
              Error: {labelError}
            </p>
          )}
          {retryError && (
            <p className="text-sm text-aurora-red mb-4 p-2 bg-aurora-red/10 rounded">
              Retry failed: {retryError}
            </p>
          )}
          <Button
            variant="primary"
            onClick={handleRetryLabel}
            disabled={retryingLabel}
          >
            {retryingLabel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('labelFailed.generatingLabel')}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {t('labelFailed.retryLabelGeneration')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
