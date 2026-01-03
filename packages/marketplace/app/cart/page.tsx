'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Card } from '@second-turn/design-system';
import {
  ShoppingCart,
  Trash2,
  Package,
  ArrowRight,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCart } from '@/lib/contexts/CartContext';
import { CountryPrompt } from '@/components/onboarding';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';

interface CartItem {
  item_id: string;
  listing_id: string;
  bgg_game_id: number;
  game_name: string;
  price: number;
  photo_url: string | null;
  condition: string;
  expires_at: string;
  is_expired: boolean;
}

interface CartBasket {
  basket_id: string;
  seller_id: string;
  seller_name: string;
  seller_country: string | null;
  items: CartItem[];
  item_count: number;
  subtotal: number;
}

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

  const [baskets, setBaskets] = useState<CartBasket[]>([]);
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

      const fetchedBaskets: CartBasket[] = data.baskets || [];

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
      // Could show a toast notification here
    } finally {
      setRemovingItem(null);
    }
  };

  // Handle expired item - automatically remove from cart
  const handleItemExpired = async (listingId: string) => {
    try {
      // Remove expired item from cart
      await fetch(`/api/cart?listingId=${listingId}`, {
        method: 'DELETE',
      });
      // Refresh cart to update UI
      await fetchCart();
      // Refresh cart context so navbar count updates
      refreshCartContext();
    } catch (err) {
      console.error('Error removing expired item:', err);
      // Still refresh to show current state
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading your cart...</p>
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="w-8 h-8 text-frost-ice" />
          <h1 className="text-3xl font-bold text-polar-night">Cart</h1>
        </div>

        {summary && summary.totalItems > 0 && (
          <p className="text-text-secondary mb-8">
            {summary.totalItems} item{summary.totalItems !== 1 ? 's' : ''} from{' '}
            {summary.basketCount} seller{summary.basketCount !== 1 ? 's' : ''}
          </p>
        )}
        {/* Country Prompt - shown if logged in but no country set */}
        {user && !profile?.country && <CountryPrompt />}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">Error loading cart</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCart}
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Empty Cart */}
        {!loading && baskets.length === 0 && (
          <Card padding="lg" className="text-center min-h-[60vh] flex flex-col justify-center items-center">
            <ShoppingCart className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-polar-night mb-2">
              Your cart is empty
            </h2>
            <p className="text-text-secondary mb-6">
              Your next favourite game is out there - we'll hold it here when you find it.
            </p>
            <Link href="/browse">
              <Button variant="accent">
                Browse games
              </Button>
            </Link>
          </Card>
        )}

        {/* Cart Baskets */}
        {baskets.length > 0 && (
          <div className="space-y-6">
            {baskets.map((basket, index) => (
              <div
                key={basket.basket_id}
                className="bg-snow-white border-2 border-border rounded-xl overflow-hidden"
              >
                {/* Basket Header */}
                <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-b border-border-subtle">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-frost-ice/20 flex items-center justify-center text-frost-ice font-bold">
                        {basket.seller_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-polar-night">
                            {basket.seller_name}
                          </span>
                          {basket.seller_country && getCountryFlag(basket.seller_country) && (
                            <span
                              className={`${getCountryFlag(basket.seller_country)}`}
                              title={getCountryName(basket.seller_country)}
                            />
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">
                          {basket.item_count} item{basket.item_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">
                      Basket {index + 1}/{baskets.length}
                    </Badge>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-border-subtle">
                  {basket.items.map((item) => (
                    <div
                      key={item.item_id}
                      className={`p-4 sm:p-6 ${item.is_expired ? 'opacity-50' : ''}`}
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden">
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.game_name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-text-muted" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-grow min-w-0">
                          <Link
                            href={`/game/${item.bgg_game_id}`}
                            className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
                          >
                            {item.game_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={item.condition as any} size="sm">
                              {getConditionLabel(item.condition as ListingCondition)}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <ReservationTimer
                              expiresAt={item.expires_at}
                              onExpire={() => handleItemExpired(item.listing_id)}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Price & Remove */}
                        <div className="flex flex-col items-end justify-between">
                          <span className="text-lg font-bold text-polar-night">
                            €{item.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.listing_id)}
                            disabled={removingItem === item.listing_id}
                            className="p-2 text-text-muted hover:text-aurora-red hover:bg-aurora-red/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove from cart"
                          >
                            {removingItem === item.listing_id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Basket Footer */}
                <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-t border-border-subtle">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">Subtotal</p>
                      <p className="text-xl font-bold text-polar-night">
                        €{basket.subtotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        + shipping (calculated at checkout)
                      </p>
                    </div>
                    <Button
                      variant="accent"
                      onClick={() => handleCheckout(basket.basket_id)}
                      disabled={basket.items.some((i) => i.is_expired)}
                    >
                      Checkout
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Cart Summary */}
            {summary && baskets.length > 1 && (
              <div className="bg-frost-ice/5 border-2 border-frost-ice/20 rounded-xl p-6">
                <h3 className="font-semibold text-polar-night mb-4">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total items</span>
                    <span className="font-medium">{summary.totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">From sellers</span>
                    <span className="font-medium">{summary.basketCount}</span>
                  </div>
                  <div className="border-t border-border-subtle pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-polar-night">
                        Subtotal (all baskets)
                      </span>
                      <span className="font-bold text-lg text-polar-night">
                        €{summary.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-4">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Each basket is checked out and paid separately
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-aurora-yellow/10 border border-aurora-yellow/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-aurora-yellow flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-polar-night">
                    Items are reserved for 30 minutes
                  </p>
                  <p className="text-text-secondary mt-1">
                    Complete your checkout before the timer expires to secure your games.
                    Each seller basket is paid separately.
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
