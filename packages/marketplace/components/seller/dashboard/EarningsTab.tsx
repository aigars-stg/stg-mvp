'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@second-turn/design-system';
import { ArrowUp } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { WalletTransactions } from '@/components/wallet/WalletTransactions';
import { WithdrawalForm } from '@/components/wallet/WithdrawalForm';
import { WithdrawalHistory } from '@/components/wallet/WithdrawalHistory';
import { BankAccountCard } from '@/components/seller/BankAccountCard';
import { BankAccountForm } from '@/components/seller/BankAccountForm';
import { Dac7WarningBanner } from '@/components/seller/Dac7WarningBanner';
import { useTranslations } from 'next-intl';
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

export function EarningsTab({ profile, onProfileRefresh }: EarningsTabProps) {
  const { user } = useAuth();
  const t = useTranslations('SellerDashboard');

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [savedName, setSavedName] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleBankAccountAdded = () => {
    setShowBankForm(false);
    onProfileRefresh();
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance + Withdraw Button */}
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <WalletBalance compact key={refreshKey} />
          {balanceCents > 0 && !showWithdrawForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowWithdrawForm(true)}
            >
              <ArrowUp className="w-4 h-4 mr-1.5" />
              {t('earnings.withdraw')}
            </Button>
          )}
        </div>
      </div>

      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <div className="bg-snow-white border-2 border-frost-ice rounded-xl p-6">
          <h2 className="text-lg font-semibold text-polar-night mb-4">
            {t('earnings.requestWithdrawal')}
          </h2>
          <WithdrawalForm
            balanceCents={balanceCents}
            savedName={savedName}
            onSuccess={handleWithdrawalSuccess}
            onCancel={() => setShowWithdrawForm(false)}
          />
        </div>
      )}

      {/* Bank Account */}
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-polar-night mb-4">{t('bankAccount.title')}</h3>
        {profile?.payout_iban ? (
          <>
            <BankAccountCard
              last4={profile.payout_iban.slice(-4)}
              bankName={profile.payout_account_holder_name || 'Bank'}
            />
            <button
              onClick={() => setShowBankForm(true)}
              className="mt-4 text-sm text-frost-ice hover:text-frost-ice/80 transition-colors"
            >
              {t('bankAccount.updateLink')}
            </button>
          </>
        ) : (
          <>
            <p className="text-text-secondary text-sm mb-4">
              {t('bankAccount.addDescription')}
            </p>
            <Button onClick={() => setShowBankForm(true)}>
              {t('bankAccount.addButton')}
            </Button>
          </>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-polar-night mb-4">
          {t('earnings.withdrawalRequests')}
        </h2>
        <WithdrawalHistory key={`wh-${refreshKey}`} />
      </div>

      {/* Transaction History */}
      <div className="bg-snow-white border-2 border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-polar-night mb-4">
          {t('earnings.transactionHistory')}
        </h2>
        <WalletTransactions key={`wt-${refreshKey}`} />
      </div>

      {/* DAC7 Compliance Section */}
      {profile?.dac7_compliance_status &&
        profile.dac7_compliance_status !== 'exempt' && (
          <Dac7WarningBanner
            complianceStatus={profile.dac7_compliance_status}
            annualTransactionCount={profile.dac7_annual_transaction_count || 0}
            annualSalesTotal={profile.dac7_annual_sales_total || 0}
          />
        )}

      {/* How Earnings Work */}
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

      {/* Bank Account Form Modal */}
      {showBankForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBankForm(false)}
          />
          <div className="relative bg-snow-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-polar-night mb-4">
              {profile?.payout_iban ? t('bankAccountModal.updateTitle') : t('bankAccountModal.addTitle')}
            </h2>
            <BankAccountForm
              onSuccess={handleBankAccountAdded}
              onCancel={() => setShowBankForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
