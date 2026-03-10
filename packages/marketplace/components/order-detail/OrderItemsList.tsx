'use client';

import { Link } from '@/i18n/navigation';
import { Badge } from '@second-turn/design-system';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { ListingThumbnail } from '@/components/common/ListingThumbnail';
import { resolveListingImage } from '@/lib/utils/listing-image';
import { formatPrice } from '@/lib/services/pricing';
import type { OrderDetailItem } from '@/lib/types/order-detail';

interface OrderItemsListProps {
  items: OrderDetailItem[];
  /** Compact mode for sidebar display (smaller thumbnails, tighter spacing) */
  compact?: boolean;
  /** Show clickable links to game pages */
  showGameLinks?: boolean;
  title?: string;
}

export function OrderItemsList({
  items,
  compact = false,
  showGameLinks = false,
  title,
}: OrderItemsListProps) {
  return (
    <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4">
      {title && (
        <h3 className="text-sm font-semibold text-polar-night mb-3">
          {title}
        </h3>
      )}
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex gap-${compact ? '3' : '4'} ${
              compact
                ? ''
                : 'pb-4 border-b border-border-subtle last:border-0 last:pb-0'
            }`}
          >
            <ListingThumbnail
              src={resolveListingImage({
                gameThumbnail: item.game_thumbnail ?? null,
                photoUrl: item.photo_url,
              })}
              alt={item.game_name}
              size={compact ? 'md' : 'xl'}
            />
            <div className="flex-grow min-w-0">
              {showGameLinks && item.bgg_game_id ? (
                <Link
                  href={`/game/${item.bgg_game_id}`}
                  className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
                >
                  {item.game_name}
                </Link>
              ) : (
                <p
                  className={`font-medium text-polar-night ${
                    compact ? 'truncate text-sm' : 'line-clamp-2'
                  }`}
                >
                  {item.game_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={item.condition as ListingCondition}
                  size="sm"
                >
                  {getConditionLabel(item.condition as ListingCondition)}
                </Badge>
                {compact && (
                  <span className="text-sm font-semibold text-polar-night">
                    {formatPrice(item.price)}
                  </span>
                )}
              </div>
            </div>
            {!compact && (
              <div className="text-right flex-shrink-0">
                <span className="font-bold text-polar-night">
                  {formatPrice(item.price)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
