'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Badge, Button } from '@second-turn/design-system';
import { Package, Users, User as Baby, Time as Clock, BookOpen, PuzzlePiece as Puzzle, Globe, Building } from 'griddy-icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useTranslations } from 'next-intl';

// Priority languages for Baltic region (same as ListingCard)
const PRIORITY_LANGUAGES = ['Latvian', 'Lithuanian', 'Estonian', 'English', 'German'];

/**
 * Format languages for display - if more than 4, show all priority languages + count of others
 */
function formatLanguages(languageString: string): string {
  const languages = languageString.split(/[,|]\s*/).map(l => l.trim()).filter(Boolean);

  if (languages.length <= 4) {
    return languages.join(' / ');
  }

  const priorityPresent = PRIORITY_LANGUAGES.filter(lang => languages.includes(lang));
  const nonPriorityCount = languages.length - priorityPresent.length;

  if (priorityPresent.length > 0 && nonPriorityCount > 0) {
    return `${priorityPresent.join(' / ')} +${nonPriorityCount}`;
  }

  const displayLangs = priorityPresent.length > 0 ? priorityPresent : languages.slice(0, 2);
  const remaining = languages.length - displayLangs.length;

  if (remaining > 0) {
    return `${displayLangs.slice(0, 2).join(' / ')} +${languages.length - 2}`;
  }

  return displayLangs.join(' / ');
}

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
  const router = useRouter();
  const t = useTranslations('Wanted.ListingCard');

  // Format budget display with translation
  const currencySymbol = wantedListing.currency === 'EUR' ? '€' : wantedListing.currency;
  const budgetDisplay = wantedListing.min_price && wantedListing.min_price > 0
    ? `${currencySymbol}${wantedListing.min_price}–${currencySymbol}${wantedListing.max_price}`
    : t('upTo', { price: `${currencySymbol}${wantedListing.max_price}` });

  // Format edition with year like OfferCard: "Latvian edition, 2024"
  const formattedEdition = wantedListing.version_name
    ? wantedListing.edition_year
      ? `${wantedListing.version_name}, ${wantedListing.edition_year}`
      : wantedListing.version_name
    : wantedListing.edition_year
      ? `${wantedListing.edition_year}`
      : null;

  const handleIHaveThisClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Redirect to sell page with wanted listing context
    router.push(`/sell?wantedListingId=${wantedListing.id}`);
  };

  return (
    <Link href={`/game/${wantedListing.bgg_game_id}#wanted`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <div className="relative h-64 bg-polar-night/5 flex items-center justify-center overflow-hidden">
          {(wantedListing.version_image || wantedListing.game?.image) ? (
            // eslint-disable-next-line @next/next/no-img-element -- external BGG image URLs
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
            {t('wantedBadge')}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Variable height content */}
          <div className="space-y-2">
            {/* Game Name */}
            <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem]">
              {wantedListing.game_name}
            </h3>

            {/* Expansion Badge */}
            {wantedListing.game?.is_expansion && (
              <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                {t('expansion')}
              </Badge>
            )}

            {/* Game Metadata - tighter spacing */}
            {(wantedListing.game?.player_count || wantedListing.game?.min_age || wantedListing.game?.playing_time) && (
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary items-center">
                {wantedListing.game.player_count && (
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3.5 h-3.5" />
                    {wantedListing.game.player_count}
                  </span>
                )}
                {wantedListing.game.min_age && (
                  <span className="flex items-center gap-0.5">
                    <Baby className="w-3.5 h-3.5" />
                    {wantedListing.game.min_age}+
                  </span>
                )}
                {wantedListing.game.playing_time && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    {wantedListing.game.playing_time}
                  </span>
                )}
              </div>
            )}

            {/* Version Info - edition, language, publisher (like OfferCard) */}
            {(formattedEdition || wantedListing.language || wantedListing.publisher) && (
              <div className="text-sm text-text-secondary space-y-0.5">
                {formattedEdition && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="line-clamp-1">{formattedEdition}</span>
                  </p>
                )}
                {wantedListing.language && (
                  <p className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span
                      className="line-clamp-1"
                      title={wantedListing.language.split(/[,|]\s*/).length > 4 ? wantedListing.language : undefined}
                    >
                      {formatLanguages(wantedListing.language)}
                    </span>
                  </p>
                )}
                {wantedListing.publisher && (
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="line-clamp-1">{wantedListing.publisher.replace(/ \| /g, ' / ')}</span>
                  </p>
                )}
              </div>
            )}

            {/* Notes (like condition_notes in sale listings) */}
            {wantedListing.notes && (
              <p className="text-sm text-text-secondary line-clamp-2 italic">
                &ldquo;{wantedListing.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Spacer to push price down */}
          <div className="flex-grow" />

          {/* Budget - aligned at bottom */}
          <div className="pt-2">
            <span className="text-2xl font-bold text-aurora-orange">
              {budgetDisplay}
            </span>
          </div>

          {/* Bottom Section: Buyer Info + I Have This Button */}
          <div className="pt-2 space-y-2 border-t border-border-subtle">
            {/* Buyer Info */}
            {showBuyer && wantedListing.buyer && (
              <div className="flex items-center gap-2">
                {wantedListing.buyer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external avatar URLs
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
            {onIHaveThis && (
              <Button
                variant="primary"
                fullWidth
                onClick={handleIHaveThisClick}
              >
                {t('iHaveThis')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
