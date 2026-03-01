'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@second-turn/design-system';
import { RefreshCw as Loader2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import type { CountryCode } from '@/lib/country-utils';

const COUNTRY_CODES: { code: CountryCode; flagClass: string }[] = [
  { code: 'LV', flagClass: 'fi fi-lv' },
  { code: 'EE', flagClass: 'fi fi-ee' },
  { code: 'LT', flagClass: 'fi fi-lt' },
];

interface OnboardingStatus {
  seller_status: string;
  terms_accepted: boolean;
  onboarding_completed: boolean;
  can_list_items: boolean;
}

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const t = useTranslations('SellerOnboard');
  const tCountry = useTranslations('Countries');

  const [loading, setLoading] = useState(true);
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [savingCountry, setSavingCountry] = useState<CountryCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCountry = async (country: CountryCode) => {
    if (!user || savingCountry) return;

    setSavingCountry(country);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ country })
        .eq('id', user.id);

      if (updateError) throw updateError;
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save country:', err);
      setError('Failed to save country. Please try again.');
    } finally {
      setSavingCountry(null);
    }
  };

  // Auto-detect country from IP and save if Baltic country
  const detectAndSaveCountry = async (): Promise<boolean> => {
    if (!user || profile?.country) return false;

    try {
      setDetectingCountry(true);
      const response = await fetch('/api/geo/detect');
      const data = await response.json();

      if (data.detected && data.country) {
        // Auto-save the detected Baltic country
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ country: data.country })
          .eq('id', user.id);

        if (!updateError) {
          await refreshProfile();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Country detection failed:', err);
      return false;
    } finally {
      setDetectingCountry(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirectTo=/seller/onboard');
    }
  }, [user, authLoading, router]);

  // Fetch onboarding status and auto-detect country if needed
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seller/onboarding/status');
      const data: OnboardingStatus = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      // If already active, redirect to completion page
      if (data.onboarding_completed && data.can_list_items) {
        router.push('/seller/onboard/complete');
        return;
      }

      // Auto-detect country if not set (seamless - happens during loading)
      if (!profile?.country) {
        await detectAndSaveCountry();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: '1.0' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept terms');
      }

      // Seller is now active — redirect to completion page
      router.push('/seller/onboard/complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept terms');
    } finally {
      setAcceptingTerms(false);
    }
  };

  if (authLoading || loading || detectingCountry) {
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

          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 bg-frost-ice">
              <span className="text-white font-semibold text-base sm:text-lg">1</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-2">
                {t('step1.heading')}
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                {t('step1.description')}
              </p>

              <div className="bg-snow-stormLight border border-border rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
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
              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
                <p className="font-semibold text-polar-night mb-3 text-sm sm:text-base">
                  {t('step1.country.title')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {COUNTRY_CODES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c.code)}
                      disabled={savingCountry !== null}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 ${
                        profile?.country === c.code
                          ? 'bg-frost-ice text-white border-2 border-frost-ice'
                          : 'bg-snow-white hover:border-frost-ice border-2 border-border'
                      }`}
                    >
                      {savingCountry === c.code ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className={c.flagClass} />
                      )}
                      <span>{tCountry(c.code)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  {t('step1.country.hint')}
                </p>
              </div>

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
          </div>
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
