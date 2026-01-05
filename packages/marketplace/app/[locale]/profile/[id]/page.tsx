'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import {
  ArrowLeft,
  Loader2,
  User,
  MapPin,
  Calendar,
  Star,
  Package,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';
import { SellerReviewsList } from '@/components/seller/SellerReviewsList';
import { BadgeTierPill } from '@/components/seller/SellerTrustBadge';
import type { SellerBadgeTier } from '@/lib/types/seller';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';

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

interface ListingPreview {
  id: string;
  title: string;
  price: number;
  condition: string;
  thumbnail: string | null;
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
  listings?: ListingPreview[];
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);

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
          listingsCount: profileData.listings?.length,
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
    if (!data || loadingMore || !data.seller) return;

    try {
      setLoadingMore(true);
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
      setLoadingMore(false);
    }
  }, [data, loadingMore, reviewsPage, userId]);

  // Format member since date
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

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
        <div className="max-w-4xl mx-auto">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </Link>

          <Card className="p-8 text-center">
            <User className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
            <h1 className="text-xl font-bold text-polar-night mb-2">User Not Found</h1>
            <p className="text-text-secondary mb-6">
              {error || 'This profile could not be found.'}
            </p>
            <Link href="/browse">
              <Button variant="primary">Browse Listings</Button>
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
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Header Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-24 h-24 rounded-xl object-cover border-2 border-border"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-frost-ice/20 flex items-center justify-center border-2 border-border">
                  <User className="w-12 h-12 text-frost-ice" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-polar-night">{user.name}</h1>
                {isSeller && <BadgeTierPill tier={seller.badge_tier} size="md" />}
              </div>

              {/* Location and Member Since */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-4">
                {user.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className={getCountryFlag(user.country)} role="img" aria-label={getCountryName(user.country)} />
                    {getCountryName(user.country)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Member since {formatMemberSince(user.member_since)}
                </span>
              </div>

              {/* Seller Stats Row (only for sellers with reviews) */}
              {isSeller && seller.total_reviews > 0 && (
                <div className="flex flex-wrap gap-6">
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
                      ({seller.total_reviews} {seller.total_reviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>

                  {/* Completed Sales */}
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Package className="w-4 h-4" />
                    <span>
                      <strong className="text-polar-night">{seller.total_completed_sales}</strong>{' '}
                      completed sales
                    </span>
                  </div>

                  {/* Positive Rating */}
                  <div className="flex items-center gap-1.5 text-aurora-green">
                    <span className="font-medium">{seller.positive_rating_percent}%</span>
                    <span className="text-text-secondary">positive</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (sellers only) */}
            {isSeller && seller.active_listings_count !== undefined && seller.active_listings_count > 0 && (
              <div className="flex flex-col gap-2 sm:items-end">
                <Link href={`/browse?sellerId=${user.id}`}>
                  <Button variant="primary" className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    View All {seller.active_listings_count} Listings
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Listing Previews (sellers only) */}
        {isSeller && listings && listings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Active Listings
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/listing/${listing.id}`}>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                    {/* Thumbnail */}
                    <div className="aspect-square rounded-lg bg-bg-tertiary mb-2 overflow-hidden">
                      {listing.thumbnail ? (
                        <img
                          src={listing.thumbnail}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-text-muted opacity-50" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <h3 className="text-sm font-medium text-polar-night line-clamp-2 mb-1">
                      {listing.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-frost-ice">
                        {formatPrice(listing.price)}
                      </span>
                      <span className="text-text-muted capitalize">
                        {listing.condition.replace('_', ' ')}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section (sellers only) */}
        {isSeller && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Reviews
            </h2>

            <SellerReviewsList
              reviews={reviews?.data || []}
              totalReviews={seller.total_reviews}
              averageRating={seller.average_rating}
              positivePercent={seller.positive_rating_percent}
              hasMore={reviews?.pagination.hasMore || false}
              onLoadMore={handleLoadMoreReviews}
              isLoadingMore={loadingMore}
              showBreakdown={seller.total_reviews > 0}
            />
          </div>
        )}

        {/* Non-seller message */}
        {!isSeller && (
          <Card className="p-6 text-center text-text-secondary">
            <p>This user is not currently selling any items.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
