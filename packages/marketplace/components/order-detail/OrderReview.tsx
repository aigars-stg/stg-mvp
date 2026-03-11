'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { Star } from '@/lib/icons';
import type { ReviewData } from '@/lib/hooks/useUnifiedOrderDetail';

interface OrderReviewProps {
  orderId: string;
  viewerRole: 'buyer' | 'seller';
  existingReview: ReviewData | null | undefined;
  onReviewSubmitted: (review: ReviewData) => void;
}

const RATING_KEYS = ['', 'poor', 'fair', 'good', 'veryGood', 'excellent'] as const;

function StarRow({
  rating,
  size = 'md',
}: {
  rating: number;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          weight={v <= rating ? 'fill' : 'regular'}
          className={`${sizeClass} ${v <= rating ? 'text-amber-400' : 'text-border'}`}
        />
      ))}
    </div>
  );
}

export function OrderReview({ orderId, viewerRole, existingReview, onReviewSubmitted }: OrderReviewProps) {
  const t = useTranslations('Orders.detail.review');

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Not yet loaded
  if (existingReview === undefined) return null;

  // Seller with no review yet: nothing to show
  if (existingReview === null && viewerRole === 'seller') return null;

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          rating,
          review_text: reviewText.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      const data = await res.json();
      onReviewSubmitted({
        id: data.review.id,
        rating,
        review_text: reviewText.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
      setSubmitting(false);
    }
  };

  // Read-only view — shown to both buyer (after submit) and seller
  if (existingReview !== null) {
    const label = viewerRole === 'seller' ? t('buyerReview') : t('yourReview');
    return (
      <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">{label}</p>
        <StarRow rating={existingReview.rating} size="sm" />
        {existingReview.review_text && (
          <p className="text-sm text-text-secondary mt-2">{existingReview.review_text}</p>
        )}
      </div>
    );
  }

  // Buyer inline form
  const activeRating = hoveredRating || rating;

  return (
    <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
      <p className="text-sm font-medium text-polar-night mb-3">{t('title')}</p>

      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setRating(v)}
            onMouseEnter={() => setHoveredRating(v)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-frost-ice rounded"
          >
            <Star
              weight={v <= activeRating ? 'fill' : 'regular'}
              className={`w-8 h-8 transition-colors ${v <= activeRating ? 'text-amber-400' : 'text-border'}`}
            />
          </button>
        ))}
      </div>

      {activeRating > 0 && (
        <p className="text-xs text-text-secondary mb-1">{t(`ratings.${RATING_KEYS[activeRating]}`)}</p>
      )}

      {rating > 0 && (
        <div className="mt-4 space-y-3">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t('placeholder')}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{reviewText.length}/500</span>
            <Button variant="accent" size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? t('submitting') : t('submit')}
            </Button>
          </div>
          {error && <p className="text-xs text-aurora-red">{error}</p>}
        </div>
      )}
    </div>
  );
}
