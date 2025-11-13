'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      aria-label="Cookie consent"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Message */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-polar-night">
              We use cookies
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              We use essential cookies to make our site work. With your consent, we may also use analytics cookies to improve your experience.
              <br />
              <Link
                href="/privacy#cookies"
                className="text-frost-ice underline hover:text-frost-sky"
              >
                Learn more about cookies
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
              Reject Optional
            </button>

            <button
              onClick={handleAcceptAll}
              className="rounded-lg border-2 border-frost-ice bg-frost-ice px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-frost-sky hover:border-frost-sky focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2 focus:ring-offset-bg-elevated"
              type="button"
            >
              Accept All
            </button>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-3 text-xs text-text-muted">
          <p>
            <strong>Essential cookies:</strong> Authentication, security (always active)
          </p>
          <p>
            <strong>Analytics cookies:</strong> Vercel Analytics, Speed Insights (requires consent)
          </p>
        </div>
      </div>
    </div>
  );
}
