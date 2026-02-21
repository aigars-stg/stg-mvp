'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { RefreshCw as Loader2 } from '@/lib/icons';
import { OrdersTab } from '@/components/seller/dashboard/OrdersTab';
import { EarningsTab } from '@/components/seller/dashboard/EarningsTab';
import { ReviewsTab } from '@/components/seller/dashboard/ReviewsTab';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

type DashboardTab = 'orders' | 'earnings' | 'reviews';

const VALID_TABS: DashboardTab[] = ['orders', 'earnings', 'reviews'];

interface SellerProfile {
  seller_status: string;
  payout_iban: string | null;
  payout_account_holder_name: string | null;
  dac7_compliance_status: Dac7ComplianceStatus | null;
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
}

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
        active
          ? 'bg-frost-ice text-white'
          : 'text-frost-ice hover:bg-frost-ice/20'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs rounded-full bg-aurora-orange text-white min-w-[20px] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function SellerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations('SellerDashboard');

  // Read initial tab from URL
  const tabParam = searchParams.get('tab') as DashboardTab | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'orders';
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  // Seller profile state
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pending orders badge count (updated by OrdersTab)
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch seller profile + check onboarding status
  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profileData, error } = await supabase
        .from('seller_profiles')
        .select(`
          seller_status,
          payout_iban,
          payout_account_holder_name,
          dac7_compliance_status,
          dac7_annual_transaction_count,
          dac7_annual_sales_total
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile({
        ...profileData,
        dac7_compliance_status: profileData.dac7_compliance_status as Dac7ComplianceStatus | null,
        dac7_annual_transaction_count: profileData.dac7_annual_transaction_count ?? 0,
        dac7_annual_sales_total: profileData.dac7_annual_sales_total ?? 0,
      });

      // Redirect if seller onboarding not complete
      if (profileData?.seller_status !== 'active') {
        router.push('/seller/onboard');
        return;
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/dashboard');
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router, fetchProfile, refreshKey]);

  // Update URL when tab changes (replace to avoid history pollution)
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleProfileRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-bg-elevated rounded w-48" />
            <div className="h-10 bg-bg-elevated rounded w-72" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-bg-elevated rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-bg-elevated rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header with Tabs */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
                {t('title')}
              </h1>
              <p className="text-text-secondary mt-1">{t('subtitle.contactOnly')}</p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1 bg-frost-ice/10 rounded-lg p-1">
              <TabButton
                active={activeTab === 'orders'}
                onClick={() => handleTabChange('orders')}
                badge={pendingCount}
              >
                {t('tabs.orders')}
              </TabButton>
              <TabButton
                active={activeTab === 'earnings'}
                onClick={() => handleTabChange('earnings')}
              >
                {t('tabs.earnings')}
              </TabButton>
              <TabButton
                active={activeTab === 'reviews'}
                onClick={() => handleTabChange('reviews')}
              >
                {t('tabs.reviews')}
              </TabButton>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'orders' && (
          <OrdersTab
            isActive={activeTab === 'orders'}
            onPendingCountChange={setPendingCount}
          />
        )}
        {activeTab === 'earnings' && (
          <EarningsTab
            profile={profile}
            onProfileRefresh={handleProfileRefresh}
          />
        )}
        {activeTab === 'reviews' && <ReviewsTab />}
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <SellerDashboardContent />
    </Suspense>
  );
}
