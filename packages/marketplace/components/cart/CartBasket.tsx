'use client';

import { Button } from '@second-turn/design-system';
import { ChevronRight } from '@/lib/icons';
import { Avatar } from '@/components/user/Avatar';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { CartItemCard, type CartItemData } from './CartItemCard';
import { CartBasketSummary } from './CartBasketSummary';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useTranslations } from 'next-intl';

export interface CartBasketData {
  basket_id: string;
  seller_id: string;
  seller_name: string;
  seller_country: string | null;
  items: CartItemData[];
  item_count: number;
  subtotal: number;
  seller_avatar_url: string | null;
  seller_rating: number;
  seller_review_count: number;
  seller_total_sales: number;
}

interface CartBasketProps {
  basket: CartBasketData;
  onRemoveItem: (listingId: string) => void;
  removingItemId?: string | null;
  onCheckout: () => void;
  isCheckingOut?: boolean;
  onItemExpired?: (listingId: string) => void;
  onExtend?: () => Promise<void>;
  canExtend?: boolean;
}

export function CartBasket({
  basket,
  onRemoveItem,
  removingItemId,
  onCheckout,
  isCheckingOut = false,
  onItemExpired,
  onExtend,
  canExtend = false,
}: CartBasketProps) {
  const t = useTranslations('Cart');

  // Get the earliest expiration time for the basket timer
  const earliestExpiry = basket.items.reduce<string | null>((earliest, item) => {
    if (!earliest) return item.expires_at;
    return new Date(item.expires_at) < new Date(earliest) ? item.expires_at : earliest;
  }, null);

  const hasExpiredItems = basket.items.some(item => item.is_expired);

  return (
    <div className="bg-snow-white border border-border rounded-xl overflow-hidden">
      {/* Basket Header - Full Seller Card */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-b border-border-subtle">
        <div className="flex items-center justify-between gap-4">
          {/* Seller Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={basket.seller_avatar_url}
              name={basket.seller_name}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-polar-night truncate">
                  {basket.seller_name}
                </span>
                {basket.seller_country && getCountryFlag(basket.seller_country) && (
                  <span
                    className={getCountryFlag(basket.seller_country)}
                    title={getCountryName(basket.seller_country)}
                  />
                )}
              </div>

              {/* Rating (if seller has reviews) */}
              {basket.seller_review_count > 0 ? (
                <div className="flex items-center gap-1 text-sm text-text-secondary mt-0.5">
                  <span className="text-aurora-yellow">★</span>
                  <span>{basket.seller_rating.toFixed(1)}</span>
                  <span className="text-text-muted">
                    ({basket.seller_review_count} {basket.seller_review_count === 1 ? t('review') : t('reviews')})
                  </span>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t('basket.items', { count: basket.item_count })}
                </p>
              )}
            </div>
          </div>

          {/* Reservation Timer */}
          {earliestExpiry && !hasExpiredItems && (
            <div className="flex-shrink-0">
              <ReservationTimer
                expiresAt={earliestExpiry}
                onExpire={() => {
                  // Only remove items whose expiry has actually passed
                  const now = new Date();
                  basket.items.forEach(item => {
                    if (onItemExpired && new Date(item.expires_at) <= now) {
                      onItemExpired(item.listing_id);
                    }
                  });
                }}
                onExtend={onExtend}
                canExtend={canExtend}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border-subtle">
        {basket.items.map((item) => (
          <CartItemCard
            key={item.item_id}
            item={item}
            onRemove={onRemoveItem}
            isRemoving={removingItemId === item.listing_id}
          />
        ))}
      </div>

      {/* Basket Footer - Summary & Checkout */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Price Summary */}
          <div className="flex-grow max-w-xs">
            <CartBasketSummary
              itemCount={basket.item_count}
              subtotal={basket.subtotal}
            />
          </div>

          {/* Checkout Button */}
          <div className="flex-shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={onCheckout}
              disabled={hasExpiredItems || isCheckingOut}
              className="w-full sm:w-auto"
            >
              {t('basket.checkout')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
