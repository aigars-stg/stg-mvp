'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { Wallet, RefreshCw as Loader2, AlertCircle, ArrowUpRight, Plus, RefreshCw, Time as Clock, LinkExternal as ExternalLink, Settings } from 'griddy-icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatTime } from '@/lib/date-utils';

interface BalanceData {
  available: { amount: number; currency: string };
  pending: { amount: number; currency: string };
  total: { amount: number; currency: string };
}

interface PlatformHeldData {
  amount: number; // in cents
  orderCount: number;
  orders: Array<{
    id: string;
    order_number: string;
    items_total: number;
    status: string;
    created_at: string;
  }>;
}

interface BalanceResponse {
  hasAccount: boolean;
  payoutsEnabled?: boolean;
  hasBankAccount?: boolean;
  platformHeld?: PlatformHeldData;
  balance?: BalanceData;
  cachedAt?: string;
  message?: string;
}

interface EarningsData {
  totalSalesCount: number;
  salesLast30Days: number;
  earningsLast30Days: number;
}

interface PayoutSettingsData {
  payout_threshold: number;
  payout_type: 'auto' | 'manual';
}

interface BalanceCardProps {
  onRequestPayout?: () => void;
  onAddBankAccount?: () => void;
  onOpenPayoutSettings?: () => void;
}

export function BalanceCard({ onRequestPayout, onAddBankAccount, onOpenPayoutSettings }: BalanceCardProps) {
  const t = useTranslations('SellerDashboard.BalanceCard');
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch balance, earnings, and payout settings in parallel
      const [balanceResponse, earningsResponse, settingsResponse] = await Promise.all([
        fetch('/api/seller/balance'),
        fetch('/api/seller/earnings'),
        fetch('/api/seller/payout-settings'),
      ]);

      const balanceResult = await balanceResponse.json();
      if (!balanceResponse.ok) {
        throw new Error(balanceResult.error || 'Failed to fetch balance');
      }
      setData(balanceResult);

      // Earnings is optional - don't fail if it errors
      if (earningsResponse.ok) {
        const earningsResult = await earningsResponse.json();
        setEarnings(earningsResult);
      }

      // Payout settings optional
      if (settingsResponse.ok) {
        const settingsResult = await settingsResponse.json();
        setPayoutSettings(settingsResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatCurrencyFromEuros = (euros: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(euros);
  };

  const handleOpenStripeDashboard = async () => {
    try {
      setOpeningDashboard(true);
      const response = await fetch('/api/seller/connect/dashboard', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.dashboardUrl) {
          window.open(result.dashboardUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Error opening Stripe dashboard:', err);
    } finally {
      setOpeningDashboard(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-frost-ice" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
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
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <p className="text-sm text-aurora-red mb-4">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => fetchData()}>
          {t('tryAgain')}
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
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          {t('noAccount')}
        </p>
        <Link href="/seller/onboard">
          <Button variant="accent" size="sm" fullWidth>
            {t('startSelling')}
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
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          {t('noPayouts')}
        </p>
        <Link href="/seller/settings/payouts">
          <Button variant="accent" size="sm" fullWidth>
            {t('completeVerification')}
          </Button>
        </Link>
      </div>
    );
  }

  const balance = data.balance!;
  const platformHeld = data.platformHeld;
  const hasBalance = balance.total.amount > 0 || (platformHeld?.amount ?? 0) > 0;
  const canPayout = data.hasBankAccount && balance.available.amount > 0;

  // No sales yet state
  if (!hasBalance) {
    return (
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-frost-ice/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-frost-ice" />
            </div>
            <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 text-text-muted hover:text-frost-ice transition-colors"
            aria-label={t('refreshBalance')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="text-center py-6">
          <p className="text-text-secondary mb-2">
            {t('noSales')}
          </p>
          <p className="text-sm text-text-muted mb-4">
            {t('noSalesHint')}
          </p>
          <Link href="/my-listings">
            <Button variant="secondary" size="sm">
              {t('viewListings')}
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
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 text-text-muted hover:text-frost-ice transition-colors"
          aria-label={t('refreshBalance')}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance Display */}
      <div className="space-y-3 mb-4">
        {/* Platform-held funds (orders in progress) */}
        {platformHeld && platformHeld.amount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('heldUntilDelivery')}
            </span>
            <span className="text-lg text-text-muted">
              {formatCurrency(platformHeld.amount)}
            </span>
          </div>
        )}

        {platformHeld && platformHeld.orderCount > 0 && (
          <p className="text-xs text-text-muted">
            {platformHeld.orderCount === 1
              ? t('ordersInTransitSingular')
              : t('ordersInTransitPlural', { count: platformHeld.orderCount })}
          </p>
        )}

        {/* Available for payout */}
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">{t('availableForPayout')}</span>
          <span className="text-xl font-semibold text-aurora-green">
            {formatCurrency(balance.available.amount)}
          </span>
        </div>

        {balance.pending.amount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('pending')}
            </span>
            <span className="text-lg text-text-muted">
              {formatCurrency(balance.pending.amount)}
            </span>
          </div>
        )}

        {/* Info about fund release */}
        {platformHeld && platformHeld.amount > 0 && (
          <p className="text-xs text-text-muted pt-2 border-t border-border">
            {t('fundsReleasedInfo')}
          </p>
        )}
      </div>

      {/* Stats row - merged from EarningsSummary */}
      {earnings && earnings.totalSalesCount > 0 && (
        <div className="text-sm text-text-muted mb-4 pb-4 border-b border-border">
          {earnings.totalSalesCount === 1
            ? t('statsSingular', {
                count: earnings.totalSalesCount,
                amount: formatCurrencyFromEuros(earnings.earningsLast30Days),
              })
            : t('statsPlural', {
                count: earnings.totalSalesCount,
                amount: formatCurrencyFromEuros(earnings.earningsLast30Days),
              })}
        </div>
      )}

      {/* Auto-payout status */}
      {payoutSettings && data.hasBankAccount && (
        <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-border">
          <span className="text-text-secondary">
            {payoutSettings.payout_type === 'auto'
              ? `Auto-payout at €${payoutSettings.payout_threshold / 100}: Enabled`
              : 'Auto-payout: Off'}
          </span>
          <button
            onClick={onOpenPayoutSettings}
            className="p-1 text-text-muted hover:text-frost-ice transition-colors"
            aria-label="Payout settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Button */}
      {!data.hasBankAccount ? (
        <div className="p-3 bg-frost-ice/5 rounded-lg mb-4">
          <p className="text-sm text-text-secondary mb-3">
            {t('addBankHint')}
          </p>
          <Button
            variant="accent"
            size="sm"
            fullWidth
            onClick={onAddBankAccount}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('addBankAccount')}
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
          {t('requestPayout')}
        </Button>
      )}

      {/* Stripe Dashboard link */}
      <button
        onClick={handleOpenStripeDashboard}
        disabled={openingDashboard}
        className="w-full mt-3 text-sm text-frost-ice hover:text-frost-ice/80 transition-colors flex items-center justify-center gap-1"
      >
        {openingDashboard ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('openingStripe')}
          </>
        ) : (
          <>
            {t('viewInStripe')}
            <ExternalLink className="w-3 h-3" />
          </>
        )}
      </button>

      {/* Cache indicator */}
      {data.cachedAt && (
        <p className="text-xs text-text-muted text-center mt-3">
          {t('updated', { time: formatTime(data.cachedAt) })}
        </p>
      )}
    </div>
  );
}
