'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';
import { Check, Sparks as Sparkles } from '@/lib/icons';

const DISMISS_KEY = 'stg_onboarding_dismissed';
const MAX_AGE_DAYS = 7;

export function OnboardingChecklist() {
  const t = useTranslations('OnboardingChecklist');
  const { user, profile, isProfileComplete } = useAuth();
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  if (!user || !profile || dismissed) return null;

  // Only show for accounts less than 7 days old
  const accountAge = Date.now() - new Date(profile.created_at).getTime();
  if (accountAge > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;

  const isSeller = profile.seller_status === 'active';

  // All steps complete — don't show
  if (isProfileComplete && isSeller) return null;

  // Note: "country" step omitted — CountryPrompt handles it inline on the homepage.
  // isProfileComplete already requires country + name, so the profile step covers it.
  const steps = [
    { key: 'profile', done: isProfileComplete, href: '/account/settings' },
    { key: 'sell', done: isSeller, href: '/seller/onboard' },
  ] as const;

  const completedCount = steps.filter((s) => s.done).length;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-snow-white border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-aurora-orange" />
          <span className="text-sm font-semibold text-polar-night">
            {t('title')}
          </span>
          <span className="text-xs text-text-muted">
            {t('progress', { completed: completedCount, total: steps.length })}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-polar-night text-lg leading-none"
          aria-label={t('dismiss')}
        >
          &times;
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.key}
            href={step.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              step.done
                ? 'bg-aurora-green/5 text-text-muted'
                : 'bg-snow-storm hover:bg-frost-ice/10 text-polar-night'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.done
                  ? 'bg-aurora-green/20'
                  : 'border border-border'
              }`}
            >
              {step.done && (
                <Check className="w-3 h-3 text-aurora-green" />
              )}
            </div>
            <span className={step.done ? 'line-through' : ''}>
              {t(`steps.${step.key}`)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
