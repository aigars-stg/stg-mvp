'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import { ShoppingBasket as ShoppingCart, AlertCircle } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { CountryPrompt } from '@/components/onboarding';
import { CartBasket, CartBasketSkeleton, type CartBasketData } from '@/components/cart';
import { useTranslations } from 'next-intl';

interface CartSummary {
  basketCount: number;
  totalItems: number;
  totalAmount: number;
  currency: string;
}

export default function CartPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { fetchCart: refreshCartContext } = useCart();
  const t = useTranslations('Cart');

  const [baskets, setBaskets] = useState<CartBasketData[]>([]);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  // Fetch cart data and clean up expired items
  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cart');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart');
      }

      const fetchedBaskets: CartBasketData[] = data.baskets || [];

      // Find and remove any expired items
      const expiredItems: string[] = [];
      fetchedBaskets.forEach(basket => {
        basket.items.forEach(item => {
          if (item.is_expired) {
            expiredItems.push(item.listing_id);
          }
        });
      });

      // If there are expired items, remove them silently
      if (expiredItems.length > 0) {
        await Promise.all(
          expiredItems.map(listingId =>
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
    }
  };

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
  }, [user]);

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

  // Handle expired item - automatically remove from cart
  const handleItemExpired = async (listingId: string) => {
    try {
      await fetch(`/api/cart?listingId=${listingId}`, {
        method: 'DELETE',
      });
      await fetchCart();
      refreshCartContext();
    } catch (err) {
      console.error('Error removing expired item:', err);
      await fetchCart();
      refreshCartContext();
    }
  };

  // Proceed to checkout
  const handleCheckout = (basketId: string) => {
    router.push(`/checkout?basket=${basketId}`);
  };

  // Loading state
  if (authLoading || (loading && baskets.length === 0)) {
    return (
      <div className="min-h-screen bg-bg py-8 px-4">
        <div className="max-w-3xl mx-auto">
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
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-3xl mx-auto">
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
          <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
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
              />
            ))}

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
                        €{summary.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-4">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  {t('orderSummary.separateCheckout')}
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-polar-night">
                    {t('infoBox.reserved')}
                  </p>
                  <p className="text-text-secondary mt-1">
                    {t('infoBox.completeCheckout')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
