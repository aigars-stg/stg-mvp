'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, RefreshCw as Loader2 } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { SellerReviewsList } from '@/components/seller/SellerReviewsList';
import { useTranslations } from 'next-intl';

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

interface ReviewStats {
  total: number;
  average: number;
  positive: number;
}

const PAGE_SIZE = 10;

export function ReviewsTab() {
  const { user } = useAuth();
  const t = useTranslations('SellerDashboard');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchReviews = useCallback(async (loadMore = false) => {
    if (!user) return;

    const currentOffset = loadMore ? offset : 0;

    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await fetch(
        `/api/reviews?seller_id=${user.id}&limit=${PAGE_SIZE}&offset=${currentOffset}`
      );

      if (!res.ok) return;

      const data = await res.json();
      const newReviews = data.reviews || [];

      if (loadMore) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      if (data.trust_summary) {
        setStats({
          total: data.trust_summary.total_reviews || 0,
          average: data.trust_summary.average_rating || 0,
          positive: data.trust_summary.positive_rating_percent || 0,
        });
      }

      setHasMore(newReviews.length === PAGE_SIZE);
      setOffset(currentOffset + newReviews.length);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, offset]);

  useEffect(() => {
    fetchReviews();
  // Only fetch on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRespond = async (reviewId: string, response: string) => {
    const res = await fetch(`/api/reviews/${reviewId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    if (!res.ok) throw new Error('Failed to respond');
    // Refresh to show updated response
    setOffset(0);
    await fetchReviews();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('reviews.loading')}</p>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16">
        <Star className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-polar-night mb-2">
          {t('recentReviews.noReviews')}
        </h2>
        <p className="text-text-secondary text-sm">
          {t('recentReviews.noReviewsHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-snow-white border-2 border-border rounded-xl p-6">
      <SellerReviewsList
        reviews={reviews}
        totalReviews={stats?.total || 0}
        averageRating={stats?.average || 0}
        positivePercent={stats?.positive || 0}
        hasMore={hasMore}
        onLoadMore={() => fetchReviews(true)}
        isLoadingMore={loadingMore}
        showBreakdown={true}
        canRespond={true}
        onRespond={handleRespond}
      />
    </div>
  );
}
