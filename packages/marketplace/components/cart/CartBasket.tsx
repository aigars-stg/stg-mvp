'use client';

import { Button } from '@second-turn/design-system';
import { ChevronRight } from '@/lib/icons';
import { UserInfoCard } from '@/components/user/UserInfoCard';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { CartItemCard, type CartItemData } from './CartItemCard';
import { CartBasketSummary } from './CartBasketSummary';
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
  onItemExpired?: () => void;
  onExtend?: () => Promise<void>;
  canExtend?: boolean;
  isExtending?: boolean;
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
  isExtending = false,
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
      {/* Basket Header - Seller Card */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Seller Info */}
          <UserInfoCard
            user={{
              id: basket.seller_id,
              name: basket.seller_name,
              avatarUrl: basket.seller_avatar_url,
              country: basket.seller_country,
            }}
            seller={{
              totalSales: basket.seller_total_sales,
              averageRating: basket.seller_rating,
              totalReviews: basket.seller_review_count,
            }}
            size="sm"
            compact
            linkToProfile
          />

          {/* Reservation Timer */}
          {earliestExpiry && !hasExpiredItems && (
            <div className="self-end sm:self-auto flex-shrink-0">
              <ReservationTimer
                expiresAt={earliestExpiry}
                onExpire={() => {
                  onItemExpired?.();
                }}
                onExtend={onExtend}
                canExtend={canExtend}
                isExtending={isExtending}
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
