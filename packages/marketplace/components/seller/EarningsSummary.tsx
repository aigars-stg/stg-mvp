'use client';

import { useState, useEffect } from 'react';
import { TrendUp as TrendingUp, ShoppingBag, Calendar, RefreshCw as Loader2, AlertCircle } from '@/lib/icons';
import { useTranslations } from 'next-intl';

interface EarningsData {
  totalSalesCount: number;
  totalGross: number;
  totalPlatformFees: number;
  totalNet: number;
  completedPayoutsCount: number;
  pendingPayoutsCount: number;
  salesLast30Days: number;
  earningsLast30Days: number;
}

export function EarningsSummary() {
  const t = useTranslations('SellerDashboard.EarningsSummary');
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/seller/earnings');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch earnings');
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-snow-white border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-aurora-purple/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-aurora-purple" />
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
      <div className="bg-snow-white border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-aurora-red/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-aurora-red" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <p className="text-sm text-aurora-red">{error}</p>
      </div>
    );
  }

  // No data or no sales state
  if (!data || data.totalSalesCount === 0) {
    return (
      <div className="bg-snow-white border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-aurora-purple/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-aurora-purple" />
          </div>
          <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-text-secondary">{t('noSales')}</p>
          <p className="text-sm text-text-muted">
            {t('noSalesHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-snow-white border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-aurora-purple/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-aurora-purple" />
        </div>
        <h3 className="text-lg font-semibold text-polar-night">{t('title')}</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Sales */}
        <div className="p-3 bg-bg-elevated rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs">{t('totalSales')}</span>
          </div>
          <p className="text-xl font-bold text-polar-night">
            {data.totalSalesCount}
          </p>
        </div>

        {/* Total Earned */}
        <div className="p-3 bg-bg-elevated rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">{t('totalEarned')}</span>
          </div>
          <p className="text-xl font-bold text-aurora-green">
            {formatCurrency(data.totalNet)}
          </p>
        </div>

        {/* This Month */}
        <div className="p-3 bg-bg-elevated rounded-lg col-span-2">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">{t('last30Days')}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-lg font-semibold text-polar-night">
              {data.salesLast30Days} {data.salesLast30Days === 1 ? t('sale') : t('sales')}
            </p>
            <p className="text-lg font-semibold text-aurora-green">
              {formatCurrency(data.earningsLast30Days)}
            </p>
          </div>
        </div>
      </div>

      {/* Payout Status */}
      {(data.pendingPayoutsCount > 0 || data.completedPayoutsCount > 0) && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('payoutsCompleted')}</span>
            <span className="font-medium text-polar-night">{data.completedPayoutsCount}</span>
          </div>
          {data.pendingPayoutsCount > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-text-secondary">{t('payoutsPending')}</span>
              <span className="font-medium text-aurora-yellow">{data.pendingPayoutsCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
