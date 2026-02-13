'use client';

import { useState, useEffect } from 'react';
import { Card } from '@second-turn/design-system';
import { Email as Mail, RefreshCw as Loader2 } from '@/lib/icons';
import { useTranslations } from 'next-intl';

export function NewsletterSettings() {
  const t = useTranslations('Newsletter');

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current subscription status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/newsletter/status');
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.subscribed);
        }
      } catch {
        console.error('Failed to fetch newsletter status');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const handleToggle = async () => {
    setIsSaving(true);
    setError(null);

    const newState = !isSubscribed;

    // Optimistic update
    setIsSubscribed(newState);

    try {
      if (newState) {
        // Subscribe
        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'settings' }),
        });

        if (!response.ok) {
          throw new Error('Failed to subscribe');
        }
      } else {
        // Unsubscribe
        const response = await fetch('/api/newsletter/unsubscribe', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to unsubscribe');
        }
      }
    } catch {
      // Revert on error
      setIsSubscribed(!newState);
      setError(t('settingsError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card padding="lg" className="sm:p-6 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
          <span className="text-text-secondary">{t('settingsLoading')}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="sm:p-6 p-4">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-polar-night">
                {t('settingsTitle')}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {t('settingsDescription')}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggle}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                isSubscribed ? 'bg-frost-ice' : 'bg-border'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={isSubscribed}
              aria-label={isSubscribed ? t('settingsUnsubscribe') : t('settingsSubscribe')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-snow-white transition-transform ${
                  isSubscribed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-aurora-red">{error}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
