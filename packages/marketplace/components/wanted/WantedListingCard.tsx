'use client';

import Link from 'next/link';
import { Card, Badge, Button } from '@second-turn/design-system';
import { Package, MapPin, Users, Baby, Clock, TrendingUp } from 'lucide-react';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getBudgetDisplay, getTimeRemaining, getTimeRemainingDisplay } from '@/lib/types/wanted-listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';

interface WantedListingCardProps {
  wantedListing: WantedListingWithDetails;
  onIHaveThis?: (id: string) => void;
  showBuyer?: boolean;
}

export function WantedListingCard({
  wantedListing,
  onIHaveThis,
  showBuyer = true
}: WantedListingCardProps) {
  const { days, isExpiringSoon, isExpired } = getTimeRemaining(wantedListing.expires_at);
  const timeRemainingText = getTimeRemainingDisplay(wantedListing.expires_at);
  const budgetDisplay = getBudgetDisplay(
    wantedListing.min_price,
    wantedListing.max_price,
    wantedListing.currency
  );

  // Calculate time since posted
  const postedDate = new Date(wantedListing.created_at);
  const now = new Date();
  const hoursSincePosted = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60));
  const daysSincePosted = Math.floor(hoursSincePosted / 24);

  const postedText = daysSincePosted === 0
    ? hoursSincePosted === 0
      ? 'Posted just now'
      : `Posted ${hoursSincePosted}h ago`
    : daysSincePosted === 1
      ? 'Posted yesterday'
      : `Posted ${daysSincePosted}d ago`;

  // High interest indicator (>7 responses)
  const hasHighInterest = wantedListing.response_count >= 7;
  const isAtMaxResponses = wantedListing.response_count >= 10;

  const handleIHaveThisClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onIHaveThis) {
      onIHaveThis(wantedListing.id);
    }
  };

  return (
    <Link href={`/wanted/${wantedListing.id}`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <div className="relative h-64 bg-polar-night/5 flex items-center justify-center overflow-hidden">
          {(wantedListing.version_image || wantedListing.game?.image) ? (
            <img
              src={wantedListing.version_image || wantedListing.game?.image || ''}
              alt={wantedListing.game_name}
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : (
            <Package className="w-16 h-16 text-text-muted" />
          )}

          {/* WANTED Badge */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-aurora-orange backdrop-blur-sm rounded-md text-xs text-snow-white font-bold uppercase tracking-wide shadow-lg">
            Wanted
          </div>

          {/* High Interest Badge */}
          {hasHighInterest && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-aurora-orange/90 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Hot
            </div>
          )}

          {/* Time Remaining Badge */}
          {!isExpired && (
            <div className={`absolute bottom-3 right-3 px-2 py-1 backdrop-blur-sm rounded-md text-xs font-medium ${
              isExpiringSoon
                ? 'bg-aurora-red/90 text-snow-white'
                : 'bg-polar-night/80 text-snow-white'
            }`}>
              {timeRemainingText}
            </div>
          )}

          {isExpired && (
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-surface-2 backdrop-blur-sm rounded-md text-xs text-text-disabled font-medium">
              Expired
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="space-y-3 pb-1">
            {/* Game Name with Year */}
            <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem]">
              {wantedListing.game_name}
              {wantedListing.edition_year && (
                <span className="text-text-muted font-normal"> ({wantedListing.edition_year})</span>
              )}
            </h3>

            {/* Game Metadata */}
            {(wantedListing.game?.player_count || wantedListing.game?.min_age || wantedListing.game?.playing_time || wantedListing.game?.is_expansion) && (
              <div className="flex flex-wrap gap-3 text-xs text-text-secondary items-center">
                {wantedListing.game.player_count && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {wantedListing.game.player_count}
                  </span>
                )}
                {wantedListing.game.min_age && (
                  <span className="flex items-center gap-1">
                    <Baby className="w-4 h-4" />
                    {wantedListing.game.min_age}+
                  </span>
                )}
                {wantedListing.game.playing_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {wantedListing.game.playing_time}
                  </span>
                )}
                {wantedListing.game?.is_expansion && (
                  <Badge variant="warning" size="sm">
                    Expansion
                  </Badge>
                )}
              </div>
            )}

            {/* Version/Publisher Info */}
            {(wantedListing.language || wantedListing.publisher) && (
              <p className="text-sm text-text-secondary line-clamp-2">
                {wantedListing.language?.replace(/ \| /g, ' / ')}
                {wantedListing.language && wantedListing.publisher && ' • '}
                {wantedListing.publisher?.replace(/ \| /g, ' / ')}
              </p>
            )}

            {/* Budget Range */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-2xl font-bold text-aurora-orange">
                {budgetDisplay}
              </div>
            </div>

            {/* Acceptable Conditions */}
            <div className="flex flex-wrap gap-1.5">
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

            {/* Location Preferences */}
            {wantedListing.location_preferences && (
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin className="w-3 h-3" />
                <span>{wantedListing.location_preferences}</span>
              </div>
            )}

            {/* Posted Time & Response Count */}
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{postedText}</span>
              <span className="font-medium">
                {wantedListing.response_count}/10 sellers responded
              </span>
            </div>
          </div>

          {/* Bottom Section: Buyer Info + I Have This Button */}
          <div className="mt-auto pt-3 space-y-3 border-t border-border-subtle">
            {/* Buyer Info */}
            {showBuyer && wantedListing.buyer && (
              <div className="flex items-center gap-2">
                {wantedListing.buyer.avatar_url ? (
                  <img
                    src={wantedListing.buyer.avatar_url}
                    alt={wantedListing.buyer.full_name}
                    className="w-6 h-6 rounded-sm object-cover border border-border-subtle"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-sm bg-aurora-orange/20 flex items-center justify-center text-xs font-semibold text-aurora-orange">
                    {wantedListing.buyer.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-text-secondary line-clamp-1">
                  {wantedListing.buyer.full_name}
                  {wantedListing.buyer.country && getCountryFlag(wantedListing.buyer.country) && (
                    <span
                      className={`${getCountryFlag(wantedListing.buyer.country)} ml-1`}
                      role="img"
                      aria-label={`Country: ${getCountryName(wantedListing.buyer.country)}`}
                      title={getCountryName(wantedListing.buyer.country)}
                    />
                  )}
                </span>
              </div>
            )}

            {/* I Have This Button */}
            {onIHaveThis && !isExpired && !isAtMaxResponses && (
              <Button
                variant="accent"
                fullWidth
                onClick={handleIHaveThisClick}
              >
                I Have This
              </Button>
            )}

            {isAtMaxResponses && !isExpired && (
              <div className="text-center py-2 text-sm text-text-secondary">
                Maximum responses reached
              </div>
            )}

            {isExpired && (
              <div className="text-center py-2 text-sm text-text-disabled">
                Listing expired
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
