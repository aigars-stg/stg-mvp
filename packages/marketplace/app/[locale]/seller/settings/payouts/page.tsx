'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import {
  RefreshCw as Loader2,
  CurrencyEuro as Euro,
  ArrowLeft,
  ArrowUp,
} from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { WalletTransactions } from '@/components/wallet/WalletTransactions';
import { WithdrawalForm } from '@/components/wallet/WithdrawalForm';
import { WithdrawalHistory } from '@/components/wallet/WithdrawalHistory';

function WalletWithdrawalsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [savedName, setSavedName] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/settings/payouts');
    }
  }, [user, authLoading, router]);

  // Fetch balance and saved IBAN
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [balanceRes, profileRes] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/seller/bank-account'),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalanceCents(data.balanceCents);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.hasAccount) {
          setSavedName(data.accountHolderName || undefined);
          // IBAN is masked (****XXXX) — don't pre-fill, user re-enters for security
        }
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleWithdrawalSuccess = () => {
    setShowWithdrawForm(false);
    setRefreshKey((prev) => prev + 1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
              Wallet & Withdrawals
            </h1>
          </div>
          <p className="text-text-secondary">
            Manage your earnings and withdraw funds
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Wallet Balance + Withdraw Button */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6">
          <div className="flex items-start justify-between">
            <WalletBalance compact key={refreshKey} />
            {balanceCents > 0 && !showWithdrawForm && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => setShowWithdrawForm(true)}
              >
                <ArrowUp className="w-4 h-4 mr-1.5" />
                Withdraw
              </Button>
            )}
          </div>
        </div>

        {/* Withdrawal Form Modal */}
        {showWithdrawForm && (
          <div className="bg-snow-white border-2 border-frost-ice rounded-xl p-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4">
              Request Withdrawal
            </h2>
            <WithdrawalForm
              balanceCents={balanceCents}
              savedName={savedName}
              onSuccess={handleWithdrawalSuccess}
              onCancel={() => setShowWithdrawForm(false)}
            />
          </div>
        )}

        {/* Withdrawal History */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">
            Withdrawal Requests
          </h2>
          <WithdrawalHistory key={`wh-${refreshKey}`} />
        </div>

        {/* Transaction History */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">
            Transaction History
          </h2>
          <WalletTransactions key={`wt-${refreshKey}`} />
        </div>

        {/* How It Works */}
        <div className="p-4 sm:p-6 bg-bg-elevated rounded-lg">
          <h4 className="font-medium text-polar-night mb-3">
            How Earnings Work
          </h4>
          <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">1.</span>
              <span>
                When a sale completes, your earnings (item price minus 10% commission) are credited to your wallet
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">2.</span>
              <span>
                You can withdraw your balance to your bank account at any time
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">3.</span>
              <span>
                Withdrawals are processed via bank transfer within 1-3 business days
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SellerPayoutSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <WalletWithdrawalsContent />
    </Suspense>
  );
}
