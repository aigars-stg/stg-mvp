'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Badge } from '@second-turn/design-system';
import { Package, MapPin, AlertCircle, ChevronLeft, ChevronRight, Users, Baby, Clock, Heart, Puzzle, BookOpen } from 'lucide-react';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ConditionInfoModal } from '@/components/common/ConditionInfoModal';
import { useTranslations } from 'next-intl';

interface ListingCardProps {
  listing: ListingWithSeller;
  showSeller?: boolean;
  isOwnListing?: boolean; // Whether this listing belongs to the current user
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

export function ListingCard({ listing, showSeller = false, isOwnListing = false }: ListingCardProps) {
  const t = useTranslations('Listings');
  const router = useRouter();
  const { user } = useAuth();

  // Collect all available images (BGG main image + user photos only)
  const allImages = [
    ...(listing.game?.image ? [listing.game.image] : []),
    ...listing.photo_urls,
  ].filter(Boolean);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showConditionInfo, setShowConditionInfo] = useState(false);
  const hasMultipleImages = allImages.length > 1;

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Save listing functionality - uses context to avoid per-card API calls
  const { isSaved: checkIsSaved, toggleSave: contextToggleSave } = useSavedListingsContext();
  const isSaved = checkIsSaved(listing.id);
  const [saveLoading, setSaveLoading] = useState(false);

  // Get condition badge variant
  const getConditionVariant = (): 'likeNew' | 'veryGood' | 'good' | 'acceptable' => {
    switch (listing.condition) {
      case 'likeNew':
        return 'likeNew';
      case 'veryGood':
        return 'veryGood';
      case 'good':
        return 'good';
      case 'acceptable':
        return 'acceptable';
      default:
        return 'acceptable';
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      e.preventDefault();
      e.stopPropagation();
      setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/signin?redirect=/game/${listing.bgg_game_id}`);
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

  const displayImage = allImages[currentImageIndex];

  return (
    <>
    <Link href={`/game/${listing.bgg_game_id}`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <div
          className="relative h-48 sm:h-56 lg:h-64 bg-polar-night/5 flex items-center justify-center group overflow-hidden"
          onTouchStart={hasMultipleImages ? onTouchStart : undefined}
          onTouchMove={hasMultipleImages ? onTouchMove : undefined}
          onTouchEnd={hasMultipleImages ? onTouchEnd : undefined}
        >
          {displayImage ? (
            <Image
              src={displayImage}
              alt={listing.game_name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={displayImage.startsWith('http')}
            />
          ) : (
            <Package className="w-16 h-16 text-text-muted" />
          )}

          {/* Save Button - only show for non-own listings */}
          {!isOwnListing && (
            <button
              onClick={handleSaveToggle}
              disabled={saveLoading}
              className="absolute top-3 left-3 w-8 h-8 rounded-md bg-snow-white/90 hover:bg-snow-white flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              aria-label={isSaved ? t('card.unsaveAria') : t('card.saveAria')}
            >
              <Heart
                className={`w-4 h-4 transition-all ${
                  isSaved
                    ? 'fill-aurora-red text-aurora-red'
                    : 'text-text-secondary'
                }`}
              />
            </button>
          )}

          {/* Navigation Arrows - show on hover if multiple images */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label={t('card.prevImageAria')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label={t('card.nextImageAria')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Image Indicators */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-snow-white w-6'
                      : 'bg-snow-white/50 hover:bg-snow-white/75'
                  }`}
                  aria-label={t('card.viewImageAria', { number: index + 1 })}
                />
              ))}
            </div>
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
            <Badge variant={getConditionVariant()} size="sm">
              {t(`conditions.${listing.condition}`)}
            </Badge>
          </button>

          {/* Image counter - bottom right */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium">
              {currentImageIndex + 1}/{allImages.length}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Variable height content */}
          <div className="space-y-2">
            {/* Game Name - with expansion label if this IS an expansion */}
            <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem]">
              {listing.game_name}
              {listing.game?.is_expansion && (
                <span className="text-text-muted font-normal text-sm"> ({t('card.expansion')})</span>
              )}
            </h3>

            {/* Game Metadata - tighter spacing */}
            {(listing.game?.player_count || listing.game?.min_age || listing.game?.playing_time || (listing.included_expansions && listing.included_expansions.length > 0)) && (
              <div className="flex flex-wrap gap-2 text-xs text-text-secondary items-center">
                {listing.game?.player_count && (
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3.5 h-3.5" />
                    {listing.game.player_count}
                  </span>
                )}
                {listing.game?.min_age && (
                  <span className="flex items-center gap-0.5">
                    <Baby className="w-3.5 h-3.5" />
                    {listing.game.min_age}+
                  </span>
                )}
                {listing.game?.playing_time && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    {listing.game.playing_time}
                  </span>
                )}
                {listing.included_expansions && listing.included_expansions.length > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-aurora-green"
                    title={listing.included_expansions.map(e => e.name).join(', ')}
                  >
                    <Puzzle className="w-3.5 h-3.5" />
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
                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    {formatLanguages(listing.language)}
                  </span>
                )}
                {!listing.all_components_present && (
                  <span title={t('card.missingComponents')} className="flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-aurora-red" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Spacer to push price down */}
          <div className="flex-grow" />

          {/* Price - aligned at bottom */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-2xl font-bold text-polar-night">
              €{listing.price.toFixed(2)}
            </span>
            {listing.previous_price && listing.previous_price > listing.price && (
              <span className="text-base text-text-muted line-through">
                €{listing.previous_price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Bottom Section: Location + Shipping + Buy Now Button */}
          <div className="pt-2 space-y-2 border-t border-border-subtle">
            {/* Location + Shipping - answers "Can I get this?" and "How?" */}
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
                <span className="text-text-muted">•</span>
                {listing.shipping_parcel_locker ? (
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {t('card.parcelLocker')}
                  </span>
                ) : listing.shipping_local_pickup ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {t('card.pickupOnly')}
                  </span>
                ) : null}
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
