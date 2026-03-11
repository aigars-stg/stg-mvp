'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { RefreshCw as Loader2 } from '@/lib/icons';
import { EarningsTab } from '@/components/seller/dashboard/EarningsTab';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

interface SellerProfile {
  seller_status: string;
  payout_iban: string | null;
  payout_account_holder_name: string | null;
  dac7_compliance_status: Dac7ComplianceStatus | null;
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
}

function SellerDashboardContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations('SellerDashboard');

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
      router.push('/auth/signin?redirectTo=/seller/dashboard');
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router, fetchProfile, refreshKey]);

  const handleProfileRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        {/* Header skeleton */}
        <div className="bg-frost-ice/5 border-b border-frost-ice/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-bg-elevated rounded w-44" />
              <div className="h-4 bg-bg-elevated rounded w-64" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-snow-white border border-border rounded-lg p-4 flex flex-col gap-2">
                <div className="w-8 h-8 bg-bg-elevated rounded-full" />
                <div className="space-y-2">
                  <div className="h-3 bg-bg-elevated rounded w-16" />
                  <div className="h-7 bg-bg-elevated rounded w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* Content area skeleton */}
          <div className="grid lg:grid-cols-3 gap-4 animate-pulse">
            <div className="lg:col-span-1 space-y-4">
              <div className="h-48 bg-bg-elevated rounded-lg" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-bg-elevated rounded-lg" />
              <div className="h-32 bg-bg-elevated rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {t('titleWallet')}
          </h1>
          <p className="text-text-secondary mt-1">{t('subtitle.wallet')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <EarningsTab
          profile={profile}
          onProfileRefresh={handleProfileRefresh}
        />
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
