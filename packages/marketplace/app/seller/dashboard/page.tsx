'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { BalanceCard } from '@/components/seller/BalanceCard';
import { EarningsSummary } from '@/components/seller/EarningsSummary';
import { TransactionList } from '@/components/seller/TransactionList';
import { PayoutHistory } from '@/components/seller/PayoutHistory';
import { BankAccountCard } from '@/components/seller/BankAccountCard';
import { BankAccountForm } from '@/components/seller/BankAccountForm';
import { PayoutConfirmModal } from '@/components/seller/PayoutConfirmModal';
import { SellerTrustCard } from '@/components/seller/SellerTrustCard';

interface SellerProfile {
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_completed: boolean;
  stripe_connect_payouts_enabled: boolean;
  has_bank_account: boolean;
  bank_account_last4: string | null;
  bank_account_bank_name: string | null;
}

interface BalanceData {
  available: number;
  pending: number;
  total: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/signin?redirect=/seller/dashboard');
        return;
      }

      // Fetch seller profile
      const { data: profileData, error } = await supabase
        .from('seller_profiles')
        .select(`
          stripe_connect_account_id,
          stripe_connect_onboarding_completed,
          stripe_connect_payouts_enabled,
          has_bank_account,
          bank_account_last4,
          bank_account_bank_name
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setLoading(false);

      // Check if seller onboarding is complete
      if (!profileData?.stripe_connect_onboarding_completed) {
        router.push('/seller/onboard');
      }

      // Fetch balance for payout modal
      if (profileData?.stripe_connect_payouts_enabled) {
        try {
          const response = await fetch('/api/seller/balance');
          const data = await response.json();
          if (response.ok && data.balance) {
            setBalance({
              available: data.balance.available,
              pending: data.balance.pending,
              total: data.balance.total,
            });
          }
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      }
    };

    checkAuth();
  }, [router, supabase, refreshKey]);

  const handleRequestPayout = () => {
    setShowPayoutModal(true);
  };

  const handlePayoutComplete = () => {
    setShowPayoutModal(false);
    // Refresh data
    setRefreshKey(prev => prev + 1);
  };

  const handleBankAccountAdded = () => {
    setShowBankForm(false);
    // Refresh profile to get updated bank account info
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-bg-elevated rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-bg-elevated rounded-xl" />
              <div className="h-48 bg-bg-elevated rounded-xl" />
            </div>
            <div className="h-64 bg-bg-elevated rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/my-listings"
              className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-polar-night">Seller Dashboard</h1>
              <p className="text-sm text-text-secondary">
                Manage your earnings, payouts, and transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Link href="/seller/settings">
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Top Row: Balance & Earnings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BalanceCard
              key={`balance-${refreshKey}`}
              onRequestPayout={handleRequestPayout}
              onAddBankAccount={() => setShowBankForm(true)}
            />
            <EarningsSummary key={`earnings-${refreshKey}`} />
          </div>

          {/* Trust & Reputation */}
          <SellerTrustCard key={`trust-${refreshKey}`} />

          {/* Bank Account Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profile?.has_bank_account ? (
              <div className="bg-snow-white border-2 border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-polar-night mb-4">Bank Account</h3>
                <BankAccountCard
                  last4={profile.bank_account_last4 || '****'}
                  bankName={profile.bank_account_bank_name || 'Bank'}
                />
                <button
                  onClick={() => setShowBankForm(true)}
                  className="mt-4 text-sm text-frost-ice hover:text-frost-ice/80 transition-colors"
                >
                  Update bank account
                </button>
              </div>
            ) : (
              <div className="bg-snow-white border-2 border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-polar-night mb-2">
                  Bank Account
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Add a bank account to withdraw your earnings
                </p>
                <Button onClick={() => setShowBankForm(true)}>
                  Add Bank Account
                </Button>
              </div>
            )}

            <PayoutHistory key={`payouts-${refreshKey}`} limit={3} />
          </div>

          {/* Recent Transactions */}
          <TransactionList key={`transactions-${refreshKey}`} limit={5} showViewAll />
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Quick Links</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/my-listings">
              <Button variant="secondary" size="sm">My Listings</Button>
            </Link>
            <Link href="/seller/orders">
              <Button variant="secondary" size="sm">Manage Orders</Button>
            </Link>
            <Link href="/sell">
              <Button variant="secondary" size="sm">Create Listing</Button>
            </Link>
            <Link href="/seller/transactions">
              <Button variant="secondary" size="sm">All Transactions</Button>
            </Link>
          </div>
        </div>
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
              {profile?.has_bank_account ? 'Update Bank Account' : 'Add Bank Account'}
            </h2>
            <BankAccountForm
              onSuccess={handleBankAccountAdded}
              onCancel={() => setShowBankForm(false)}
            />
          </div>
        </div>
      )}

      {/* Payout Confirmation Modal */}
      <PayoutConfirmModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        onSuccess={handlePayoutComplete}
        availableAmount={balance?.available || 0}
        bankLast4={profile?.bank_account_last4 || '****'}
        bankName={profile?.bank_account_bank_name || 'Bank'}
      />
    </div>
  );
}
