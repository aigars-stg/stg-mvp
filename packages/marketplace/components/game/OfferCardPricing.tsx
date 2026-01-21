'use client';

import { Badge } from '@second-turn/design-system';
import { Tag as Gavel } from 'griddy-icons';
import { PriceBreakdown } from '@/components/common/PriceBreakdown';
import type { ListingWithSeller } from '@/lib/types/listing';
import { isAuctionListing } from '@/lib/types/listing';
import type { DeliveredPricingResult } from '@/lib/hooks/useDeliveredPricing';
import { useTranslations } from 'next-intl';

interface OfferCardPricingProps {
  listing: ListingWithSeller;
  deliveredPricing: DeliveredPricingResult;
  variant?: 'desktop' | 'mobile';
}

export function OfferCardPricing({ listing, deliveredPricing, variant = 'desktop' }: OfferCardPricingProps) {
  const t = useTranslations('OfferCard');

  const priceClasses = variant === 'mobile' ? 'text-xl' : 'text-2xl';

  if (isAuctionListing(listing)) {
    return (
      <div className={variant === 'mobile' ? '' : 'text-right'}>
        {/* Auction badge and current bid */}
        {variant === 'desktop' && (
          <div className="flex items-center gap-2 justify-end mb-1">
            <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
              {t('auction.badge')}
            </Badge>
          </div>
        )}
        {variant === 'mobile' && (
          <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
            {t('auction.badge')}
          </Badge>
        )}
        <div className={`text-xs text-text-secondary ${variant === 'mobile' ? 'mt-1' : 'mb-0.5'}`}>
          {listing.auction_current_bid ? t('auction.currentBid') : t('auction.startingPrice')}
        </div>
        <div className={`${priceClasses} font-bold text-aurora-purple`}>
          €{(listing.auction_current_bid || listing.auction_start_price || 0).toFixed(2)}
        </div>
        {variant === 'desktop' && listing.auction_bid_count !== undefined && listing.auction_bid_count > 0 && (
          <div className="text-xs text-text-muted mt-0.5">
            {listing.auction_bid_count} {listing.auction_bid_count === 1 ? t('auction.bid') : t('auction.bids')}
          </div>
        )}
      </div>
    );
  }

  if (deliveredPricing.canCalculate) {
    return (
      <div className={variant === 'mobile' ? '' : 'text-right'}>
        {/* Total delivered as primary price */}
        <div className={`${priceClasses} font-bold text-polar-night dark:text-snow-stormLightest`}>
          €{deliveredPricing.totalDelivered.toFixed(2)}
          {deliveredPricing.isEstimate && (
            <span className={`${variant === 'mobile' ? 'text-sm' : 'text-base'} font-normal text-text-muted dark:text-snow-stormMedium`}>*</span>
          )}
        </div>
        {/* Previous price strikethrough */}
        {listing.previous_price && listing.previous_price > listing.price && (
          <div className={`flex items-center gap-1.5 ${variant === 'desktop' ? 'justify-end' : ''}`}>
            <span className="text-sm text-text-muted dark:text-snow-stormMedium line-through">
              €{listing.previous_price.toFixed(2)}
            </span>
            {variant === 'desktop' && (
              <span className="text-xs text-aurora-green font-medium">
                {t('price.save', { percentage: Math.round((1 - listing.price / listing.previous_price) * 100) })}
              </span>
            )}
          </div>
        )}
        {/* Price breakdown */}
        {variant === 'desktop' && (
          <div className="mt-1.5">
            <PriceBreakdown pricing={deliveredPricing} variant="full" />
          </div>
        )}
        {variant === 'mobile' && (
          <PriceBreakdown pricing={deliveredPricing} variant="compact" />
        )}
      </div>
    );
  }

  // Item price only for contact_seller or non-Baltic
  return (
    <div className={variant === 'mobile' ? '' : 'text-right'}>
      <div className={`${priceClasses} font-bold text-polar-night dark:text-snow-stormLightest`}>
        €{listing.price.toFixed(2)}
      </div>
      {listing.previous_price && listing.previous_price > listing.price && (
        <div className={`flex items-center gap-1.5 ${variant === 'desktop' ? 'justify-end' : ''}`}>
          <span className="text-sm text-text-muted dark:text-snow-stormMedium line-through">
            €{listing.previous_price.toFixed(2)}
          </span>
          <span className="text-xs text-aurora-green font-medium">
            {t('price.save', { percentage: Math.round((1 - listing.price / listing.previous_price) * 100) })}
          </span>
        </div>
      )}
    </div>
  );
}
