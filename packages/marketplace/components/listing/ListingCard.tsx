'use client';

import { useState } from 'react';
import { Card, Badge } from '@second-turn/design-system';
import { Package, LocationPin as MapPin, AlertCircle, Users, User as Baby, Time as Clock, Heart, PuzzlePiece as Puzzle, BookOpen, Chat as MessageSquare, Gavel } from '@/lib/icons';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import type { ListingWithSeller } from '@/lib/types/listing';
import { isContactSellerListing, isAuctionListing, getAuctionTimeRemaining, formatCompactTimeRemaining } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ConditionInfoModal } from '@/components/common/ConditionInfoModal';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

interface ListingCardProps {
  listing: ListingWithSeller;
  showSeller?: boolean;
  isOwnListing?: boolean; // Whether this listing belongs to the current user
  priority?: boolean; // Whether to set priority on the image (use for LCP images)
}

// Priority languages for Baltic region
const PRIORITY_LANGUAGES = ['Latvian', 'Lithuanian', 'Estonian', 'English', 'German'];

/**
 * Format languages for display - if more than 4, show all priority languages + count of others
 * e.g., "Latvian, Lithuanian, Estonian, English, Russian" → "Latvian / Lithuanian / Estonian / English +1"
 * e.g., "Czech, English, French, German, Hungarian, Polish" → "English / German +4"
 */
function formatLanguages(languageString: string): string {
  const languages = languageString.split(/,\s*/).map(l => l.trim()).filter(Boolean);

  if (languages.length <= 4) {
    return languages.join(' / ');
  }

  // Find all priority languages present, sorted by priority order
  const priorityPresent = PRIORITY_LANGUAGES.filter(lang => languages.includes(lang));
  const nonPriorityCount = languages.length - priorityPresent.length;

  // If we have priority languages, show them all + count of others
  if (priorityPresent.length > 0 && nonPriorityCount > 0) {
    return `${priorityPresent.join(' / ')} +${nonPriorityCount}`;
  }

  // If all languages are priority (or none are), just show first 2 + count
  const displayLangs = priorityPresent.length > 0 ? priorityPresent : languages.slice(0, 2);
  const remaining = languages.length - displayLangs.length;

  if (remaining > 0) {
    return `${displayLangs.slice(0, 2).join(' / ')} +${languages.length - 2}`;
  }

  return displayLangs.join(' / ');
}

export function ListingCard({ listing, showSeller = false, isOwnListing = false, priority = false }: ListingCardProps) {
  const t = useTranslations('Listings');
  const router = useRouter();
  const { user } = useAuth();

  // For auctions, use current bid (or starting price if no bids)
  const isAuction = isAuctionListing(listing);
  const displayPrice = isAuction
    ? (listing.auction_current_bid || listing.auction_start_price || listing.price)
    : listing.price;
  const hasBids = isAuction && listing.auction_bid_count !== undefined && listing.auction_bid_count > 0;

  // Calculate auction time remaining for timer display
  const auctionTimeRemaining = isAuction && listing.auction_ends_at
    ? getAuctionTimeRemaining(listing.auction_ends_at)
    : null;
  const showAuctionTimer = auctionTimeRemaining && auctionTimeRemaining.days === 0 && !auctionTimeRemaining.isEnded;

  // Collect all available images (BGG main image + user photos only)
  const allImages = [
    ...(listing.game?.image ? [listing.game.image] : []),
    ...listing.photo_urls,
  ].filter(Boolean);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showConditionInfo, setShowConditionInfo] = useState(false);

  // Save listing functionality - uses context to avoid per-card API calls
  const { isSaved: checkIsSaved, toggleSave: contextToggleSave } = useSavedListingsContext();
  const isSaved = checkIsSaved(listing.id);
  const [saveLoading, setSaveLoading] = useState(false);

  // Get condition badge variant using shared utility
  const conditionVariant = getConditionBadgeVariant(listing.condition);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/signin?redirectTo=/game/${listing.bgg_game_id}`);
      return;
    }

    try {
      setSaveLoading(true);
      await contextToggleSave(listing.id);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
    <Link href={`/game/${listing.bgg_game_id}`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <ImageCarousel
          images={allImages}
          alt={listing.game_name}
          showArrows={true}
          showDots={true}
          showCounter={true}
          enableSwipe={true}
          imageClassName="object-contain"
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          priority={priority}
          placeholderIcon={<Package className="w-16 h-16 text-text-muted" aria-hidden="true" />}
          ariaLabels={{
            prevImage: t('card.prevImageAria'),
            nextImage: t('card.nextImageAria'),
            viewImage: (n) => t('card.viewImageAria', { number: n }),
          }}
        >
          {/* Save Button - only show for non-own listings */}
          {!isOwnListing && (
            <button
              onClick={handleSaveToggle}
              disabled={saveLoading}
              className="absolute top-3 left-3 w-8 h-8 rounded-md bg-snow-white/90 hover:bg-snow-white flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              aria-label={isSaved ? t('card.unsaveAria') : t('card.saveAria')}
            >
              <Heart
                aria-hidden="true"
                className={`w-4 h-4 transition-all ${
                  isSaved
                    ? 'fill-aurora-red text-aurora-red'
                    : 'text-text-secondary'
                }`}
              />
            </button>
          )}

          {/* Condition ribbon - top right */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowConditionInfo(true);
            }}
            className="absolute top-3 right-3 cursor-pointer hover:opacity-90 transition-opacity"
            aria-label={t('card.learnConditionAria', { condition: t(`conditions.${listing.condition}`) })}
          >
            <Badge variant={conditionVariant} size="sm">
              {t(`conditions.${listing.condition}`)}
            </Badge>
          </button>

          {/* Contact Seller badge - bottom left */}
          {isContactSellerListing(listing) && (
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium flex items-center gap-1">
              <MessageSquare className="w-3 h-3" aria-hidden="true" />
              {t('card.contactSeller')}
            </div>
          )}
        </ImageCarousel>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Variable height content */}
          <div className="space-y-2">
            {/* Game Name */}
            <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem]">
              {listing.game_name}
            </h3>

            {/* Expansion Badge */}
            {listing.game?.is_expansion && (
              <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" aria-hidden="true" />}>
                {t('card.expansion')}
              </Badge>
            )}

            {/* Auction Badge + Timer */}
            {isAuction && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" aria-hidden="true" />} className="border-aurora-purple/50 text-aurora-purple">
                  {t('auction.badge')}
                </Badge>
                {showAuctionTimer && auctionTimeRemaining && (
                  <span className={`text-xs flex items-center gap-1 ${
                    auctionTimeRemaining.isEndingSoon ? 'text-aurora-red font-medium' : 'text-text-muted'
                  }`}>
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatCompactTimeRemaining(auctionTimeRemaining)}
                  </span>
                )}
              </div>
            )}

            {/* Game Metadata - tighter spacing */}
            {(listing.game?.player_count || listing.game?.min_age || listing.game?.playing_time || (listing.included_expansions && listing.included_expansions.length > 0)) && (
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary items-center">
                {listing.game?.player_count && (
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    {listing.game.player_count}
                  </span>
                )}
                {listing.game?.min_age && (
                  <span className="flex items-center gap-0.5">
                    <Baby className="w-3.5 h-3.5" aria-hidden="true" />
                    {listing.game.min_age}+
                  </span>
                )}
                {listing.game?.playing_time && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {listing.game.playing_time}
                  </span>
                )}
                {listing.included_expansions && listing.included_expansions.length > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-aurora-green"
                    title={listing.included_expansions.map(e => e.name).join(', ')}
                  >
                    <Puzzle className="w-3.5 h-3.5" aria-hidden="true" />
                    +{listing.included_expansions.length}
                  </span>
                )}
              </div>
            )}

            {/* Language + Missing Components Warning */}
            {(listing.language || !listing.all_components_present) && (
              <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                {listing.language && (
                  <span
                    className="flex items-center gap-1 line-clamp-1"
                    title={listing.language.split(/,\s*/).length > 4 ? listing.language : undefined}
                  >
                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    {formatLanguages(listing.language)}
                  </span>
                )}
                {!listing.all_components_present && (
                  <span title={t('card.missingComponents')} className="flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-aurora-red" aria-hidden="true" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Spacer to push price down */}
          <div className="flex-grow" />

          {/* Price - aligned at bottom */}
          <div className="pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-2xl font-bold ${isAuction ? 'text-aurora-purple' : 'text-polar-night'}`}>
                {isAuction && !hasBids && (
                  <span className="text-sm font-normal text-text-muted">{t('auction.startingAt')}{'\u00A0'}</span>
                )}
                {formatPrice(displayPrice)}
              </span>
              {isAuction && hasBids && (
                <span className="text-sm text-text-muted">
                  ({listing.auction_bid_count} {listing.auction_bid_count === 1 ? t('bid') : t('bids')})
                </span>
              )}
              {!isAuction && listing.previous_price && listing.previous_price > listing.price && (
                <span className="text-base text-text-muted line-through">
                  {formatPrice(listing.previous_price)}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Section: Location + Shipping + Buy Now Button */}
          <div className="pt-2 space-y-2 border-t border-border-subtle">
            {/* Location + Shipping - answers "Can I get this?" and "How?" */}
            {/* Contact Seller listings don't show shipping options - arranged directly */}
            {showSeller && listing.seller?.country && (
              <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                {getCountryFlag(listing.seller.country) && (
                  <span
                    className={getCountryFlag(listing.seller.country)}
                    role="img"
                    aria-label={getCountryName(listing.seller.country)}
                  />
                )}
                <span>{getCountryName(listing.seller.country)}</span>
                {/* Only show shipping options for instant_buy listings */}
                {!isContactSellerListing(listing) && (
                  <>
                    <span className="text-text-muted">•</span>
                    {listing.shipping_parcel_locker ? (
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('card.parcelLocker')}
                      </span>
                    ) : listing.shipping_local_pickup ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {t('card.pickupOnly')}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </Card>
    </Link>

    {/* Condition Info Modal */}
    <ConditionInfoModal
      isOpen={showConditionInfo}
      onClose={() => setShowConditionInfo(false)}
      condition={listing.condition}
    />
    </>
  );
}
