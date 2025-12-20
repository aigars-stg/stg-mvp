'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Badge, Button } from '@second-turn/design-system';
import { Package, MapPin, AlertCircle, ChevronLeft, ChevronRight, Users, Baby, Clock, Heart, Puzzle } from 'lucide-react';
import { SellerTrustCompact } from '@/components/seller/SellerTrustBadge';
import { getSellerBadgeTier } from '@/lib/types/seller';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

interface ListingCardProps {
  listing: ListingWithSeller;
  showSeller?: boolean;
  isOwnListing?: boolean; // Whether this listing belongs to the current user
}

export function ListingCard({ listing, showSeller = false, isOwnListing = false }: ListingCardProps) {
  const conditionLabel = getConditionLabel(listing.condition);
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
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-snow-white/90 hover:bg-snow-white flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              aria-label={isSaved ? "Remove from saved" : "Save listing"}
            >
              <Heart
                className={`w-5 h-5 transition-all ${
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
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-polar-night/60 hover:bg-polar-night/80 backdrop-blur-sm flex items-center justify-center text-snow-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label="Next image"
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
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Image counter badge */}
          {allImages.length > 1 && (
            <div className="absolute top-3 right-3 px-2 py-1 bg-polar-night/80 backdrop-blur-sm rounded-md text-xs text-snow-white font-medium">
              {currentImageIndex + 1}/{allImages.length}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Middle Content */}
          <div className="space-y-3 pb-1">
            {/* Game Name with Year */}
            <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem]">
              {listing.game_name}
              {listing.edition_year && (
                <span className="text-text-muted font-normal"> ({listing.edition_year})</span>
              )}
            </h3>

            {/* Game Metadata */}
            {(listing.game?.player_count || listing.game?.min_age || listing.game?.playing_time || listing.game?.is_expansion || (listing.included_expansions && listing.included_expansions.length > 0)) && (
              <div className="flex flex-wrap gap-3 text-xs text-text-secondary items-center">
                {listing.game?.player_count && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {listing.game.player_count}
                  </span>
                )}
                {listing.game?.min_age && (
                  <span className="flex items-center gap-1">
                    <Baby className="w-4 h-4" />
                    {listing.game.min_age}+
                  </span>
                )}
                {listing.game?.playing_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {listing.game.playing_time}
                  </span>
                )}
                {listing.game?.is_expansion && (
                  <Badge variant="warning" size="sm">
                    Expansion
                  </Badge>
                )}
                {listing.included_expansions && listing.included_expansions.length > 0 && (
                  <Badge
                    variant="success"
                    size="sm"
                    icon={<Puzzle className="w-3 h-3" />}
                    title={listing.included_expansions.map(e => e.name).join(', ')}
                  >
                    +{listing.included_expansions.length} expansion{listing.included_expansions.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}

            {/* Version/Publisher Info */}
            {(listing.language || listing.publisher) && (
              <p className="text-sm text-text-secondary line-clamp-2">
                {listing.language?.replace(/, /g, ' / ')}
                {listing.language && listing.publisher && ' • '}
                {listing.publisher?.replace(/, /g, ' / ')}
              </p>
            )}

            {/* Price & Condition */}
            <div className="space-y-1">
              {/* Price with previous price strikethrough */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-2xl font-bold text-polar-night">
                  €{listing.price.toFixed(2)}
                </div>
                {listing.previous_price && listing.previous_price > listing.price && (
                  <span className="text-base text-text-muted line-through">
                    €{listing.previous_price.toFixed(2)}
                  </span>
                )}
                <Badge variant={getConditionVariant()}>
                  {conditionLabel}
                </Badge>
              </div>
              {/* Savings indicator */}
              {listing.previous_price && listing.previous_price > listing.price && (
                <div className="text-sm font-medium text-aurora-green">
                  Save €{(listing.previous_price - listing.price).toFixed(2)} ({Math.round((1 - listing.price / listing.previous_price) * 100)}% off)
                </div>
              )}
            </div>

            {/* Components Warning */}
            {!listing.all_components_present && (
              <div className="flex items-center gap-1.5 text-xs text-aurora-red">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Missing components</span>
              </div>
            )}

            {/* Shipping Options */}
            <div className="flex flex-wrap gap-1.5 text-xs text-text-secondary">
              {listing.shipping_local_pickup && (
                <Badge variant="default" size="sm" icon={<MapPin className="w-3 h-3" />}>
                  Local Pickup
                </Badge>
              )}
              {listing.shipping_parcel_locker && (
                <Badge variant="default" size="sm" icon={<Package className="w-3 h-3" />}>
                  Parcel Locker
                </Badge>
              )}
            </div>
          </div>

          {/* Bottom Section: Seller Info + Buy Now Button */}
          <div className="mt-auto pt-3 space-y-3 border-t border-border-subtle">
            {/* Seller Info with Trust Signals */}
            {showSeller && listing.seller && (
              <Link
                href={`/sellers/${listing.seller.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block space-y-1.5 hover:bg-bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  {listing.seller.avatar_url ? (
                    <Image
                      src={listing.seller.avatar_url}
                      alt={listing.seller.full_name}
                      width={24}
                      height={24}
                      className="rounded-sm object-cover border border-border-subtle"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-sm bg-frost-ice/20 flex items-center justify-center text-xs font-semibold text-frost-ice">
                      {listing.seller.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-text-secondary line-clamp-1 hover:text-frost-ice transition-colors">
                    {listing.seller.full_name}
                    {listing.seller.country && getCountryFlag(listing.seller.country) && (
                      <span
                        className={`${getCountryFlag(listing.seller.country)} ml-1`}
                        role="img"
                        aria-label={`Country: ${getCountryName(listing.seller.country)}`}
                        title={getCountryName(listing.seller.country)}
                      />
                    )}
                  </span>
                </div>
                {/* Trust Signals */}
                <SellerTrustCompact
                  totalSales={listing.seller.total_completed_sales ?? 0}
                  averageRating={listing.seller.average_rating ?? 0}
                  totalReviews={listing.seller.total_reviews ?? 0}
                  badgeTier={getSellerBadgeTier(
                    listing.seller.total_completed_sales ?? 0,
                    listing.seller.average_rating ?? 0
                  )}
                />
              </Link>
            )}

            {/* Action Button - Only show Buy Now for others' listings */}
            {!isOwnListing && (
              <Button variant="accent" fullWidth>
                Buy Now
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
