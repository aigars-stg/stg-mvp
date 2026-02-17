/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, ResultPage } from '@second-turn/design-system';
import { CheckCircleAlt01 as CheckCircle2, Package, Time as Clock, ArrowRight, RefreshCw as Loader2, AlertCircle, Email as Mail, Truck as TruckIcon, Shield, LightbulbOn, ShoppingBasket } from '@/lib/icons';
import { formatPrice } from '@/lib/services/pricing';

interface OrderDetails {
  order_id: string;
  order_number: string;
  seller_name: string;
  shipping_method: 't2t' | 'local_pickup';
  destination: string;
  items_total: number;
  shipping_cost: number;
  total_amount: number;
  wallet_debit_cents: number;
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
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const errorParam = searchParams.get('error');
  const basketId = searchParams.get('basket_id');
  const t = useTranslations('Checkout.success');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch order by ID (EveryPay + wallet flow)
  const fetchOrderById = useCallback(async (): Promise<boolean> => {
    if (!orderId) return false;

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      const o = data?.order;

      if (response.ok && o) {
        setOrder({
          order_id: o.id,
          order_number: o.order_number,
          seller_name: o.seller_profile?.name || 'Seller',
          shipping_method: o.shipping_method,
          destination: o.shipping_method === 't2t'
            ? o.destination_terminal_name
            : o.pickup_city,
          items_total: o.items_total,
          shipping_cost: o.shipping_cost,
          total_amount: o.total_amount,
          wallet_debit_cents: o.buyer_wallet_debit_cents || 0,
          seller_response_deadline: o.seller_response_deadline,
          items: (o.order_items || []).map((item: { id: string; game_name: string; price: number; photo_url: string | null }) => ({
            id: item.id,
            game_name: item.game_name,
            price: item.price,
            photo_url: item.photo_url,
          })),
        });
        setLoading(false);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error fetching order:', err);
      return false;
    }
  }, [orderId]);

  // Fetch order by EveryPay payment reference
  const fetchOrderBySession = useCallback(async (_attempt: number): Promise<boolean> => {
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
        return false;
      }

      if (response.status === 400 || response.status === 403) {
        setError(data.error || 'Failed to load order');
        setLoading(false);
        setProcessing(false);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error fetching order:', err);
      return false;
    }
  }, [sessionId]);

  useEffect(() => {
    // If there's an error param from the callback, show it immediately
    if (errorParam) {
      setLoading(false);
      return;
    }

    // Order ID flow (EveryPay callback or wallet-only)
    if (orderId) {
      fetchOrderById().then((found) => {
        if (!found) {
          setError('Order not found');
          setLoading(false);
        }
      });
      return;
    }

    // EveryPay payment reference flow
    if (!sessionId) {
      setError('No order information provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const pollForOrder = async () => {
      const found = await fetchOrderBySession(0);
      if (found || cancelled) return;

      setLoading(false);
      setProcessing(true);

      for (let i = 1; i <= MAX_RETRIES && !cancelled; i++) {
        setRetryCount(i);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, RETRY_DELAY_MS);
        });
        if (cancelled) return;

        const found = await fetchOrderBySession(i);
        if (found) return;
      }

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
  }, [sessionId, orderId, errorParam, fetchOrderById, fetchOrderBySession]);

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
  if (error || (!sessionId && !orderId)) {
    const errorKey = error ? `errors.${error}` : null;
    const errorMessage = errorKey && t.has(errorKey)
      ? t(errorKey)
      : (error || t('errorDescription'));

    const retryableErrors = new Set([
      'payment_failed', 'fraud_declined', 'card_declined',
      'auth_failed', 'technical_error', 'user_cancelled',
    ]);
    const isRetryable = error ? retryableErrors.has(error) : false;
    const retryHref = basketId ? `/checkout?basket=${basketId}` : '/cart';

    // Error-specific title (falls back to generic errorTitle for non-retryable)
    const titleKey = error ? `errorTitles.${error}` : null;
    const errorTitle = titleKey && t.has(titleKey) ? t(titleKey) : t('errorTitle');

    // Suggestions (1-2 per error category)
    const suggestion1Key = error ? `suggestions.${error}.1` : null;
    const suggestion2Key = error ? `suggestions.${error}.2` : null;
    const hasSuggestions = suggestion1Key && t.has(suggestion1Key);

    return (
      <ResultPage
        variant="error"
        icon={<AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />}
        title={errorTitle}
        description={errorMessage}
      >
        <ResultPage.Content>
          {/* What You Can Do */}
          {isRetryable && hasSuggestions && (
            <section className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
                <LightbulbOn className="w-5 h-5 text-frost-ice" />
                {t('suggestions.title')}
              </h2>
              <ol className="space-y-3 list-none p-0">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-frost-ice text-snow-white flex items-center justify-center text-sm font-bold">1</span>
                  <p className="text-text-secondary pt-0.5">{t(suggestion1Key)}</p>
                </li>
                {suggestion2Key && t.has(suggestion2Key) && (
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center text-sm font-bold">2</span>
                    <p className="text-text-secondary pt-0.5">{t(suggestion2Key)}</p>
                  </li>
                )}
              </ol>
            </section>
          )}

          {/* Reassurance banner */}
          {isRetryable && (
            <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-polar-night">{t('reassurance.title')}</p>
                  <p className="text-sm text-text-secondary mt-1">{t('reassurance.description')}</p>
                </div>
              </div>
            </div>
          )}
        </ResultPage.Content>

        <ResultPage.Actions>
          {isRetryable ? (
            <>
              <Link href={retryHref} className="block">
                <Button variant="primary" fullWidth>
                  {t('actions.tryAgain')}
                </Button>
              </Link>
              <Link href="/cart" className="block">
                <Button variant="secondary" fullWidth>
                  <ShoppingBasket className="w-4 h-4 mr-2" />
                  {t('actions.backToCart')}
                </Button>
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </ResultPage.Actions>
      </ResultPage>
    );
  }

  return (
    <ResultPage
      variant="success"
      icon={<CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />}
      title={t('title')}
      description={t('subtitle')}
      badge={order ? (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-aurora-green/10 rounded-lg">
          <span className="text-sm text-text-secondary">{t('orderNumber')}:</span>
          <span className="font-mono font-bold text-aurora-green">{order.order_number}</span>
        </div>
      ) : undefined}
    >
      <ResultPage.Content>
        {/* Order Summary */}
        {order && (
          <section className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-polar-night mb-4 flex items-center gap-2">
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
                    <p className="font-medium text-polar-night truncate">
                      {item.game_name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {t('orderSummary.soldBy', { seller: order.seller_name })}
                    </p>
                  </div>
                  <p className="font-medium text-polar-night">
                    {formatPrice(item.price)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t('orderSummary.items')}</span>
                <span className="text-polar-night">{formatPrice(order.items_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t('orderSummary.shipping')}</span>
                <span className="text-polar-night">{formatPrice(order.shipping_cost)}</span>
              </div>
              {order.wallet_debit_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('orderSummary.walletCredit') || 'Wallet credit'}</span>
                  <span className="text-aurora-green">-{formatPrice(order.wallet_debit_cents / 100)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-border">
                <span className="text-polar-night">{t('orderSummary.total')}</span>
                <span className="text-frost-ice">{formatPrice(order.total_amount)}</span>
              </div>
            </div>

            {/* Destination */}
            {order.destination && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-start gap-2">
                  <TruckIcon className="w-4 h-4 text-frost-ice mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-polar-night">
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

        {/* Reference for debugging */}
        {(sessionId || orderId) && (
          <div className="text-center">
            <p className="text-xs text-text-muted">
              {sessionId
                ? t('sessionId', { sessionId })
                : `Order: ${orderId}`}
            </p>
          </div>
        )}
      </ResultPage.Content>

      <ResultPage.Actions>
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
      </ResultPage.Actions>
    </ResultPage>
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
