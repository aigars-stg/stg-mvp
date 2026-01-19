'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import { CheckCircleAlt01 as CheckCircle2, Package, Time as Clock, ChatBubble as MessageCircle, ArrowRight, RefreshCw as Loader2, AlertCircle, Email as Mail, Truck as TruckIcon } from 'griddy-icons';

interface OrderDetails {
  order_id: string;
  order_number: string;
  seller_name: string;
  shipping_method: 't2t' | 'local_pickup';
  destination: string;
  items_total: number;
  shipping_cost: number;
  service_fee: number;
  total_amount: number;
  seller_response_deadline: string;
  items: {
    id: string;
    game_name: string;
    price: number;
    photo_url: string | null;
  }[];
}

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000;

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const t = useTranslations('Checkout.success');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchOrderDetails = useCallback(async (attempt: number): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(`/api/orders/by-session/${sessionId}`);
      const data = await response.json();

      if (response.ok && data.order) {
        setOrder(data.order);
        setLoading(false);
        setProcessing(false);
        return true;
      }

      if (response.status === 404 && data.processing) {
        // Order not created yet, webhook may still be processing
        return false;
      }

      // Other errors
      if (response.status === 400 || response.status === 403) {
        setError(data.error || 'Failed to load order');
        setLoading(false);
        setProcessing(false);
        return true; // Stop retrying
      }

      return false;
    } catch (err) {
      console.error('Error fetching order:', err);
      return false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const pollForOrder = async () => {
      // First attempt
      const found = await fetchOrderDetails(0);
      if (found || cancelled) return;

      // Switch to processing state after first attempt fails
      setLoading(false);
      setProcessing(true);

      // Retry with delay
      for (let i = 1; i <= MAX_RETRIES && !cancelled; i++) {
        setRetryCount(i);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, RETRY_DELAY_MS);
        });
        if (cancelled) return;

        const found = await fetchOrderDetails(i);
        if (found) return;
      }

      // Max retries reached
      if (!cancelled) {
        setProcessing(false);
        setError('timeout');
      }
    };

    pollForOrder();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sessionId, fetchOrderDetails]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Processing state (webhook may still be processing)
  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-frost-ice/20 mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-frost-ice" />
          </div>
          <h2 className="text-xl font-semibold text-polar-night mb-2">
            {t('processing.title')}
          </h2>
          <p className="text-text-secondary mb-4">
            {t('processing.description')}
          </p>
          <div className="w-full bg-bg-secondary rounded-full h-2 mb-2">
            <div
              className="bg-frost-ice h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((retryCount / MAX_RETRIES) * 100, 100)}%` }}
            />
          </div>
          <p className="text-sm text-text-muted">
            {t('processing.wait')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionId) {
    // Check if error is a translation key or a raw message
    const errorMessage = error === 'timeout' ? t('processingTimeout') : (error || t('errorDescription'));

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-polar-night dark:text-snow-white mb-2">
            {t('errorTitle')}
          </h2>
          <p className="text-text-secondary mb-6">
            {errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link href="/orders" className="block">
              <Button variant="primary" fullWidth>
                <Package className="w-4 h-4 mr-2" />
                {t('actions.viewOrders')}
              </Button>
            </Link>
            <Link href="/browse" className="block">
              <Button variant="secondary" fullWidth>{t('actions.continueShopping')}</Button>
            </Link>
          </div>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-polar-night dark:text-snow-white mb-2">
            {t('title')}
          </h1>
          <p className="text-base sm:text-lg text-text-secondary">
            {t('subtitle')}
          </p>
          {order && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-aurora-green/10 rounded-lg">
              <span className="text-sm text-text-secondary">{t('orderNumber')}:</span>
              <span className="font-mono font-bold text-aurora-green">{order.order_number}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Order Summary */}
          {order && (
            <section className="bg-snow-white dark:bg-polar-night-light border-2 border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night dark:text-snow-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-frost-ice" />
                {t('orderSummary.title')}
              </h2>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt={item.game_name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-polar-night dark:text-snow-white truncate">
                        {item.game_name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {t('orderSummary.soldBy', { seller: order.seller_name })}
                      </p>
                    </div>
                    <p className="font-medium text-polar-night dark:text-snow-white">
                      {item.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('orderSummary.items')}</span>
                  <span className="text-polar-night dark:text-snow-white">{order.items_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('orderSummary.shipping')}</span>
                  <span className="text-polar-night dark:text-snow-white">{order.shipping_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('orderSummary.serviceFee')}</span>
                  <span className="text-polar-night dark:text-snow-white">{order.service_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span className="text-polar-night dark:text-snow-white">{t('orderSummary.total')}</span>
                  <span className="text-frost-ice">{order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Destination */}
              {order.destination && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-start gap-2">
                    <TruckIcon className="w-4 h-4 text-frost-ice mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-polar-night dark:text-snow-white">
                        {order.shipping_method === 't2t' ? t('orderSummary.deliveryTo') : t('orderSummary.pickupAt')}
                      </p>
                      <p className="text-sm text-text-secondary">{order.destination}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* What Happens Next */}
          <section className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6" aria-labelledby="next-steps-heading">
            <h2 id="next-steps-heading" className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-frost-ice" aria-hidden="true" />
              {t('nextSteps.title')}
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
                    {t('nextSteps.step1Title')}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {t('nextSteps.step1Description')}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-frost-ice/10 rounded-lg">
                    <Clock className="w-4 h-4 text-frost-ice" aria-hidden="true" />
                    <span className="text-sm font-medium text-frost-ice">
                      {t('nextSteps.step1Deadline')}
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
                  <h3 className="font-medium text-polar-night mb-1">{t('nextSteps.step2Title')}</h3>
                  <p className="text-sm text-text-secondary">
                    {t('nextSteps.step2Description')}
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
                  <h3 className="font-medium text-polar-night mb-1">{t('nextSteps.step3Title')}</h3>
                  <p className="text-sm text-text-secondary">
                    {t('nextSteps.step3Description')}
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
                <p className="font-medium text-polar-night">{t('email.title')}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {t('email.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Policy */}
          <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0 mt-0.5" />
              <div className="flex-grow">
                <p className="font-medium text-polar-night">{t('refund.title')}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {t('refund.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/orders" className="block">
              <Button variant="primary" fullWidth>
                <Package className="w-4 h-4 mr-2" />
                {t('actions.viewOrders')}
              </Button>
            </Link>
            <Link href="/browse" className="block">
              <Button variant="secondary" fullWidth>
                {t('actions.continueShopping')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Session ID for debugging */}
          {sessionId && (
            <div className="text-center">
              <p className="text-xs text-text-muted">
                {t('sessionId', { sessionId })}
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
