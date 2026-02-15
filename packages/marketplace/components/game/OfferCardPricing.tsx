'use client';

import { Badge } from '@second-turn/design-system';
import { Gavel } from '@/lib/icons';
import type { ListingWithSeller } from '@/lib/types/listing';
import { isAuctionListing } from '@/lib/types/listing';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

interface OfferCardPricingProps {
  listing: ListingWithSeller;
  variant?: 'desktop' | 'mobile';
}

export function OfferCardPricing({ listing, variant = 'desktop' }: OfferCardPricingProps) {
  const t = useTranslations('OfferCard');

  const priceClasses = variant === 'mobile' ? 'text-xl' : 'text-2xl';

  if (isAuctionListing(listing)) {
    const hasBids = listing.auction_bid_count !== undefined && listing.auction_bid_count > 0;
    const displayPrice = listing.auction_current_bid || listing.auction_start_price || 0;
    const isEnded = listing.auction_ends_at && new Date(listing.auction_ends_at) < new Date();

    return (
      <div className={variant === 'mobile' ? '' : 'text-right'}>
        {/* Auction badge — show "Ended" variant for expired auctions */}
        {variant === 'desktop' && (
          <div className="flex items-center gap-2 justify-end mb-1">
            {isEnded ? (
              <Badge variant="default" size="sm">
                {t('auction.ended')}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
                {t('auction.badge')}
              </Badge>
            )}
          </div>
        )}
        {variant === 'mobile' && (
          isEnded ? (
            <Badge variant="default" size="sm">
              {t('auction.ended')}
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
              {t('auction.badge')}
            </Badge>
          )
        )}
        {/* Price display */}
        {hasBids ? (
          <>
            <div className={`${priceClasses} font-bold ${isEnded ? 'text-text-muted' : 'text-aurora-purple'} ${variant === 'mobile' ? 'mt-1' : ''}`}>
              {formatPrice(displayPrice)}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {isEnded
                ? t('auction.finalBid')
                : `${listing.auction_bid_count} ${listing.auction_bid_count === 1 ? t('auction.bid') : t('auction.bids')}`
              }
            </div>
          </>
        ) : (
          <div className={`${priceClasses} font-bold text-aurora-purple ${variant === 'mobile' ? 'mt-1' : ''}`}>
            {t('auction.startingAt', { price: displayPrice.toFixed(2) })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={variant === 'mobile' ? '' : 'text-right'}>
      <div className={`${priceClasses} font-bold text-polar-night`}>
        {formatPrice(listing.price)}
      </div>
      {listing.previous_price && listing.previous_price > listing.price && (
        <div className={`flex items-center gap-1.5 ${variant === 'desktop' ? 'justify-end' : ''}`}>
          <span className="text-sm text-text-muted line-through">
            {formatPrice(listing.previous_price)}
          </span>
          {variant === 'desktop' && (
            <span className="text-xs text-aurora-green font-medium">
              {t('price.save', { percentage: Math.round((1 - listing.price / listing.previous_price) * 100) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
