'use client';

import { useState } from 'react';
import { Star, Chat as MessageSquare, ChevronDown } from 'griddy-icons';
import { Button, Card } from '@second-turn/design-system';
import { cn } from '@/lib/utils';
import { UserInfoCard } from '@/components/user';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/date-utils';

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

interface SellerReviewsListProps {
  reviews: Review[];
  totalReviews: number;
  averageRating: number;
  positivePercent: number;
  hasMore: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** Show rating breakdown */
  showBreakdown?: boolean;
  /** Seller can respond to reviews */
  canRespond?: boolean;
  onRespond?: (reviewId: string, response: string) => Promise<void>;
}

/**
 * Displays a list of seller reviews with optional rating breakdown
 */
export function SellerReviewsList({
  reviews,
  totalReviews,
  averageRating,
  positivePercent,
  hasMore,
  onLoadMore,
  isLoadingMore = false,
  showBreakdown = true,
  canRespond = false,
  onRespond,
}: SellerReviewsListProps) {
  const t = useTranslations('SellerDashboard.SellerReviewsList');
  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {showBreakdown && (
        <RatingSummary
          totalReviews={totalReviews}
          averageRating={averageRating}
          positivePercent={positivePercent}
          reviews={reviews}
        />
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              canRespond={canRespond}
              onRespond={onRespond}
            />
          ))}

          {/* Load More */}
          {hasMore && onLoadMore && (
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? t('loading') : t('loadMore')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
          <p>{t('noReviews')}</p>
          <p className="text-sm text-text-muted mt-1">
            {t('noReviewsHint')}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Rating summary with breakdown bars
 */
function RatingSummary({
  totalReviews,
  averageRating,
  positivePercent,
  reviews,
}: {
  totalReviews: number;
  averageRating: number;
  positivePercent: number;
  reviews: Review[];
}) {
  const t = useTranslations('SellerDashboard.SellerReviewsList');
  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { rating, count, percent };
  });

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Average Rating */}
        <div className="flex flex-col items-center justify-center md:w-48">
          <div className="text-5xl font-bold text-polar-night">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  'w-5 h-5',
                  i <= Math.round(averageRating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-snow-storm'
                )}
              />
            ))}
          </div>
          <div className="text-sm text-text-secondary mt-1">
            {totalReviews} {totalReviews === 1 ? t('review') : t('reviews')}
          </div>
          <div className="text-sm text-aurora-green font-medium mt-2">
            {positivePercent}% {t('positive')}
          </div>
        </div>

        {/* Rating Breakdown */}
        <div className="flex-1 space-y-2">
          {distribution.map(({ rating, count, percent }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="w-12 text-sm text-text-secondary text-right">
                {rating} {rating !== 1 ? t('stars') : t('star')}
              </span>
              <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    rating >= 4 ? 'bg-aurora-green' :
                    rating === 3 ? 'bg-amber-400' :
                    'bg-aurora-red'
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="w-8 text-sm text-text-muted">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/**
 * Individual review card
 */
function ReviewCard({
  review,
  canRespond = false,
  onRespond,
}: {
  review: Review;
  canRespond?: boolean;
  onRespond?: (reviewId: string, response: string) => Promise<void>;
}) {
  const t = useTranslations('SellerDashboard.SellerReviewsList');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitResponse = async () => {
    if (!onRespond || !responseText.trim()) return;

    setIsSubmitting(true);
    try {
      await onRespond(review.id, responseText.trim());
      setShowResponseForm(false);
      setResponseText('');
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Card className="p-4">
      {/* Header: Buyer info and rating */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <UserInfoCard
            user={{
              id: review.id, // Using review id as we don't have buyer_id in the Review interface
              name: review.buyer_name,
              avatarUrl: review.buyer_avatar,
              country: review.buyer_country,
            }}
            size="lg"
            linkToProfile={false}
          />
          <div className="text-xs text-text-muted ml-14">
            {formatDate(review.created_at)}
            {review.order_number && (
              <span> • {t('order')} #{review.order_number}</span>
            )}
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4',
                i <= review.rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-snow-storm'
              )}
            />
          ))}
        </div>
      </div>

      {/* Review Text */}
      {review.review_text && (
        <p className="mt-3 text-sm text-text-secondary">
          {review.review_text}
        </p>
      )}

      {/* Seller Response */}
      {review.seller_response && (
        <div className="mt-4 pl-4 border-l-2 border-frost-ice/30 bg-frost-ice/5 rounded-r-lg p-3">
          <div className="text-xs font-medium text-frost-ice mb-1">
            {t('sellerResponse')}
            {review.seller_responded_at && (
              <span className="font-normal text-text-muted ml-2">
                {formatDate(review.seller_responded_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {review.seller_response}
          </p>
        </div>
      )}

      {/* Response Form (for seller) */}
      {canRespond && !review.seller_response && (
        <div className="mt-4">
          {!showResponseForm ? (
            <button
              onClick={() => setShowResponseForm(true)}
              className="text-sm text-frost-ice hover:text-frost-ice/80 flex items-center gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              {t('respondToReview')}
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={t('responsePlaceholder')}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice focus:border-transparent resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {t('characters', { count: responseText.length, max: 500 })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowResponseForm(false);
                      setResponseText('');
                    }}
                    disabled={isSubmitting}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitResponse}
                    disabled={isSubmitting || !responseText.trim()}
                  >
                    {isSubmitting ? t('sending') : t('sendResponse')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export { ReviewCard, RatingSummary };
