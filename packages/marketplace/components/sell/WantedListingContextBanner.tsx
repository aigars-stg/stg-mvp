'use client';

import { Card, Badge } from '@second-turn/design-system';
import { User as UserIcon, LocationPin as MapPin, Notification as Bell } from 'griddy-icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useTranslations } from 'next-intl';

interface WantedListingContextBannerProps {
  wantedListing: WantedListingWithDetails;
  isLoading?: boolean;
}

/**
 * WantedListingContextBanner - Shows buyer requirements when creating a listing
 * from the "I have this" flow.
 *
 * Intentionally does NOT show the exact budget to avoid anchoring seller pricing.
 * Shows only: acceptable conditions, preferred edition/language, location preferences.
 */
export function WantedListingContextBanner({
  wantedListing,
  isLoading = false,
}: WantedListingContextBannerProps) {
  const t = useTranslations('Sell.WantedContext');

  if (isLoading) {
    return (
      <Card padding="md" className="mb-6 bg-aurora-orange/10 border border-aurora-orange/30 animate-pulse">
        <div className="h-20 bg-aurora-orange/20 rounded" />
      </Card>
    );
  }

  const buyerName = wantedListing.buyer?.full_name || t('aBuyer');
  const buyerCountry = wantedListing.buyer?.country;

  return (
    <Card padding="md" className="mb-6 bg-aurora-orange/10 border border-aurora-orange/30">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-aurora-orange/20 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-aurora-orange" />
          </div>
          <div>
            <h3 className="font-semibold text-polar-night">
              {t('title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('subtitle', { buyer: buyerName })}
            </p>
          </div>
        </div>

        {/* Buyer Requirements */}
        <div className="space-y-3 pl-13">
          {/* Acceptable Conditions */}
          {wantedListing.acceptable_conditions && wantedListing.acceptable_conditions.length > 0 && (
            <div>
              <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
                {t('acceptableConditions')}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {wantedListing.acceptable_conditions.map((condition) => (
                  <Badge
                    key={condition}
                    variant={condition as any}
                    size="sm"
                  >
                    {getConditionLabel(condition)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Edition/Language */}
          {(wantedListing.version_name || wantedListing.preferred_language) && (
            <div>
              <span className="text-xs text-text-muted uppercase tracking-wide font-medium">
                {t('preferredEdition')}
              </span>
              <p className="text-sm text-text-secondary mt-0.5">
                {[wantedListing.version_name, wantedListing.preferred_language].filter(Boolean).join(' • ')}
              </p>
            </div>
          )}

          {/* Location Preferences */}
          {wantedListing.location_preferences && (
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <MapPin className="w-3.5 h-3.5 text-text-muted" />
              <span>{wantedListing.location_preferences}</span>
            </div>
          )}

          {/* Buyer Location */}
          {buyerCountry && (
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <span className="text-xs text-text-muted">{t('buyerLocation')}</span>
              {getCountryFlag(buyerCountry) && (
                <span
                  className={getCountryFlag(buyerCountry)}
                  role="img"
                  aria-label={getCountryName(buyerCountry)}
                />
              )}
              <span>{getCountryName(buyerCountry)}</span>
            </div>
          )}
        </div>

        {/* Notification Notice */}
        <div className="flex items-start gap-2 pt-3 border-t border-aurora-orange/20">
          <Bell className="w-4 h-4 text-aurora-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary">
            {t('notificationNotice')}
          </p>
        </div>
      </div>
    </Card>
  );
}
