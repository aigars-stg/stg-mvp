'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Badge, Button } from '@second-turn/design-system';
import { Package, X, RefreshCw as Loader2, ShoppingBasket as ShoppingCart } from '@/lib/icons';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';
import { useCart, type ExpiredCartItem } from '@/lib/contexts/CartContext';

interface ExpiredItemCardProps {
  item: ExpiredCartItem;
  onDismiss: (listingId: string) => void;
}

export function ExpiredItemCard({ item, onDismiss }: ExpiredItemCardProps) {
  const t = useTranslations('Cart');
  const { addToCart, dismissExpiredItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayImage = item.game_thumbnail || item.photo_url;
  const conditionVariant = getConditionBadgeVariant(item.condition);

  const handleReAdd = async () => {
    setIsAdding(true);
    setError(null);
    try {
      await addToCart(item.listing_id);
      dismissExpiredItem(item.listing_id);
    } catch {
      setError(t('expiredItems.noLongerAvailable'));
      setTimeout(() => {
        onDismiss(item.listing_id);
      }, 2000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="relative bg-snow-white border border-dashed border-border-subtle rounded-lg p-3 opacity-80 hover:opacity-100 transition-opacity">
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(item.listing_id)}
        className="absolute top-2 right-2 p-1 text-text-muted hover:text-polar-night hover:bg-bg-secondary rounded transition-colors"
        aria-label={t('expiredItems.dismissAll')}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative w-16 h-16 rounded-md bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={item.game_name}
              fill
              className="object-contain p-1"
              sizes="64px"
              unoptimized
            />
          ) : (
            <Package className="w-6 h-6 text-text-muted" />
          )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 pr-4">
          <Link
            href={`/game/${item.bgg_game_id}`}
            className="text-sm font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-1 block"
          >
            {item.game_name}
          </Link>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant={conditionVariant} size="sm">
              {getConditionLabel(item.condition as ListingCondition)}
            </Badge>
            <span className="text-sm font-bold text-polar-night">
              {formatPrice(item.price)}
            </span>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-aurora-red mt-1">{error}</p>
          )}

          {/* Re-add button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReAdd}
            disabled={isAdding || !!error}
            className="mt-2 text-xs"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t('expiredItems.adding')}
              </>
            ) : (
              <>
                <ShoppingCart className="w-3 h-3 mr-1" />
                {t('expiredItems.addAgain')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
