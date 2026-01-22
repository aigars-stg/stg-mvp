'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import { CheckCircleAlt01 as CheckCircle2, ArrowRight, Package, RefreshCw as Loader2, CreditCard } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { InstantBuyCard, ContactSellerCard } from '@/components/seller/onboard';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CountryCode } from '@/lib/country-utils';

const COUNTRY_CODES: { code: CountryCode; flagClass: string; nameKey: 'latvia' | 'estonia' | 'lithuania' }[] = [
  { code: 'LV', flagClass: 'fi fi-lv', nameKey: 'latvia' },
  { code: 'EE', flagClass: 'fi fi-ee', nameKey: 'estonia' },
  { code: 'LT', flagClass: 'fi fi-lt', nameKey: 'lithuania' },
];

// Countries where Stripe Connect is currently available
const STRIPE_AVAILABLE_COUNTRIES: CountryCode[] = ['LV'];

interface OnboardingStatus {
  seller_status: string;
  terms_accepted: boolean;
  stripe_connected: boolean;
  onboarding_completed: boolean;
  can_list_items: boolean;
  can_create_contact_seller?: boolean;
  can_create_instant_buy?: boolean;
}

type OnboardingStep = 'terms' | 'choice' | 'stripe';

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const t = useTranslations('SellerOnboard');

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectingCountry, setDetectingCountry] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [startingStripe, setStartingStripe] = useState(false);
  const [completingTermsOnly, setCompletingTermsOnly] = useState(false);
  const [savingCountry, setSavingCountry] = useState<CountryCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('terms');

  // Check if Stripe is available in user's country
  const stripeAvailable = profile?.country
    ? STRIPE_AVAILABLE_COUNTRIES.includes(profile.country as CountryCode)
    : false;

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
      router.push('/auth/signin?redirect=/seller/onboard');
    }
  }, [user, authLoading, router]);

  // Fetch onboarding status and auto-detect country if needed
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seller/onboarding/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);

      // If already fully onboarded (can list items), redirect to completion page
      if (data.onboarding_completed && data.can_list_items) {
        router.push('/seller/onboard/complete');
        return;
      }

      // Auto-detect country if not set (seamless - happens during loading)
      if (!profile?.country) {
        await detectAndSaveCountry();
      }

      // Pre-check terms if already accepted
      if (data.terms_accepted) {
        setTermsAccepted(true);
        // If terms are accepted but not fully onboarded, show choice screen
        if (!data.stripe_connected && data.seller_status === 'onboarding') {
          setCurrentStep('choice');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  // Complete terms-only onboarding (Contact Seller only)
  const handleCompleteTermsOnly = async () => {
    try {
      setCompletingTermsOnly(true);
      setError(null);

      const response = await fetch('/api/seller/onboarding/complete-terms-only', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Redirect to sell page
      router.push('/sell');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setCompletingTermsOnly(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Accept seller terms
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

      setTermsAccepted(true);
      // Go directly to choice screen
      setCurrentStep('choice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept terms');
    } finally {
      setAcceptingTerms(false);
    }
  };

  // Start Stripe onboarding
  const handleStartStripeOnboarding = async () => {
    try {
      setStartingStripe(true);
      setError(null);

      const response = await fetch('/api/seller/connect/onboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Stripe onboarding');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      setStartingStripe(false);
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

        {/* Benefits Grid Removed */}

        {/* Error Message */}
        {error && (
          <div className="bg-aurora-red/10 border border-aurora-red/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-aurora-red">{error}</p>
          </div>
        )}

        {/* Step 1: Accept Terms (shown when currentStep === 'terms') */}
        {currentStep === 'terms' && (
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
                    <Link href="/seller/terms" target="_blank" className="text-frost-ice hover:underline text-xs sm:text-sm">
                      {t('step1.readFullTerms')}
                    </Link>
                  </p>
                </div>

                {/* Country Selection - inline in terms step */}
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
                        <span>{t(`step1.country.${c.nameKey}`)}</span>
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
                    <Link href="/seller/terms" target="_blank" className="text-frost-ice hover:underline">
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
        )}

        {/* Step 2: Choice Screen (shown when currentStep === 'choice') */}
        {currentStep === 'choice' && (
          <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6 lg:p-8 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-aurora-green" />
              <span className="text-sm text-aurora-green">{t('step2.termsAccepted')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-polar-night mb-2">
              {t('step2.title')}
            </h2>
            <p className="text-text-secondary mb-6">
              {t('step2.subtitle')}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="order-2 sm:order-1">
                <ContactSellerCard
                  onSelect={handleCompleteTermsOnly}
                  loading={completingTermsOnly}
                  isPrimaryOption={!stripeAvailable}
                />
              </div>
              <div className="order-1 sm:order-2">
                <InstantBuyCard
                  stripeAvailable={stripeAvailable}
                  onSelect={() => setCurrentStep('stripe')}
                />
              </div>
            </div>

            <p className="text-xs text-text-secondary text-center">
              {t('step2.upgradeNote')}
            </p>
          </div>
        )}

        {/* Step 3: Stripe Connect (shown when currentStep === 'stripe') */}
        {currentStep === 'stripe' && (
          <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6 lg:p-8 mb-8">
            <button
              onClick={() => setCurrentStep('choice')}
              className="text-sm text-frost-ice hover:underline mb-4 flex items-center gap-1"
            >
              {t('step3.backButton')}
            </button>

            <h2 className="text-xl sm:text-2xl font-semibold text-polar-night mb-6">
              {t('step3.title')}
            </h2>

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 bg-frost-ice">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-2">
                  {t('step3.heading')}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {t('step3.description')}
                </p>

                {/* Requirements */}
                <div className="bg-snow-stormLight border border-border rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
                  <p className="text-xs sm:text-sm text-text-secondary mb-3">
                    <strong>{t('step3.requirements.title')}</strong>
                  </p>
                  <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{t('step3.requirements.id')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{t('step3.requirements.bank')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{t('step3.requirements.personal')}</span>
                    </li>
                  </ul>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="sm:w-auto"
                  onClick={handleStartStripeOnboarding}
                  loading={startingStripe}
                  disabled={startingStripe}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  {t('step3.continueButton')}
                </Button>
                <p className="text-xs text-text-secondary mt-2">
                  {t('step3.redirectNote')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* What's Next */}
        {status?.onboarding_completed && (
          <div className="bg-snow-white border border-border rounded-lg p-8">
            <h2 className="text-xl font-semibold text-polar-night mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-frost-ice" />
              {t('whatsNext.title')}
            </h2>
            <ul className="space-y-3 text-text-secondary">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>{t('whatsNext.step1')}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>{t('whatsNext.step2')}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>{t('whatsNext.step3')}</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>{t('whatsNext.step4')}</span>
              </li>
            </ul>

            <div className="mt-6 flex gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/sell')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {t('whatsNext.createListing')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/seller/onboard/complete')}
              >
                {t('whatsNext.viewDashboard')}
              </Button>
            </div>
          </div>
        )}

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
