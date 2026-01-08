'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import {  Package, CurrencyEuro as Euro, Bank as Landmark, ChevronDown, ChevronUp, LinkExternal as ExternalLink, RefreshCw as Loader2  } from 'griddy-icons';

interface SellerCTACardProps {
  sellerStatus: string;
}

/**
 * Seller CTA card - Conversion funnel for becoming a seller.
 *
 * Shows different states:
 * - not_started: CTA with inline terms expansion
 * - onboarding: Continue to Stripe
 * - active: Hidden (handled by parent)
 *
 * Brand Voice:
 * - Title: "Start selling"
 * - Subtitle: "Turn waiting games into someone's next adventure"
 * - No exclamation marks
 * - Sentence case throughout
 */
export function SellerCTACard({ sellerStatus }: SellerCTACardProps) {
  const router = useRouter();

  // UI state
  const [showTerms, setShowTerms] = useState(false);

  // Form state
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Loading states
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [error, setError] = useState('');

  const handleBecomeSeller = () => {
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    if (!ageConfirmed || !termsAccepted) {
      setError('Please accept both checkboxes to continue');
      return;
    }

    setError('');
    setAcceptingTerms(true);

    try {
      const response = await fetch('/api/seller/onboarding/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: '1.0' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept terms');
      }

      // Redirect to Stripe onboarding
      router.push('/seller/onboard');
    } catch (err) {
      console.error('Failed to accept terms:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setAcceptingTerms(false);
    }
  };

  const handleContinueOnboarding = () => {
    router.push('/seller/onboard');
  };

  // If onboarding in progress, show continue button
  if (sellerStatus === 'onboarding') {
    return (
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
            <Package className="w-6 h-6 text-frost-ice" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-polar-night mb-2">
              Continue seller setup
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Almost there — complete your payment setup to start selling.
            </p>
            <div className="flex items-center gap-2 text-sm text-aurora-orange mb-4">
              <div className="w-2 h-2 bg-aurora-orange rounded-full animate-pulse" />
              Step 1 of 2 complete
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleContinueOnboarding}
            >
              Continue setup
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Default: not_started state
  return (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
          <Package className="w-6 h-6 text-frost-ice" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            Start selling
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Turn waiting games into someone&apos;s next adventure. No fees for
            sellers.
          </p>

          {!showTerms ? (
            // Initial CTA
            <Button variant="primary" size="lg" onClick={handleBecomeSeller}>
              Start selling
            </Button>
          ) : (
            // Inline terms form
            <div className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                  <p className="text-sm text-aurora-red">{error}</p>
                </div>
              )}

              {/* Age & Individual checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 text-frost-ice border-border rounded focus:ring-frost-ice flex-shrink-0"
                />
                <span className="text-sm text-text-secondary">
                  I&apos;m <strong>18 or older</strong> and selling as a{' '}
                  <strong>private individual</strong> (not a business)
                </span>
              </label>

              {/* Terms checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 text-frost-ice border-border rounded focus:ring-frost-ice flex-shrink-0"
                  />
                  <span className="text-sm text-text-secondary">
                    I accept the{' '}
                    <Link
                      href="/seller/terms"
                      target="_blank"
                      className="text-frost-ice hover:underline"
                    >
                      Seller Terms
                    </Link>
                  </span>
                </label>

                {/* Details (Expanded by default, left aligned) */}
                <div className="mt-3 p-4 bg-snow-stormLight border border-border rounded-lg text-sm">
                  <ul className="space-y-3 text-text-secondary">
                    <li className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-polar-night">
                          Zero commission fees
                        </strong>
                        <p className="text-xs mt-0.5">
                          You keep 100% of your sale price
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Landmark className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-polar-night">
                          EU tax reporting (DAC7)
                        </strong>
                        <p className="text-xs mt-0.5">
                          Above 30 sales or €2,000/year, we report to tax
                          authorities — it&apos;s EU law. Your dashboard
                          tracks these numbers so there are no surprises.{' '}
                          <Link
                            href="/seller/terms#dac7"
                            target="_blank"
                            className="text-frost-ice hover:underline"
                          >
                            Learn more
                          </Link>
                        </p>
                      </div>
                    </li>
                  </ul>

                  <div className="mt-4 pt-3 border-t border-border flex gap-4">
                    <Link
                      href="/seller/terms"
                      target="_blank"
                      className="text-xs text-frost-ice hover:underline flex items-center gap-1"
                    >
                      Full seller terms
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-xs text-frost-ice hover:underline flex items-center gap-1"
                    >
                      Privacy policy
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleAcceptTerms}
                  disabled={!ageConfirmed || !termsAccepted || acceptingTerms}
                  className="w-auto"
                >
                  {acceptingTerms ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Agree & continue'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowTerms(false)}
                  disabled={acceptingTerms}
                >
                  Maybe later
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}