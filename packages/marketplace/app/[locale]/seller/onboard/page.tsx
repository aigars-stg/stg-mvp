'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@second-turn/design-system';
import { RefreshCw as Loader2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';
import { CountryPrompt } from '@/components/onboarding';

interface OnboardingStatus {
  seller_status: string;
  terms_accepted: boolean;
  onboarding_completed: boolean;
  can_list_items: boolean;
}

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const t = useTranslations('SellerOnboard');
  const tCountry = useTranslations('Countries');

  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/seller/onboard');
    }
  }, [user, authLoading, router]);

  // Fetch onboarding status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seller/onboarding/status');
      const data: OnboardingStatus = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      // If already active, redirect to sell page
      if (data.onboarding_completed && data.can_list_items) {
        router.push('/sell');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Accept seller terms and activate seller account
  const handleAcceptTerms = async () => {
    try {
      setAcceptingTerms(true);
      setError(null);

      const response = await fetch('/api/seller/onboarding/accept-terms', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept terms');
      }

      // Seller is now active — redirect to sell page with welcome toast
      router.push('/sell?welcome=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept terms');
    } finally {
      setAcceptingTerms(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-frost-ice animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            {t('header.title')}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-aurora-red/10 border border-aurora-red/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-aurora-red">{error}</p>
          </div>
        )}

        {/* Accept Terms */}
        <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6 lg:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-polar-night mb-6">
            {t('step1.title')}
          </h2>

          <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-2">
            {t('step1.heading')}
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {t('step1.description')}
          </p>

          <div className="bg-snow-stormLight border border-border rounded-lg p-3 sm:p-4 mb-4">
            <p className="font-semibold text-polar-night mb-2 sm:mb-3 text-sm sm:text-base">{t('step1.keyPoints.title')}</p>
            <ul className="space-y-2 text-xs sm:text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('step1.keyPoints.zeroFees') }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('step1.keyPoints.ageRequirement') }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('step1.keyPoints.personalItems') }} />
              </li>
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: t.raw('step1.keyPoints.accurateDescriptions') }} />
              </li>
            </ul>
            <p className="mt-3 sm:mt-4 pt-3 border-t border-border">
              <Link href="/legal/seller" target="_blank" className="text-frost-ice hover:underline text-xs sm:text-sm">
                {t('step1.readFullTerms')}
              </Link>
            </p>
          </div>

          {/* Country Selection */}
          {!profile?.country && <CountryPrompt />}
          {profile?.country && (
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
              <span className={`fi fi-${profile.country.toLowerCase()}`} />
              <span>{tCountry(profile.country as any)}</span>
            </div>
          )}

          <label className="flex items-start gap-2.5 sm:gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 sm:w-4 sm:h-4 text-frost-ice border-border rounded focus:ring-frost-ice flex-shrink-0"
              aria-label="Accept seller terms"
            />
            <span className="text-xs sm:text-sm text-text-secondary">
              {t('step1.checkbox')}{' '}
              <Link href="/legal/seller" target="_blank" className="text-frost-ice hover:underline">
                {t('step1.sellerTerms')}
              </Link>.
            </span>
          </label>

          <Button
            variant="primary"
            size="md"
            fullWidth
            className="sm:w-auto"
            onClick={handleAcceptTerms}
            disabled={!termsAccepted || !profile?.country || acceptingTerms}
            loading={acceptingTerms}
          >
            {t('step1.acceptButton')}
          </Button>
          {!profile?.country && termsAccepted && (
            <p className="text-xs text-aurora-orange mt-2">
              {t('step1.countryRequired')}
            </p>
          )}
        </div>

        {/* Support Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-text-secondary">
            {t('support.needHelp')}{' '}
            <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
              {t('support.contactUs')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
