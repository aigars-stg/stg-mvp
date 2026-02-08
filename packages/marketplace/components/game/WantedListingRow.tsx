/* eslint-disable @next/next/no-img-element -- game thumbnails and avatars are external URLs */
'use client';

import { useRouter } from 'next/navigation';
import { Badge, Button } from '@second-turn/design-system';
import { LocationPin as MapPin } from 'griddy-icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getBudgetDisplay } from '@/lib/types/wanted-listing';
import { getConditionLabel, ListingCondition } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useTranslations } from 'next-intl';

interface WantedListingRowProps {
  listing: WantedListingWithDetails;
  showBuyer?: boolean;
}

export function WantedListingRow({
  listing,
  showBuyer = true,
}: WantedListingRowProps) {
  const router = useRouter();
  const t = useTranslations('Wanted.ListingCard');
  const budgetDisplay = getBudgetDisplay(
    listing.min_price,
    listing.max_price,
    listing.currency
  );

  // Response tracking
  const isAtMaxResponses = listing.response_count >= 10;

  const handleIHaveThis = () => {
    router.push(`/sell?wantedListingId=${listing.id}`);
  };

  return (
    <div className="bg-snow-white border-2 rounded-xl overflow-hidden transition-all border-border hover:border-aurora-orange/50 hover:ring-2 hover:ring-aurora-orange/20">
      <div className="p-4">
        {/* Desktop: horizontal layout */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Budget */}
          <div className="flex-shrink-0 min-w-[100px]">
            <div className="text-lg font-bold text-aurora-orange">
              {budgetDisplay}
            </div>
          </div>

          {/* Conditions */}
          <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
            {listing.acceptable_conditions.map((condition) => (
              <Badge
                key={condition}
                variant={condition as ListingCondition}
                size="sm"
              >
                {getConditionLabel(condition)}
              </Badge>
            ))}
          </div>

          {/* Location Preferences */}
          {listing.location_preferences && (
            <div className="flex items-center gap-1 text-xs text-text-secondary flex-shrink-0">
              <MapPin className="w-3 h-3" />
              <span className="max-w-[120px] truncate">{listing.location_preferences}</span>
            </div>
          )}

          {/* Buyer Info */}
          {showBuyer && listing.buyer && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {listing.buyer.avatar_url ? (
                <img
                  src={listing.buyer.avatar_url}
                  alt={listing.buyer.full_name}
                  className="w-6 h-6 rounded-sm object-cover border border-border-subtle"
                />
              ) : (
                <div className="w-6 h-6 rounded-sm bg-aurora-orange/20 flex items-center justify-center text-xs font-semibold text-aurora-orange">
                  {listing.buyer.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-text-secondary max-w-[100px] truncate">
                {listing.buyer.full_name}
              </span>
              {listing.buyer.country && getCountryFlag(listing.buyer.country) && (
                <span
                  className={getCountryFlag(listing.buyer.country)}
                  role="img"
                  aria-label={getCountryName(listing.buyer.country)}
                  title={getCountryName(listing.buyer.country)}
                />
              )}
            </div>
          )}

          {/* I Have This Button */}
          <div className="flex-shrink-0">
            {!isAtMaxResponses ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleIHaveThis}
              >
                {t('iHaveThis')}
              </Button>
            ) : (
              <span className="text-xs text-text-secondary px-3 py-1.5">
                {t('maxResponsesReached')}
              </span>
            )}
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div className="sm:hidden space-y-3">
          {/* Budget */}
          <div className="text-lg font-bold text-aurora-orange">
            {budgetDisplay}
          </div>

          {/* Conditions */}
          <div className="flex flex-wrap gap-1.5">
            {listing.acceptable_conditions.map((condition) => (
              <Badge
                key={condition}
                variant={condition as ListingCondition}
                size="sm"
              >
                {getConditionLabel(condition)}
              </Badge>
            ))}
          </div>

          {/* Location */}
          {listing.location_preferences && (
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <MapPin className="w-3 h-3" />
              <span>{listing.location_preferences}</span>
            </div>
          )}

          {/* Buyer + Button */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            {showBuyer && listing.buyer && (
              <div className="flex items-center gap-2">
                {listing.buyer.avatar_url ? (
                  <img
                    src={listing.buyer.avatar_url}
                    alt={listing.buyer.full_name}
                    className="w-6 h-6 rounded-sm object-cover border border-border-subtle"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-sm bg-aurora-orange/20 flex items-center justify-center text-xs font-semibold text-aurora-orange">
                    {listing.buyer.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-text-secondary">
                  {listing.buyer.full_name}
                </span>
                {listing.buyer.country && getCountryFlag(listing.buyer.country) && (
                  <span
                    className={getCountryFlag(listing.buyer.country)}
                    role="img"
                    aria-label={getCountryName(listing.buyer.country)}
                  />
                )}
              </div>
            )}

            {!isAtMaxResponses ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleIHaveThis}
              >
                {t('iHaveThis')}
              </Button>
            ) : (
              <span className="text-xs text-text-secondary">
                {t('maxResponsesReached')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
