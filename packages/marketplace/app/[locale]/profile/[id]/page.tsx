'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import { ArrowLeft, RefreshCw as Loader2, User, Calendar, Star, Package, ShoppingBag, Chat as MessageSquare } from 'griddy-icons';
import { SellerReviewsList } from '@/components/seller/SellerReviewsList';
import { BadgeTierPill } from '@/components/seller/SellerTrustBadge';
import type { SellerBadgeTier } from '@/lib/types/seller';
import { UserInfoCard } from '@/components/user';
import { OfferCard } from '@/components/game/OfferCard';
import type { ListingWithSeller } from '@/lib/types/listing';
import { useTranslations } from 'next-intl';

interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  country: string | null;
  member_since: string;
}

interface SellerData {
  total_reviews: number;
  average_rating: number;
  positive_rating_percent: number;
  total_completed_sales: number;
  badge_tier: SellerBadgeTier;
  active_listings_count?: number;
}

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
}

interface ProfileData {
  user: UserProfile;
  seller?: SellerData;
  reviews?: {
    data: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  listings?: {
    data: ListingWithSeller[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export default function ProfilePage() {
  const t = useTranslations('ProfilePage');
  const tCommon = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/profile/${userId}?reviews_limit=10`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }

        const profileData = await res.json();
        console.log('[Profile Page] API response:', {
          hasListings: !!profileData.listings,
          listingsCount: profileData.listings?.data?.length,
          listingsTotal: profileData.listings?.pagination?.total,
          activeListingsCount: profileData.seller?.active_listings_count,
        });
        setData(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  // Load more reviews (for sellers only)
  const handleLoadMoreReviews = useCallback(async () => {
    if (!data || loadingMoreReviews || !data.seller) return;

    try {
      setLoadingMoreReviews(true);
      const nextPage = reviewsPage + 1;

      const res = await fetch(
        `/api/profile/${userId}?include_listings=false&reviews_page=${nextPage}&reviews_limit=10`
      );

      if (!res.ok) throw new Error('Failed to load more reviews');

      const moreData = await res.json();

      if (moreData.reviews) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            reviews: {
              ...moreData.reviews,
              data: [...(prev.reviews?.data || []), ...moreData.reviews.data],
            },
          };
        });
        setReviewsPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more reviews:', err);
    } finally {
      setLoadingMoreReviews(false);
    }
  }, [data, loadingMoreReviews, reviewsPage, userId]);

  // Load more listings (for sellers only)
  const handleLoadMoreListings = useCallback(async () => {
    if (!data || loadingMoreListings || !data.seller) return;

    try {
      setLoadingMoreListings(true);
      const nextPage = listingsPage + 1;

      const res = await fetch(
        `/api/profile/${userId}?include_reviews=false&listings_page=${nextPage}&listings_limit=12`
      );

      if (!res.ok) throw new Error('Failed to load more listings');

      const moreData = await res.json();

      if (moreData.listings) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            listings: {
              ...moreData.listings,
              data: [...(prev.listings?.data || []), ...moreData.listings.data],
            },
          };
        });
        setListingsPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more listings:', err);
    } finally {
      setLoadingMoreListings(false);
    }
  }, [data, loadingMoreListings, listingsPage, userId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-secondary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToBrowse')}
          </Link>

          <Card className="p-8 text-center">
            <User className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
            <h1 className="text-xl font-bold text-polar-night mb-2">{t('userNotFound')}</h1>
            <p className="text-text-secondary mb-6">
              {error || t('profileNotFound')}
            </p>
            <Link href="/browse">
              <Button variant="primary">{t('browseListings')}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { user, seller, reviews, listings } = data;
  const isSeller = !!seller;

  return (
    <div className="min-h-screen bg-bg-secondary py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        {/* Profile Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* User Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <UserInfoCard
                  user={{
                    id: user.id,
                    name: user.name,
                    avatarUrl: user.avatar_url,
                    country: user.country,
                  }}
                  size="2xl"
                  countryDisplay="full"
                  memberSince={user.member_since}
                  showMemberSince={true}
                  linkToProfile={false}
                />
                {isSeller && <BadgeTierPill tier={seller.badge_tier} size="md" />}
              </div>

              {/* Seller Stats Row (only for sellers with reviews) */}
              {isSeller && seller.total_reviews > 0 && (
                <div className="flex flex-wrap gap-6 mt-4">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i <= Math.round(seller.average_rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-polar-night">
                      {seller.average_rating.toFixed(1)}
                    </span>
                    <span className="text-text-secondary">
                      ({t('reviewCount', { count: seller.total_reviews })})
                    </span>
                  </div>

                  {/* Completed Sales */}
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Package className="w-4 h-4" />
                    <span>
                      <strong className="text-polar-night">{seller.total_completed_sales}</strong>{' '}
                      {t('completedSales')}
                    </span>
                  </div>

                  {/* Positive Rating */}
                  <div className="flex items-center gap-1.5 text-aurora-green">
                    <span className="font-medium">{seller.positive_rating_percent}%</span>
                    <span className="text-text-secondary">{t('positive')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (sellers only) */}
            {isSeller && seller.active_listings_count !== undefined && seller.active_listings_count > 0 && (
              <div className="flex flex-col gap-2 sm:items-end">
                <Link href="/browse">
                  <Button variant="primary" className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    {t('browseAllListings')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Active Listings (sellers only) */}
        {isSeller && listings && listings.data.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              {t('activeListings')}
              <span className="text-sm font-normal text-text-secondary">
                ({listings.pagination.total})
              </span>
            </h2>
            <div className="space-y-4">
              {listings.data.map((listing) => (
                <OfferCard key={listing.id} listing={listing} />
              ))}
            </div>
            {listings.pagination.hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  onClick={handleLoadMoreListings}
                  disabled={loadingMoreListings}
                  className="min-w-[200px]"
                >
                  {loadingMoreListings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {tCommon('loading')}
                    </>
                  ) : (
                    t('loadMore', { current: listings.data.length, total: listings.pagination.total })
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Reviews Section (sellers only) */}
        {isSeller && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('reviews')}
            </h2>

            <SellerReviewsList
              reviews={reviews?.data || []}
              totalReviews={seller.total_reviews}
              averageRating={seller.average_rating}
              positivePercent={seller.positive_rating_percent}
              hasMore={reviews?.pagination.hasMore || false}
              onLoadMore={handleLoadMoreReviews}
              isLoadingMore={loadingMoreReviews}
              showBreakdown={seller.total_reviews > 0}
            />
          </div>
        )}

        {/* Non-seller message */}
        {!isSeller && (
          <Card className="p-6 text-center text-text-secondary">
            <p>{t('notSelling')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
