'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { Wallet, RefreshCw as Loader2, AlertCircle, ArrowUpRight, Plus, RefreshCw, Time as Clock } from 'griddy-icons';
import Link from 'next/link';

interface BalanceData {
  available: { amount: number; currency: string };
  pending: { amount: number; currency: string };
  total: { amount: number; currency: string };
}

interface BalanceResponse {
  hasAccount: boolean;
  payoutsEnabled?: boolean;
  hasBankAccount?: boolean;
  balance?: BalanceData;
  cachedAt?: string;
  message?: string;
}

interface BalanceCardProps {
  onRequestPayout?: () => void;
  onAddBankAccount?: () => void;
}

export function BalanceCard({ onRequestPayout, onAddBankAccount }: BalanceCardProps) {
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/seller/balance');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch balance');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-frost-ice" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-aurora-red/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-aurora-red" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
        </div>
        <p className="text-sm text-aurora-red mb-4">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => fetchBalance()}>
          Try Again
        </Button>
      </div>
    );
  }

  // No account state
  if (!data?.hasAccount) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-frost-ice" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Complete seller onboarding to view your balance and receive payments.
        </p>
        <Link href="/seller/onboard">
          <Button variant="accent" size="sm" fullWidth>
            Start Selling
          </Button>
        </Link>
      </div>
    );
  }

  // Onboarding incomplete state
  if (!data.payoutsEnabled) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-aurora-yellow/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-aurora-yellow" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Complete Stripe verification to enable payouts and view your balance.
        </p>
        <Link href="/seller/settings/payouts">
          <Button variant="accent" size="sm" fullWidth>
            Complete Verification
          </Button>
        </Link>
      </div>
    );
  }

  const balance = data.balance!;
  const hasBalance = balance.total.amount > 0;
  const canPayout = hasBalance && data.hasBankAccount && balance.available.amount > 0;

  // No sales yet state
  if (!hasBalance) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-frost-ice" />
            </div>
            <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
          </div>
          <button
            onClick={() => fetchBalance(true)}
            disabled={refreshing}
            className="p-2 text-text-muted hover:text-frost-ice transition-colors"
            aria-label="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="text-center py-6">
          <p className="text-text-secondary mb-2">
            You haven't made any sales yet.
          </p>
          <p className="text-sm text-text-muted mb-4">
            Once you sell a game, your earnings will appear here.
          </p>
          <Link href="/my-listings">
            <Button variant="secondary" size="sm">
              View Your Listings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Has balance state
  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-aurora-green/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-aurora-green" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">Your Balance</h3>
        </div>
        <button
          onClick={() => fetchBalance(true)}
          disabled={refreshing}
          className="p-2 text-text-muted hover:text-frost-ice transition-colors"
          aria-label="Refresh balance"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance Display */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Available</span>
          <span className="text-xl font-semibold text-aurora-green">
            {formatCurrency(balance.available.amount)}
          </span>
        </div>

        {balance.pending.amount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </span>
            <span className="text-lg text-text-muted">
              {formatCurrency(balance.pending.amount)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-polar-night">Total</span>
            <span className="text-xl font-bold text-polar-night">
              {formatCurrency(balance.total.amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {!data.hasBankAccount ? (
        <div className="p-3 bg-frost-ice/5 rounded-lg mb-4">
          <p className="text-sm text-text-secondary mb-3">
            Add a bank account to withdraw your earnings.
          </p>
          <Button
            variant="accent"
            size="sm"
            fullWidth
            onClick={onAddBankAccount}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      ) : (
        <Button
          variant="accent"
          size="sm"
          fullWidth
          disabled={!canPayout}
          onClick={onRequestPayout}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Request Payout
        </Button>
      )}

      {/* Cache indicator */}
      {data.cachedAt && (
        <p className="text-xs text-text-muted text-center mt-3">
          Updated {new Date(data.cachedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
