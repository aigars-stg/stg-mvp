'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge } from '@second-turn/design-system';
import {
  CheckCircle2,
  Package,
  Clock,
  MessageCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Mail,
  TruckIcon,
} from 'lucide-react';

interface OrderDetails {
  order_id: string;
  order_number: string;
  seller_name: string;
  shipping_method: 't2t' | 'local_pickup';
  items_total: number;
  shipping_cost: number;
  service_fee: number;
  total_amount: number;
  seller_response_deadline: string;
  items: {
    game_name: string;
    price: number;
    photo_url: string | null;
  }[];
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // TODO: Create an API endpoint to fetch order details by session ID
        // For now, we'll show a success message without order details
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Processing your order...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {error || 'Invalid session'}
          </h2>
          <p className="text-text-secondary mb-6">
            We couldn't load your order details. Please check your email for confirmation.
          </p>
          <Link href="/browse">
            <Button variant="primary">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Success Header */}
      <div className="bg-aurora-green/5 border-b border-aurora-green/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-aurora-green/20 mb-4 sm:mb-6">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-aurora-green" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night mb-2">
            Payment Successful!
          </h1>
          <p className="text-base sm:text-lg text-text-secondary">
            Your order has been placed and payment confirmed
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* What Happens Next */}
          <section className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6" aria-labelledby="next-steps-heading">
            <h2 id="next-steps-heading" className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-frost-ice" aria-hidden="true" />
              What Happens Next
            </h2>

            <ol className="space-y-4" style={{ counterReset: 'step-counter', listStyleType: 'none', padding: 0 }}>
              {/* Step 1 */}
              <li className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-frost-ice text-snow-white flex items-center justify-center font-bold text-sm" aria-hidden="true">
                    1
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-polar-night mb-1">
                    Seller Reviews Your Order
                  </h3>
                  <p className="text-sm text-text-secondary">
                    The seller has 24 hours to accept your order. You'll receive an email
                    notification once they respond.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-frost-ice/10 rounded-lg">
                    <Clock className="w-4 h-4 text-frost-ice" aria-hidden="true" />
                    <span className="text-sm font-medium text-frost-ice">
                      Response deadline: 24 hours
                    </span>
                  </div>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center font-bold text-sm" aria-hidden="true">
                    2
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-polar-night mb-1">Shipping Arranged</h3>
                  <p className="text-sm text-text-secondary">
                    Once accepted, the seller will arrange shipping or coordinate pickup
                    details with you via messaging.
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center font-bold text-sm" aria-hidden="true">
                    3
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-medium text-polar-night mb-1">Receive Your Games</h3>
                  <p className="text-sm text-text-secondary">
                    Pick up your games at the terminal or meet with the seller. Enjoy your
                    new board games!
                  </p>
                </div>
              </li>
            </ol>
          </section>

          {/* Email Confirmation */}
          <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-medium text-polar-night">Order confirmation sent</p>
                <p className="text-sm text-text-secondary mt-1">
                  We've sent a confirmation email with your order details and tracking
                  information.
                </p>
              </div>
            </div>
          </div>

          {/* Refund Policy */}
          <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-medium text-polar-night">Automatic Refund Protection</p>
                <p className="text-sm text-text-secondary mt-1">
                  If the seller doesn't respond within 24 hours or declines your order,
                  you'll receive an automatic full refund to your payment method.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/orders" className="block">
              <Button variant="primary" fullWidth>
                <Package className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
            </Link>
            <Link href="/browse" className="block">
              <Button variant="secondary" fullWidth>
                Continue Shopping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Session ID for debugging */}
          {sessionId && (
            <div className="text-center">
              <p className="text-xs text-text-muted">
                Session ID: {sessionId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
