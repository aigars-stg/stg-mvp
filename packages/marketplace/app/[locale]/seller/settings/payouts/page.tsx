'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Badge } from '@second-turn/design-system';
import {  CheckCircleAlt01 as CheckCircle2, CloseCircle as XCircle, RefreshCw as Loader2, AlertCircle, LinkExternal as ExternalLink, CurrencyEuro as Euro, ArrowLeft  } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

function SellerPayoutSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get('success') === 'true';
  const refresh = searchParams.get('refresh') === 'true';

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/settings/payouts');
    }
  }, [user, authLoading, router]);

  // Fetch Connect status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/seller/connect/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);
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

  // Start onboarding
  const handleStartOnboarding = async () => {
    try {
      setOnboarding(true);
      setError(null);

      const response = await fetch('/api/seller/connect/onboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start onboarding');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      setOnboarding(false);
    }
  };

  // Open Stripe Dashboard
  const handleOpenDashboard = async () => {
    try {
      setOnboarding(true);

      const response = await fetch('/api/seller/connect/dashboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get dashboard link');
      }

      // Open in new tab
      window.open(data.dashboardUrl, '_blank');
      setOnboarding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open dashboard');
      setOnboarding(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading payout settings...</p>
        </div>
      </div>
    );
  }

  if (!user || !status) {
    return null;
  }

  const canReceivePayouts = status.hasAccount && status.onboardingComplete && status.payoutsEnabled;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Euro className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">Payout settings</h1>
          </div>
          <p className="text-text-secondary">Manage how you receive payments from sales</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Success Message - only show if actually complete */}
        {success && canReceivePayouts && (
          <div className="mb-6 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-green font-medium">Onboarding Complete!</p>
              <p className="text-sm text-text-secondary mt-1">
                Your payout account is set up. You'll automatically receive payments when orders are completed.
              </p>
            </div>
          </div>
        )}

        {/* Incomplete Message - returned from Stripe but not finished */}
        {(refresh || (success && !canReceivePayouts)) && (
          <div className="mb-6 p-4 bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-yellow font-medium">Onboarding Incomplete</p>
              <p className="text-sm text-text-secondary mt-1">
                You need to complete all required steps to receive payouts. Click "Continue Onboarding" below.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">Error</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-polar-night mb-1">Payout Status</h2>
              <p className="text-sm text-text-secondary">
                {canReceivePayouts
                  ? 'Your account is ready to receive payouts'
                  : 'Complete setup to receive automatic payouts'}
              </p>
            </div>
            <Badge variant={canReceivePayouts ? 'success' : 'warning'}>
              {canReceivePayouts ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Setup Required
                </>
              )}
            </Badge>
          </div>

          {/* Status Checks */}
          <div className="space-y-3">
            <StatusItem
              label="Connect Account"
              completed={status.hasAccount}
              description={status.hasAccount ? 'Account created' : 'No account yet'}
            />
            <StatusItem
              label="Onboarding Complete"
              completed={status.onboardingComplete}
              description={status.onboardingComplete ? 'All details submitted' : 'Pending verification'}
            />
            <StatusItem
              label="Payouts Enabled"
              completed={status.payoutsEnabled}
              description={status.payoutsEnabled ? 'Can receive transfers' : 'Verification pending'}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6">
          <h3 className="font-semibold text-polar-night mb-4">Actions</h3>

          {!status.hasAccount || !status.onboardingComplete ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Connect your bank account to receive automatic payouts when buyers complete orders.
                SecondTurn uses Stripe to ensure secure, timely payments.
              </p>
              <Button
                variant="accent"
                onClick={handleStartOnboarding}
                disabled={onboarding}
                fullWidth
              >
                {onboarding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {status.hasAccount ? 'Continue Onboarding' : 'Set Up Payouts'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Manage your payout settings, view payment history, and update your bank account in
                your Stripe dashboard.
              </p>
              <Button
                variant="secondary"
                onClick={handleOpenDashboard}
                disabled={onboarding}
                fullWidth
              >
                {onboarding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Stripe Dashboard
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 sm:p-6 bg-bg-elevated rounded-lg">
          <h4 className="font-medium text-polar-night mb-3">How Payouts Work</h4>
          <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>You receive <strong>100% of your listed price</strong> - no platform fees deducted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>Buyers pay all fees (service fee + shipping cost) separately</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>Payouts are automatically processed when you mark orders as shipped</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>Funds arrive in your bank account based on your Stripe payout schedule (typically 2-7 business days)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>You can view and adjust your payout schedule in the Stripe Dashboard</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SellerPayoutSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading payout settings...</p>
        </div>
      </div>
    }>
      <SellerPayoutSettingsContent />
    </Suspense>
  );
}

// Helper component for status items
function StatusItem({
  label,
  completed,
  description,
}: {
  label: string;
  completed: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {completed ? (
          <CheckCircle2 className="w-5 h-5 text-aurora-green" />
        ) : (
          <XCircle className="w-5 h-5 text-text-muted" />
        )}
      </div>
      <div className="flex-grow">
        <p className="font-medium text-polar-night">{label}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
