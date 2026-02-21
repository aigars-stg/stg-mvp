/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { Button, Card } from '@second-turn/design-system';
import { Star, ArrowLeft, RefreshCw as Loader2, CheckCircleAlt01 as CheckCircle2, Package } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';

interface OrderDetails {
  id: string;
  order_number: string;
  seller_id: string;
  seller_name: string;
  status: string;
  items: Array<{
    game_name: string;
    photo_url: string | null;
  }>;
}

interface ReviewEligibility {
  can_review: boolean;
  reason?: string;
  review_id?: string;
}

export default function ReviewOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Fetch order details and check eligibility
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/auth/signin?redirect=/orders/${orderId}/review`);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch order details
        const orderRes = await fetch(`/api/orders/${orderId}`);
        if (!orderRes.ok) {
          const data = await orderRes.json();
          throw new Error(data.error || 'Failed to fetch order');
        }
        const orderData = await orderRes.json();
        const apiOrder = orderData.order;
        setOrder({
          id: apiOrder.id,
          order_number: apiOrder.order_number,
          seller_id: apiOrder.seller_id,
          seller_name: apiOrder.seller_profile?.name || 'Seller',
          status: apiOrder.status,
          items: (apiOrder.order_items || []).map((item: { game_name: string; photo_url: string | null; game_thumbnail: string | null }) => ({
            game_name: item.game_name,
            photo_url: item.photo_url || item.game_thumbnail || null,
          })),
        });

        // Check eligibility to review
        // We'll use the server-side check via the API
        const eligibilityRes = await fetch(`/api/reviews?check_eligibility=true&order_id=${orderId}`);
        if (eligibilityRes.ok) {
          // If we can fetch, check if already reviewed
          const existingReview = await checkExistingReview(orderId);
          if (existingReview) {
            setEligibility({ can_review: false, reason: 'Already reviewed', review_id: existingReview.id });
          } else if (orderData.order.status === 'delivered' || orderData.order.status === 'completed') {
            setEligibility({ can_review: true });
          } else {
            setEligibility({ can_review: false, reason: 'Order not yet delivered' });
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    async function checkExistingReview(orderId: string) {
      // This is a simplified check - in production, we'd have a dedicated endpoint
      try {
        const res = await fetch(`/api/reviews?order_id=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          return data.reviews?.[0] || null;
        }
      } catch {
        return null;
      }
      return null;
    }

    fetchData();
  }, [orderId, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

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

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (value: number): string => {
    switch (value) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return '';
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
      </div>
    );
  }

  // Error state
  if (error && !order) {
    return (
      <div className="min-h-screen bg-bg-secondary py-6 px-4 sm:px-6">
        <div className="max-w-lg mx-auto text-center">
          <Card className="p-8">
            <h1 className="text-xl font-bold text-polar-night mb-4">Error</h1>
            <p className="text-text-secondary mb-6">{error}</p>
            <Link href="/orders">
              <Button variant="accent">Back to Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Already reviewed state
  if (eligibility && !eligibility.can_review && eligibility.reason === 'Already reviewed') {
    return (
      <div className="min-h-screen bg-bg-secondary py-6 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <Link href="/orders" className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          <Card className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-aurora-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-polar-night mb-2">Already Reviewed</h1>
            <p className="text-text-secondary mb-6">
              You&apos;ve already submitted a review for this order. Thank you for your feedback!
            </p>
            <Link href="/orders">
              <Button variant="accent">Back to Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Cannot review state
  if (eligibility && !eligibility.can_review) {
    return (
      <div className="min-h-screen bg-bg-secondary py-6 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <Link href="/orders" className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>

          <Card className="p-8 text-center">
            <h1 className="text-xl font-bold text-polar-night mb-2">Cannot Review Yet</h1>
            <p className="text-text-secondary mb-6">
              {eligibility.reason || 'This order is not eligible for review yet.'}
            </p>
            <Link href="/orders">
              <Button variant="accent">Back to Orders</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-secondary py-6 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-aurora-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-polar-night mb-2">Thank You!</h1>
            <p className="text-text-secondary mb-6">
              Your review has been submitted. It helps build trust in our community.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/orders">
                <Button variant="secondary">Back to Orders</Button>
              </Link>
              <Link href="/browse">
                <Button variant="accent">Continue Shopping</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Review form
  return (
    <div className="min-h-screen bg-bg-secondary py-6 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <Link href="/orders" className="inline-flex items-center gap-2 text-text-secondary hover:text-polar-night mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        <Card className="p-6">
          <h1 className="text-xl font-bold text-polar-night mb-6">Rate Your Experience</h1>

          {/* Order Summary */}
          {order && (
            <div className="bg-bg-secondary rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                {order.items[0]?.photo_url ? (
                  <img
                    src={order.items[0].photo_url}
                    alt={order.items[0].game_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-frost-ice/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-frost-ice" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-polar-night">
                    {order.items[0]?.game_name}
                    {order.items.length > 1 && ` +${order.items.length - 1} more`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Order {order.order_number} • Sold by {order.seller_name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-polar-night mb-3">
                How was your experience with this seller?
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-frost-ice focus:ring-offset-2 rounded"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        value <= (hoveredRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-snow-storm'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {(hoveredRating || rating) > 0 && (
                <p className="mt-2 text-sm text-text-secondary">
                  {getRatingLabel(hoveredRating || rating)}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <label htmlFor="review-text" className="block text-sm font-medium text-polar-night mb-2">
                Share your experience (optional)
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell others about the item condition, packaging, communication with the seller..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-text-muted text-right">
                {reviewText.length}/500 characters
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg text-sm text-aurora-red">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>

            <p className="text-xs text-text-muted text-center">
              Your review will be public and helps other buyers make informed decisions.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
