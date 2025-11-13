'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { canLoadAnalytics } from '@/lib/cookie-consent';

/**
 * Conditionally loads Vercel Analytics and Speed Insights
 * based on user's cookie consent.
 *
 * GDPR Compliance: Analytics only loaded if user has consented.
 */
export function ConditionalAnalytics() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Check initial consent
    setShouldLoad(canLoadAnalytics());

    // Listen for consent changes
    const handleConsentChange = () => {
      setShouldLoad(canLoadAnalytics());
    };

    window.addEventListener('consentChanged', handleConsentChange);

    return () => {
      window.removeEventListener('consentChanged', handleConsentChange);
    };
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
