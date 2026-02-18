'use client';

import { useState, useEffect } from 'react';
import { Button } from '@second-turn/design-system';
import { Settings, ArrowLeft, RefreshCw, Package, ShoppingBag, Chat as MessageSquare, AlertCircle, Time as Clock, Star } from '@/lib/icons';
import { Link, useRouter } from '@/i18n/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { BankAccountCard } from '@/components/seller/BankAccountCard';
import { BankAccountForm } from '@/components/seller/BankAccountForm';
import { Dac7WarningBanner } from '@/components/seller/Dac7WarningBanner';
import { SellerReviewsList } from '@/components/seller/SellerReviewsList';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { useTranslations } from 'next-intl';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string;
  buyer_name: string;
  buyer_avatar: string | null;
  buyer_country: string | null;
  order_number: string | null;
  reported_at: string | null;
}

interface SellerProfile {
  seller_status: string;
  payout_iban: string | null;
  payout_account_holder_name: string | null;
  // DAC7 fields
  dac7_compliance_status: Dac7ComplianceStatus | null;
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const t = useTranslations('SellerDashboard');
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasUrgentOrders, setHasUrgentOrders] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ total: number; average: number; positive: number } | null>(null);

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

      setProfile(profileData);
      setLoading(false);

      // Check if seller onboarding is complete
      if (profileData?.seller_status !== 'active') {
        router.push('/seller/onboard');
        return;
      }

      // Fetch pending orders count
      try {
        const ordersRes = await fetch('/api/seller/orders');
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          const pending = ordersData.summary?.pending || 0;
          setPendingCount(pending);
          // Check if any pending order has < 2 hours remaining
          const urgent = (ordersData.orders || []).some(
            (o: { status: string; time_remaining_ms: number | null }) =>
              o.status === 'pending_seller' && o.time_remaining_ms !== null && o.time_remaining_ms < 7200000
          );
          setHasUrgentOrders(urgent);
        }
      } catch {
        // Non-critical — don't block dashboard
      }

      // Fetch recent reviews
      try {
        const reviewsRes = await fetch(`/api/reviews?seller_id=${user.id}&limit=3`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.reviews || []);
          if (reviewsData.trust_summary) {
            setReviewStats({
              total: reviewsData.trust_summary.total_reviews || 0,
              average: reviewsData.trust_summary.average_rating || 0,
              positive: reviewsData.trust_summary.positive_rating_percent || 0,
            });
          }
        }
      } catch {
        // Non-critical
      }
    };

    checkAuth();
  }, [router, supabase, refreshKey]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
              <h1 className="text-2xl font-bold text-polar-night">{t('title')}</h1>
              <p className="text-sm text-text-secondary">
                {t('subtitle.contactOnly')}
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
              {t('refresh')}
            </Button>
            <Link href="/seller/settings">
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {t('settings')}
              </Button>
            </Link>
          </div>
        </div>

        {/* DAC7 Warning Banner - show when tax info is needed */}
        {profile?.dac7_compliance_status &&
          profile.dac7_compliance_status !== 'exempt' &&
          profile.dac7_compliance_status !== 'compliant' && (
            <Dac7WarningBanner
              complianceStatus={profile.dac7_compliance_status}
              annualTransactionCount={profile.dac7_annual_transaction_count || 0}
              annualSalesTotal={profile.dac7_annual_sales_total || 0}
            />
          )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Pending Orders Alert */}
          {pendingCount > 0 && (
            <div className={`border-2 rounded-xl p-6 ${
              hasUrgentOrders
                ? 'bg-aurora-red/10 border-aurora-red/30'
                : 'bg-aurora-yellow/10 border-aurora-yellow/30'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  hasUrgentOrders ? 'bg-aurora-red/20' : 'bg-aurora-yellow/20'
                }`}>
                  {hasUrgentOrders
                    ? <AlertCircle className="w-6 h-6 text-aurora-red" />
                    : <Clock className="w-6 h-6 text-aurora-yellow" />
                  }
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-polar-night mb-1">
                    {t('pendingAlert.title', { count: pendingCount })}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    {hasUrgentOrders
                      ? t('pendingAlert.urgentDescription')
                      : t('pendingAlert.description')
                    }
                  </p>
                  <Link href="/seller/orders">
                    <Button variant="primary">
                      {t('pendingAlert.reviewOrders')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/sell"
              className="bg-snow-white border-2 border-border rounded-xl p-6 hover:border-frost-ice transition-colors group"
            >
              <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-frost-ice/20 transition-colors">
                <Package className="w-6 h-6 text-frost-ice" />
              </div>
              <h3 className="font-semibold text-polar-night mb-1">{t('quickActions.createListing.title')}</h3>
              <p className="text-sm text-text-secondary">{t('quickActions.createListing.description')}</p>
            </Link>

            <Link
              href="/my-listings"
              className="bg-snow-white border-2 border-border rounded-xl p-6 hover:border-frost-ice transition-colors group"
            >
              <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-frost-ice/20 transition-colors">
                <ShoppingBag className="w-6 h-6 text-frost-ice" />
              </div>
              <h3 className="font-semibold text-polar-night mb-1">{t('quickActions.myListings.title')}</h3>
              <p className="text-sm text-text-secondary">{t('quickActions.myListings.description')}</p>
            </Link>

            <Link
              href="/seller/orders"
              className="bg-snow-white border-2 border-border rounded-xl p-6 hover:border-frost-ice transition-colors group relative"
            >
              {pendingCount > 0 && (
                <span className="absolute top-4 right-4 bg-aurora-orange/10 text-aurora-orange text-xs font-semibold rounded-full px-2 py-1 min-w-[24px] text-center">
                  {pendingCount}
                </span>
              )}
              <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-frost-ice/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-frost-ice" />
              </div>
              <h3 className="font-semibold text-polar-night mb-1">{t('quickActions.messagesOrders.title')}</h3>
              <p className="text-sm text-text-secondary">{t('quickActions.messagesOrders.description')}</p>
            </Link>
          </div>

          {/* Wallet Balance */}
          <WalletBalance showLink />

          {/* Recent Reviews */}
          <div className="bg-snow-white border-2 border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-polar-night">
                {t('recentReviews.title')}
              </h3>
              {reviews.length > 0 && (
                <Link
                  href="/seller/reviews"
                  className="text-sm text-frost-ice hover:text-frost-ice/80 transition-colors"
                >
                  {t('recentReviews.viewAll')}
                </Link>
              )}
            </div>
            {reviews.length > 0 ? (
              <SellerReviewsList
                reviews={reviews}
                totalReviews={reviewStats?.total || 0}
                averageRating={reviewStats?.average || 0}
                positivePercent={reviewStats?.positive || 0}
                hasMore={false}
                showBreakdown={false}
                canRespond={true}
                onRespond={async (reviewId, response) => {
                  const res = await fetch(`/api/reviews/${reviewId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ response }),
                  });
                  if (!res.ok) throw new Error('Failed to respond');
                  setRefreshKey(prev => prev + 1);
                }}
              />
            ) : (
              <div className="text-center py-6 text-text-secondary">
                <Star className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-50" />
                <p className="text-sm">{t('recentReviews.noReviews')}</p>
                <p className="text-xs text-text-muted mt-1">{t('recentReviews.noReviewsHint')}</p>
              </div>
            )}
          </div>

          {/* Bank Account Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profile?.payout_iban ? (
              <div className="bg-snow-white border-2 border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-polar-night mb-4">{t('bankAccount.title')}</h3>
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
              </div>
            ) : (
              <div className="bg-snow-white border-2 border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-polar-night mb-2">
                  {t('bankAccount.title')}
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  {t('bankAccount.addDescription')}
                </p>
                <Button onClick={() => setShowBankForm(true)}>
                  {t('bankAccount.addButton')}
                </Button>
              </div>
            )}
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
