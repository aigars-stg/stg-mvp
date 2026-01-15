'use client';

import { Card, Badge, Button } from '@second-turn/design-system';
import { Tag } from 'griddy-icons';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface ExistingSalesBannerProps {
  gameId: number;
  gameName: string;
  listings: Array<{
    id: string;
    price: number;
    condition: string;
    seller: { full_name: string };
  }>;
  onDismiss?: () => void;
}

export function ExistingSalesBanner({ gameId, gameName, listings, onDismiss }: ExistingSalesBannerProps) {
  const t = useTranslations('Wanted.ExistingSalesBanner');

  if (listings.length === 0) return null;

  const prices = listings.map(l => l.price).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const conditions = [...new Set(listings.map(l => l.condition))];

  return (
    <Card padding="md" className="mb-6 bg-frost-ice/10 border border-frost-ice/30">
      <div className="space-y-4">
        {/* Header - matches WantedListingContextBanner style */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5 text-frost-ice" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-polar-night">
              {t('title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('subtitle', { count: listings.length })}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-text-muted hover:text-text-secondary text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>

        {/* Listing Details */}
        <div className="space-y-3 pl-13">
          {/* Price Range */}
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
              {t('priceRangeLabel')}
            </span>
            <p className="text-sm font-medium text-frost-ice mt-0.5">
              {minPrice === maxPrice
                ? `€${minPrice.toFixed(2)}`
                : `€${minPrice.toFixed(2)} – €${maxPrice.toFixed(2)}`}
            </p>
          </div>

          {/* Available Conditions */}
          {conditions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
                {t('availableConditions')}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {conditions.map((condition) => (
                  <Badge key={condition} variant={condition as any} size="sm">
                    {getConditionLabel(condition as ListingCondition)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-frost-ice/20">
          <p className="text-xs text-text-secondary">
            {t('hint')}
          </p>
          <Link href={`/game/${gameId}#for-sale`}>
            <Button variant="secondary" size="sm">
              {t('viewListings')}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
