'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@second-turn/design-system';
import { ArrowUp, Wallet, TrendUp, CurrencyDollar, Time as Clock, AlertTriangle } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { WalletTransactions } from '@/components/wallet/WalletTransactions';
import { WithdrawalForm } from '@/components/wallet/WithdrawalForm';
import { WithdrawalHistory } from '@/components/wallet/WithdrawalHistory';
import { Dac7WarningBanner } from '@/components/seller/Dac7WarningBanner';
import { useTranslations } from 'next-intl';
import { formatCentsToCurrency } from '@/lib/services/pricing';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

interface SellerProfile {
  seller_status: string;
  payout_iban: string | null;
  payout_account_holder_name: string | null;
  dac7_compliance_status: Dac7ComplianceStatus | null;
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
}

interface EarningsTabProps {
  profile: SellerProfile | null;
  onProfileRefresh: () => void;
}

interface EarningsSummary {
  walletBalance: number;
  earningsLast30Days: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}

function SkeletonStatCard() {
  return (
    <div className="bg-snow-white border border-border rounded-lg p-4 flex flex-col gap-2">
      <Skeleton variant="circular" className="w-8 h-8" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  hint,
  value,
  accent,
  action,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  value: string;
  accent?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-snow-white border rounded-lg p-4 flex flex-col gap-2 ${accent ? 'border-frost-ice/40 bg-frost-ice/5' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${accent ? 'bg-frost-ice/20' : 'bg-bg-elevated'}`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-frost-ice' : 'text-text-secondary'}`} />
        </div>
        {action}
      </div>
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold ${accent ? 'text-frost-ice' : 'text-polar-night'}`}>{value}</p>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export function EarningsTab({ profile, onProfileRefresh: _onProfileRefresh }: EarningsTabProps) {
  const { user } = useAuth();
  const t = useTranslations('SellerDashboard');

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [savedIban, setSavedIban] = useState<string | undefined>();
  const [savedName, setSavedName] = useState<string | undefined>();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [balanceRes, bankRes, earningsRes] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/seller/bank-account'),
        fetch('/api/seller/earnings'),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalanceCents(data.balanceCents);
      }

      if (bankRes.ok) {
        const data = await bankRes.json();
        if (data.hasAccount) {
          setSavedIban(data.iban || undefined);
          setSavedName(data.accountHolderName || undefined);
        }
      }

      if (earningsRes.ok) {
        const data = await earningsRes.json();
        setSummary({
          walletBalance: data.walletBalance,
          earningsLast30Days: data.earningsLast30Days,
          totalWithdrawn: data.totalWithdrawn,
          pendingWithdrawals: data.pendingWithdrawals,
        });
      }
    } catch {
      // Silently fail
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleWithdrawalSuccess = () => {
    setShowWithdrawForm(false);
    setRefreshKey((prev) => prev + 1);
  };

  const euroCents = (euros: number) => Math.round(euros * 100);

  return (
    <div className="space-y-6">
      {/* DAC7 banner — full width above the grid */}
      {profile?.dac7_compliance_status && profile.dac7_compliance_status !== 'exempt' && (
        <Dac7WarningBanner
          complianceStatus={profile.dac7_compliance_status}
          annualTransactionCount={profile.dac7_annual_transaction_count || 0}
          annualSalesTotal={profile.dac7_annual_sales_total || 0}
        />
      )}

      {/* IBAN nudge — show when seller has no payout details configured */}
      {!statsLoading && !profile?.payout_iban && (
        <div className="bg-aurora-orange/10 border border-aurora-orange/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-aurora-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-polar-night">{t('earnings.payoutNudge.title')}</p>
              <p className="text-sm text-text-secondary mt-0.5">{t('earnings.payoutNudge.description')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawForm(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-snow-white bg-aurora-orange hover:bg-aurora-orange/90 rounded-lg transition-colors whitespace-nowrap"
          >
            {t('earnings.payoutNudge.action')}
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label={t('earnings.stats.available')}
              hint={t('earnings.stats.availableHint')}
              value={formatCentsToCurrency(balanceCents)}
              accent
              action={
                balanceCents > 0 && !showWithdrawForm ? (
                  <button
                    onClick={() => setShowWithdrawForm(true)}
                    className="flex items-center gap-1 text-xs font-medium text-frost-ice hover:text-frost-ice/80 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    {t('earnings.withdraw')}
                  </button>
                ) : undefined
              }
            />
            <StatCard
              icon={TrendUp}
              label={t('earnings.stats.earnedThisMonth')}
              value={formatCentsToCurrency(euroCents(summary?.earningsLast30Days ?? 0))}
            />
            <StatCard
              icon={CurrencyDollar}
              label={t('earnings.stats.totalWithdrawn')}
              value={formatCentsToCurrency(euroCents(summary?.totalWithdrawn ?? 0))}
            />
            <StatCard
              icon={Clock}
              label={t('earnings.stats.pendingWithdrawals')}
              value={t('earnings.stats.pendingCount', { count: summary?.pendingWithdrawals ?? 0 })}
            />
          </>
        )}
      </div>

      {/* Withdrawal form — shown between stats and main content on all screen sizes */}
      {showWithdrawForm && (
        <div className="bg-snow-white border border-frost-ice/30 rounded-lg p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-polar-night mb-4">
            {t('earnings.requestWithdrawal')}
          </h2>
          <WithdrawalForm
            balanceCents={balanceCents}
            savedIban={savedIban}
            savedName={savedName}
            onSuccess={handleWithdrawalSuccess}
            onCancel={() => setShowWithdrawForm(false)}
          />
        </div>
      )}

      {/* Main content + sidebar */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Transaction history table */}
          <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-polar-night mb-4">
              {t('earnings.transactionHistory')}
            </h2>
            <WalletTransactions key={`wt-${refreshKey}`} />
          </div>

          {/* Withdrawal history */}
          <div className="bg-snow-white border border-border rounded-lg p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-polar-night mb-4">
              {t('earnings.withdrawalRequests')}
            </h2>
            <WithdrawalHistory key={`wh-${refreshKey}`} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="p-4 sm:p-6 bg-bg-elevated rounded-lg">
            <h4 className="font-medium text-polar-night mb-3">
              {t('earnings.howItWorks')}
            </h4>
            <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">1.</span>
                <span>{t('earnings.step1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">2.</span>
                <span>{t('earnings.step2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-frost-ice mt-0.5 flex-shrink-0">3.</span>
                <span>{t('earnings.step3')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
