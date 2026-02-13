'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Cookie } from '@/lib/icons';
import {
  getConsentStatus,
  saveConsentStatus,
  type ConsentStatus
} from '@/lib/cookie-consent';

/**
 * GDPR-compliant cookie consent banner
 *
 * Shows before non-essential cookies are set.
 * Provides equal prominence to Accept/Reject buttons.
 * Stores consent in localStorage.
 */
export function CookieConsent() {
  const t = useTranslations('CookieConsent');
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('pending');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check existing consent status
    const status = getConsentStatus();
    setConsentStatus(status);

    // Only show banner if consent is pending
    if (status === 'pending') {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    saveConsentStatus('accepted');
    setConsentStatus('accepted');
    setIsVisible(false);
  };

  const handleRejectOptional = () => {
    saveConsentStatus('rejected');
    setConsentStatus('rejected');
    setIsVisible(false);
  };

  // Don't render if consent already given or not mounted yet
  if (!isVisible || consentStatus !== 'pending') {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-elevated p-4 shadow-lg backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-live="polite"
      aria-label={t('ariaLabel')}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Message */}
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-polar-night">
              <Cookie className="w-5 h-5 text-aurora-orange" />
              {t('title')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('description')}
              <br />
              <Link
                href="/privacy#cookies"
                className="text-frost-ice underline hover:text-frost-sky"
              >
                {t('learnMore')}
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={handleRejectOptional}
              className="rounded-lg border-2 border-border bg-transparent px-6 py-2.5 text-sm font-medium text-text transition-colors hover:border-frost-ice hover:bg-bg focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2 focus:ring-offset-bg-elevated"
              type="button"
            >
              {t('rejectOptional')}
            </button>

            <button
              onClick={handleAcceptAll}
              className="rounded-lg border-2 border-frost-ice bg-frost-ice px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-frost-sky hover:border-frost-sky focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2 focus:ring-offset-bg-elevated"
              type="button"
            >
              {t('acceptAll')}
            </button>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-3 text-xs text-text-muted">
          <p>
            <strong>{t('essential')}</strong> {t('essentialDescription')}
          </p>
          <p>
            <strong>{t('analytics')}</strong> {t('analyticsDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
