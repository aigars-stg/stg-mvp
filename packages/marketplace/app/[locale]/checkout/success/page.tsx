'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button, ResultPage } from '@second-turn/design-system';
import { Package, ArrowRight, RefreshCw as Loader2, AlertCircle, Shield, LightbulbOn, ShoppingBasket } from '@/lib/icons';

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000;

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const errorParam = searchParams.get('error');
  const basketId = searchParams.get('basket_id');
  const t = useTranslations('Checkout.success');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch order by ID and redirect to order page
  const fetchOrderById = useCallback(async (): Promise<boolean> => {
    if (!orderId) return false;

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      const o = data?.order;

      if (response.ok && o) {
        router.replace(`/orders/${o.id}?welcome=true`);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error fetching order:', err);
      return false;
    }
  }, [orderId, router]);

  // Fetch order by EveryPay payment reference and redirect
  const fetchOrderBySession = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(`/api/orders/by-session/${sessionId}`);
      const data = await response.json();

      if (response.ok && data.order) {
        router.replace(`/orders/${data.order.id}?welcome=true`);
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
  }, [sessionId, router]);

  useEffect(() => {
    // If there's an error param from the callback, show it immediately
    if (errorParam) {
      setLoading(false);
      return;
    }

    // Order ID flow (fallback — happy path now redirects directly from backend)
    if (orderId) {
      fetchOrderById().then((found) => {
        if (!found) {
          setError('Order not found');
          setLoading(false);
        }
      });
      return;
    }

    // EveryPay payment reference flow (webhook still processing)
    if (!sessionId) {
      setError('No order information provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const pollForOrder = async () => {
      const found = await fetchOrderBySession();
      if (found || cancelled) return;

      setLoading(false);
      setProcessing(true);

      for (let i = 1; i <= MAX_RETRIES && !cancelled; i++) {
        setRetryCount(i);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, RETRY_DELAY_MS);
        });
        if (cancelled) return;

        const found = await fetchOrderBySession();
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

  const titleKey = error ? `errorTitles.${error}` : null;
  const errorTitle = titleKey && t.has(titleKey) ? t(titleKey) : t('errorTitle');

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
        {isRetryable && hasSuggestions && (
          <section className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
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
