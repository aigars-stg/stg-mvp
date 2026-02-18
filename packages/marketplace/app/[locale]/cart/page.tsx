'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button, Card } from '@second-turn/design-system';
import { ShoppingBasket as ShoppingCart, AlertCircle } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { CountryPrompt } from '@/components/onboarding';
import { CartBasket, CartBasketSkeleton, type CartBasketData, type CartItemData } from '@/components/cart';
import { ExpiredItemsSection } from '@/components/cart/ExpiredItemsSection';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

interface CartSummary {
  basketCount: number;
  totalItems: number;
  totalAmount: number;
  currency: string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { fetchCart: refreshCartContext, captureExpiredItems, expiredItems } = useCart();
  const t = useTranslations('Cart');

  const [baskets, setBaskets] = useState<CartBasketData[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [maxedBasketIds, setMaxedBasketIds] = useState<Set<string>>(new Set());
  const [extendingBasketId, setExtendingBasketId] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  // Fetch cart data and clean up expired items
  const fetchCart = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);

      const response = await fetch('/api/cart');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart');
      }

      const fetchedBaskets: CartBasketData[] = data.baskets || [];

      // Find expired items, capture them, then remove from server
      const expiredItemObjects: CartItemData[] = [];
      const expiredListingIds: string[] = [];
      fetchedBaskets.forEach(basket => {
        (basket.items || []).forEach(item => {
          if (item.is_expired) {
            expiredItemObjects.push(item);
            expiredListingIds.push(item.listing_id);
          }
        });
      });

      // Capture expired items to context before deletion
      if (expiredItemObjects.length > 0) {
        captureExpiredItems(expiredItemObjects);
      }

      // If there are expired items, remove them silently
      if (expiredListingIds.length > 0) {
        await Promise.all(
          expiredListingIds.map(listingId =>
            fetch(`/api/cart?listingId=${listingId}`, { method: 'DELETE' }).catch(() => { })
          )
        );
        // Re-fetch to get clean cart
        const cleanResponse = await fetch('/api/cart');
        const cleanData = await cleanResponse.json();
        setBaskets(cleanData.baskets || []);
        setSummary(cleanData.summary || null);
      } else {
        setBaskets(fetchedBaskets);
        setSummary(data.summary || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [captureExpiredItems]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/cart');
    }
  }, [user, authLoading, router]);

  // Fetch cart on mount
  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  // Refresh cart when user returns to this tab (catches cron-cleaned items)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCart();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, fetchCart]);

  // Remove item from cart
  const handleRemoveItem = async (listingId: string) => {
    try {
      setRemovingItem(listingId);

      const response = await fetch(`/api/cart?listingId=${listingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove item');
      }

      // Refresh local cart state
      await fetchCart();
      // Refresh cart context so navbar count updates
      refreshCartContext();
    } catch (err) {
      console.error('Error removing item:', err);
    } finally {
      setRemovingItem(null);
    }
  };

  // Handle expired items - fetchCart batch-detects, captures, and deletes all expired items
  const handleItemExpired = async () => {
    await fetchCart();
    refreshCartContext();
  };

  // Extend reservation for a basket
  const handleExtendReservation = async (basketId: string) => {
    setExtendingBasketId(basketId);
    try {
      const response = await fetch('/api/cart/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basketId }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'No items can be extended') {
          setMaxedBasketIds(prev => new Set(prev).add(basketId));
        } else {
          console.error('Failed to extend reservation:', data.error);
        }
        return;
      }

      // Re-fetch cart to get updated expiry times
      await fetchCart();
    } catch (err) {
      console.error('Error extending reservation:', err);
    } finally {
      setExtendingBasketId(null);
    }
  };

  // Proceed to checkout
  const handleCheckout = (basketId: string) => {
    router.push(`/checkout?basket=${basketId}`);
  };

  // Loading state
  if (authLoading || (loading && baskets.length === 0)) {
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-8 h-8 text-frost-ice" />
            <h1 className="text-3xl font-bold text-polar-night">{t('title')}</h1>
          </div>
          <div className="h-5 bg-bg-secondary rounded w-40 mb-8 animate-pulse" />

          {/* Skeleton baskets */}
          <div className="space-y-6">
            <CartBasketSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="w-8 h-8 text-frost-ice" />
          <h1 className="text-3xl font-bold text-polar-night">{t('title')}</h1>
        </div>

        {summary && summary.totalItems > 0 && (
          <p className="text-text-secondary mb-8">
            {t('summary.itemsFromSellers', { totalItems: summary.totalItems, basketCount: summary.basketCount })}
          </p>
        )}

        {/* Country Prompt - shown if logged in but no country set */}
        {user && !profile?.country && <CountryPrompt />}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">{t('error.title')}</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCart}
                className="mt-2"
              >
                {t('error.tryAgain')}
              </Button>
            </div>
          </div>
        )}

        {/* Empty Cart */}
        {!loading && baskets.length === 0 && (
          <>
            {/* Expired items shown above empty cart message */}
            {expiredItems.length > 0 && (
              <div className="mb-6">
                <ExpiredItemsSection onReAdd={fetchCart} />
              </div>
            )}

            <Card padding="lg" className={`text-center flex flex-col justify-center items-center ${expiredItems.length > 0 ? 'min-h-[30vh]' : 'min-h-[60vh]'}`}>
              <ShoppingCart className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-polar-night mb-2">
                {t('emptyCart.title')}
              </h2>
              <p className="text-text-secondary mb-6">
                {t('emptyCart.description')}
              </p>
              <Link href="/browse">
                <Button variant="primary">
                  {t('emptyCart.browseButton')}
                </Button>
              </Link>
            </Card>
          </>
        )}

        {/* Cart Baskets */}
        {baskets.length > 0 && (
          <div className="space-y-6">
            {baskets.map((basket) => (
              <CartBasket
                key={basket.basket_id}
                basket={basket}
                onRemoveItem={handleRemoveItem}
                removingItemId={removingItem}
                onCheckout={() => handleCheckout(basket.basket_id)}
                onItemExpired={handleItemExpired}
                onExtend={() => handleExtendReservation(basket.basket_id)}
                canExtend={!maxedBasketIds.has(basket.basket_id)}
                isExtending={extendingBasketId === basket.basket_id}
              />
            ))}

            {/* Expired items section */}
            {expiredItems.length > 0 && <ExpiredItemsSection onReAdd={fetchCart} />}

            {/* Multi-seller Summary */}
            {summary && baskets.length > 1 && (
              <div className="bg-frost-ice/5 border-2 border-frost-ice/20 rounded-xl p-6">
                <h3 className="font-semibold text-polar-night mb-4">
                  {t('orderSummary.title')}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t('orderSummary.totalItems')}</span>
                    <span className="font-medium">{summary.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">{t('orderSummary.fromSellers')}</span>
                    <span className="font-medium">{summary.basketCount}</span>
                  </div>
                  <div className="border-t border-border-subtle pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-polar-night">
                        {t('orderSummary.subtotalAll')}
                      </span>
                      <span className="font-bold text-lg text-polar-night">
                        {formatPrice(summary.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-4">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {t('orderSummary.separateCheckout')}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('orderSummary.shippingNote')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
