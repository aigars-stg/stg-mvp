'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  DollarSign,
  Clock,
  Users,
  Package,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import type { CountryCode } from '@/lib/country-utils';

const COUNTRIES: { code: CountryCode; flagClass: string; name: string }[] = [
  { code: 'LV', flagClass: 'fi fi-lv', name: 'Latvia' },
  { code: 'EE', flagClass: 'fi fi-ee', name: 'Estonia' },
  { code: 'LT', flagClass: 'fi fi-lt', name: 'Lithuania' },
];

interface OnboardingStatus {
  seller_status: string;
  terms_accepted: boolean;
  stripe_connected: boolean;
  onboarding_completed: boolean;
  can_list_items: boolean;
}

export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [startingStripe, setStartingStripe] = useState(false);
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/onboard');
    }
  }, [user, authLoading, router]);

  // Fetch onboarding status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seller/onboarding/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);

      // If already fully onboarded, redirect to completion page
      if (data.onboarding_completed && data.can_list_items) {
        router.push('/seller/onboard/complete');
      }

      // Pre-check terms if already accepted
      if (data.terms_accepted) {
        setTermsAccepted(true);
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
      await fetchStatus(); // Refresh status
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
            Become a seller
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Turn your games into earnings. Quick setup, zero fees, fast payouts.
          </p>
        </div>

        {/* Benefits Grid Removed */}

        {/* Error Message */}
        {error && (
          <div className="bg-aurora-red/10 border border-aurora-red/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-aurora-red">{error}</p>
          </div>
        )}

        {/* Onboarding Steps */}
        <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6 lg:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-polar-night mb-6">
            Quick setup - 2 steps
          </h2>

          {/* Step 1: Accept Terms */}
          <div className="mb-8">
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 ${status?.terms_accepted ? 'bg-aurora-green' : 'bg-frost-ice'
                }`}>
                {status?.terms_accepted ? (
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <span className="text-white font-semibold text-base sm:text-lg">1</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-2">
                  {status?.terms_accepted ? 'Seller terms accepted' : 'Accept seller terms'}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {status?.terms_accepted ? '' : "Review and accept our seller terms to confirm you're selling as a private individual."}
                </p>

                {!status?.terms_accepted && (
                  <>
                    <div className="bg-snow-stormLight border border-border rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
                      <p className="font-semibold text-polar-night mb-2 sm:mb-3 text-sm sm:text-base">Key points:</p>
                      <ul className="space-y-2 text-xs sm:text-sm text-text-secondary">
                        <li className="flex items-start gap-2">
                          <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                          <span><strong>Zero fees</strong> — you keep 100% of your sale price</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                          <span>You must be at least <strong>18 years old</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                          <span>You're selling <strong>personal items</strong>, not operating a business</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
                          <span>You're responsible for accurate listings and timely shipping</span>
                        </li>
                      </ul>
                      <p className="mt-3 sm:mt-4 pt-3 border-t border-border">
                        <Link href="/seller/terms" target="_blank" className="text-frost-ice hover:underline text-xs sm:text-sm">
                          Read full Seller Terms →
                        </Link>
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
                        I confirm I'm 18+, selling personal items, and agree to the{' '}
                        <Link href="/seller/terms" target="_blank" className="text-frost-ice hover:underline">
                          Seller Terms
                        </Link>.
                      </span>
                    </label>

                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      className="sm:w-auto"
                      onClick={handleAcceptTerms}
                      disabled={!termsAccepted || acceptingTerms}
                      loading={acceptingTerms}
                    >
                      Accept seller terms
                    </Button>
                  </>
                )}

                {status?.terms_accepted && (
                  <div className="bg-aurora-green/10 border border-aurora-green/30 rounded-lg p-3">
                    <p className="text-sm text-aurora-green">
                      Terms accepted on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Stripe Connect */}
          <div>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 ${status?.stripe_connected ? 'bg-aurora-green' : status?.terms_accepted ? 'bg-frost-ice' : 'bg-snow-storm'
                }`}>
                {status?.stripe_connected ? (
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <span className={`font-semibold text-base sm:text-lg ${status?.terms_accepted ? 'text-white' : 'text-text-secondary'}`}>2</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-2">
                  {status?.stripe_connected ? 'Payment account connected' : 'Connect payment account'}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  We use Stripe to handle payouts securely - a payment platform trusted by Airbnb, Shopify, and millions of businesses worldwide. Your money goes directly to your bank. We never see or hold your funds.
                </p>

                {!status?.stripe_connected && status?.terms_accepted && (
                  <>
                    {/* Country Selection - only show if country not already set */}
                    {!profile?.country && (
                      <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
                        <p className="text-xs sm:text-sm text-text-secondary mb-3">
                          <strong>Select your country:</strong>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {COUNTRIES.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => handleSelectCountry(c.code)}
                              disabled={savingCountry !== null}
                              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                profile?.country === c.code
                                  ? 'bg-frost-ice text-white'
                                  : 'bg-snow-white hover:bg-frost-ice/20 border border-border'
                              }`}
                            >
                              {savingCountry === c.code ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <span className={c.flagClass} />
                              )}
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    <div className="bg-snow-stormLight border border-border rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
                      <p className="text-xs sm:text-sm text-text-secondary mb-3">
                        <strong>You'll need:</strong>
                      </p>
                      <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span>Government-issued ID (passport, ID card, or driver's license)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span>Bank account details (IBAN for SEPA transfers)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span>Personal information (name, date of birth, address)</span>
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
                      disabled={!profile?.country}
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                      Continue to Stripe
                    </Button>
                    {!profile?.country ? (
                      <p className="text-xs text-aurora-orange mt-2">
                        Select your country above to continue
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary mt-2">
                        You'll be redirected to Stripe's secure onboarding (2 min)
                      </p>
                    )}
                  </>
                )}

                {!status?.terms_accepted && (
                  <p className="text-sm text-text-secondary italic">
                    Accept terms above to continue
                  </p>
                )}

                {status?.stripe_connected && (
                  <div className="bg-aurora-green/10 border border-aurora-green/30 rounded-lg p-3">
                    <p className="text-sm text-aurora-green mb-2">
                      Payment account successfully connected!
                    </p>
                    <Link
                      href="/seller/onboard/complete"
                      className="text-sm text-frost-ice hover:underline font-medium"
                    >
                      Continue to dashboard →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* What's Next */}
        {status?.onboarding_completed && (
          <div className="bg-snow-white border border-border rounded-lg p-8">
            <h2 className="text-xl font-semibold text-polar-night mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-frost-ice" />
              What's next?
            </h2>
            <ul className="space-y-3 text-text-secondary">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>Create your first listing - describe your game and set a price</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>When someone buys, you'll get an email with shipping details</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>Drop off at any Unisend parcel terminal within 2 business days</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0" />
                <span>Receive payment directly to your bank account</span>
              </li>
            </ul>

            <div className="mt-6 flex gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/sell')}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Create first listing
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/seller/onboard/complete')}
              >
                View dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Support Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-text-secondary">
            Need help?{' '}
            <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
