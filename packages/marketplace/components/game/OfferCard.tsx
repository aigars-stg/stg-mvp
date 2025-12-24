'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button } from '@second-turn/design-system';
import {
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Heart,
  Calendar,
  Puzzle,
  BookOpen,
  Globe,
  Building2,
} from 'lucide-react';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { SellerTrustCompact } from '@/components/seller/SellerTrustBadge';
import { getSellerBadgeTier } from '@/lib/types/seller';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';
import { ConditionInfoModal } from '@/components/common/ConditionInfoModal';

interface OfferCardProps {
  listing: ListingWithSeller;
  onAddToCart?: (listingId: string) => Promise<void>;
  isAddingToCart?: boolean;
}

export function OfferCard({ listing, onAddToCart, isAddingToCart }: OfferCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showConditionInfo, setShowConditionInfo] = useState(false);

  // Saved listing - uses context to avoid per-card API calls
  const { isSaved: checkIsSaved, toggleSave: contextToggleSave } = useSavedListingsContext();
  const isSaved = checkIsSaved(listing.id);
  const [saveLoading, setSaveLoading] = useState(false);

  const isOwnListing = user?.id === listing.seller_id;
  const loading = isAddingToCart || localLoading;

  // All images for lightbox (BGG images + user photos + expansion images)
  const allImages = [
    ...(listing.game?.image ? [listing.game.image] : []),
    ...listing.photo_urls,
    ...(listing.included_expansions?.flatMap(e => e.image ? [e.image] : []) ?? []),
  ].filter(Boolean);

  // User-uploaded photos only (for Photos section display)
  const userPhotos = listing.photo_urls.filter(Boolean);

  // Index where user photos start in allImages (after BGG image if present)
  const userPhotosStartIndex = listing.game?.image ? 1 : 0;

  // Index where expansion images start in allImages
  const expansionImageStartIndex = userPhotosStartIndex + userPhotos.length;

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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/signin?redirect=/game/${listing.bgg_game_id}`);
      return;
    }

    if (onAddToCart) {
      await onAddToCart(listing.id);
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

  // Get BGG image for the version (same logic as ListingCard - BGG image first, then user photos)
  const displayImage = listing.game?.image || listing.photo_urls?.[0];

  // Format posted date
  const postedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div className={`bg-snow-white border-2 rounded-xl transition-all ${isExpanded ? 'border-frost-ice' : 'border-border hover:border-frost-ice/50'}`}>
        {/* Collapsed View */}
        <div className="p-3 sm:p-4">
          {/* Desktop: 3-column grid layout */}
          <div className="hidden sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_auto] gap-4">
            {/* LEFT COLUMN: Photo carousel */}
            <div className="flex flex-col gap-2">
              {/* Main image */}
              <button
                onClick={() => {
                  if (allImages.length > 0) {
                    setIsLightboxOpen(true);
                  }
                }}
                className="cursor-pointer group"
              >
                <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-frost-ice/50 transition-all">
                  {allImages[currentImageIndex] ? (
                    <img
                      src={allImages[currentImageIndex]}
                      alt={listing.game_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : displayImage ? (
                    <img
                      src={displayImage}
                      alt={listing.game_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Carousel dots - only show if multiple images */}
              {allImages.length > 1 && (
                <div className="flex justify-center gap-1.5">
                  {allImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-frost-ice scale-110'
                          : 'bg-border hover:bg-text-muted'
                      }`}
                      aria-label={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* MIDDLE COLUMN: Game info, condition, version, seller */}
            <div className="flex flex-col min-w-0">
              {/* Game Name with Edition Year */}
              <h3 className="text-base font-semibold text-polar-night mb-1">
                {listing.game_name}
                {listing.edition_year && (
                  <span className="font-normal text-text-muted"> ({listing.edition_year})</span>
                )}
              </h3>

              {/* Condition Badges - product description */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConditionInfo(true);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label={`Learn about ${getConditionLabel(listing.condition)} condition`}
                >
                  <Badge variant={getConditionVariant()} size="sm">
                    {getConditionLabel(listing.condition)}
                  </Badge>
                </button>
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
                {!listing.all_components_present && (
                  <span className="flex items-center gap-1 text-xs text-aurora-red">
                    <AlertCircle className="w-3 h-3" />
                    Missing parts
                  </span>
                )}
              </div>

              {/* Version Info - separate lines with icons */}
              {(listing.version_name || listing.language || listing.publisher) && (
                <div className="text-sm text-text-secondary mb-2 space-y-0.5">
                  {listing.version_name && (
                    <p className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      {listing.version_name}
                    </p>
                  )}
                  {listing.language && (
                    <p className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      {listing.language.replace(/, /g, ' / ')}
                    </p>
                  )}
                  {listing.publisher && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      {listing.publisher.replace(/, /g, ' / ')}
                    </p>
                  )}
                </div>
              )}

              {/* Seller Info with Trust Signals */}
              <Link
                href={`/sellers/${listing.seller.id}`}
                className="flex items-center gap-2 hover:bg-bg-secondary/50 -ml-1 pl-1 pr-2 py-1 rounded-lg transition-colors mt-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Avatar */}
                {listing.seller.avatar_url ? (
                  <img
                    src={listing.seller.avatar_url}
                    alt={listing.seller.full_name}
                    className="w-9 h-9 rounded-md object-cover border border-border-subtle"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-frost-ice/20 flex items-center justify-center text-sm font-semibold text-frost-ice">
                    {listing.seller.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Name & Stats stacked */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-text-secondary hover:text-frost-ice transition-colors truncate">
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
                  <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                    <SellerTrustCompact
                      totalSales={listing.seller.total_completed_sales ?? 0}
                      averageRating={listing.seller.average_rating ?? 0}
                      totalReviews={listing.seller.total_reviews ?? 0}
                      badgeTier={getSellerBadgeTier(
                        listing.seller.total_completed_sales ?? 0,
                        listing.seller.average_rating ?? 0
                      )}
                    />
                    {listing.seller.member_since && (
                      <>
                        <span>•</span>
                        <span className="whitespace-nowrap">Seller since {new Date(listing.seller.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </div>

            {/* RIGHT COLUMN: Price, actions, condition badges */}
            <div className="flex flex-col items-end gap-2 min-w-[140px]">
              {/* Price */}
              <div className="text-right">
                <div className="text-2xl font-bold text-polar-night">
                  €{listing.price.toFixed(2)}
                </div>
                {listing.previous_price && listing.previous_price > listing.price && (
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-sm text-text-muted line-through">
                      €{listing.previous_price.toFixed(2)}
                    </span>
                    <span className="text-xs text-aurora-green font-medium">
                      Save {Math.round((1 - listing.price / listing.previous_price) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              {!isOwnListing && (
                <button
                  onClick={handleSaveToggle}
                  disabled={saveLoading}
                  className="p-1 rounded-md hover:bg-bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                  aria-label={isSaved ? "Remove from saved" : "Save listing"}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-aurora-red text-aurora-red' : 'text-text-muted hover:text-aurora-red'}`} />
                  <span className={isSaved ? 'text-aurora-red' : 'text-text-muted'}>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-1.5 w-full">
                {!isOwnListing && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleAddToCart}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add to Cart'
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full"
                >
                  {isExpanded ? 'Hide' : 'Details'}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>

              {/* Posted Date */}
              <span className="flex items-center gap-1 text-xs text-text-muted mt-auto">
                <Calendar className="w-3 h-3" />
                {postedDate}
              </span>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: Image + Price/Condition */}
            <div className="flex gap-3">
              {/* Image */}
              <button
                onClick={() => {
                  if (allImages.length > 0) {
                    setCurrentImageIndex(0);
                    setIsLightboxOpen(true);
                  }
                }}
                className="flex-shrink-0 cursor-pointer"
              >
                <div className="relative w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-frost-ice/50 transition-all">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={listing.game_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-text-muted" />
                  )}
                  {/* Photo count badge */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium">
                      {allImages.length} photos
                    </div>
                  )}
                </div>
              </button>

              {/* Price, Condition & Save */}
              <div className="flex-grow flex flex-col justify-center">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowConditionInfo(true);
                      }}
                      className="cursor-pointer hover:opacity-80 transition-opacity self-start"
                      aria-label={`Learn about ${getConditionLabel(listing.condition)} condition`}
                    >
                      <Badge variant={getConditionVariant()}>
                        {getConditionLabel(listing.condition)}
                      </Badge>
                    </button>
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
                    {!listing.all_components_present && (
                      <span className="flex items-center gap-1 text-xs text-aurora-red">
                        <AlertCircle className="w-3 h-3" />
                        Missing parts
                      </span>
                    )}
                  </div>
                  {/* Price & Save */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-xl font-bold text-polar-night">
                      €{listing.price.toFixed(2)}
                    </div>
                    {listing.previous_price && listing.previous_price > listing.price && (
                      <div className="text-sm text-text-muted line-through">
                        €{listing.previous_price.toFixed(2)}
                      </div>
                    )}
                    {/* Save Button */}
                    {!isOwnListing && (
                      <button
                        onClick={handleSaveToggle}
                        disabled={saveLoading}
                        className="mt-1 p-1 rounded-md hover:bg-bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1 text-xs"
                        aria-label={isSaved ? "Remove from saved" : "Save listing"}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-aurora-red text-aurora-red' : 'text-text-muted hover:text-aurora-red'}`} />
                        <span className={isSaved ? 'text-aurora-red' : 'text-text-muted'}>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Game Name with Edition Year */}
            <h3 className="text-sm font-semibold text-polar-night line-clamp-1">
              {listing.game_name}
              {listing.edition_year && (
                <span className="font-normal text-text-muted"> ({listing.edition_year})</span>
              )}
            </h3>

            {/* Version Info - separate lines with icons */}
            {(listing.version_name || listing.language || listing.publisher) && (
              <div className="text-sm text-text-secondary space-y-0.5">
                {listing.version_name && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    {listing.version_name}
                  </p>
                )}
                {listing.language && (
                  <p className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    {listing.language.replace(/, /g, ' / ')}
                  </p>
                )}
                {listing.publisher && (
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    {listing.publisher.replace(/, /g, ' / ')}
                  </p>
                )}
              </div>
            )}

            {/* Seller Info */}
            <Link
              href={`/sellers/${listing.seller.id}`}
              className="flex items-center gap-2 hover:bg-bg-secondary/50 -ml-1 pl-1 pr-2 py-1 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Avatar - spans both lines */}
              {listing.seller.avatar_url ? (
                <img
                  src={listing.seller.avatar_url}
                  alt={listing.seller.full_name}
                  className="w-9 h-9 rounded-md object-cover border border-border-subtle self-center"
                />
              ) : (
                <div className="w-9 h-9 rounded-md bg-frost-ice/20 flex items-center justify-center text-sm font-semibold text-frost-ice self-center">
                  {listing.seller.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Name & Stats stacked */}
              <div className="flex flex-col">
                <span className="text-sm text-text-secondary hover:text-frost-ice transition-colors">
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
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <SellerTrustCompact
                    totalSales={listing.seller.total_completed_sales ?? 0}
                    averageRating={listing.seller.average_rating ?? 0}
                    totalReviews={listing.seller.total_reviews ?? 0}
                    badgeTier={getSellerBadgeTier(
                      listing.seller.total_completed_sales ?? 0,
                      listing.seller.average_rating ?? 0
                    )}
                  />
                  {listing.seller.member_since && (
                    <>
                      <span>•</span>
                      <span>Seller since {new Date(listing.seller.member_since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>

            {/* Posted Date - Mobile */}
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Calendar className="w-3 h-3" />
              Posted {postedDate}
            </span>

            {/* Mobile Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Add to Cart - hide when expanded (sticky bar shows instead) */}
              {!isOwnListing && !isExpanded && (
                <Button
                  variant="accent"
                  onClick={handleAddToCart}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add to Cart'
                  )}
                </Button>
              )}
              {/* Details button */}
              <Button
                variant={isOwnListing ? 'secondary' : 'ghost'}
                onClick={() => setIsExpanded(!isExpanded)}
                fullWidth
              >
                {isExpanded ? 'Hide Details' : 'Details'}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="border-t border-border-subtle">
            {/* Condition Details - only show if there's something notable */}
            {(!listing.all_components_present || listing.condition_notes) && (
              <div className="p-3 sm:p-4 border-b border-border-subtle">
                <h4 className="text-sm font-medium text-polar-night mb-3">Condition Details</h4>
                <div className="space-y-2 text-sm">
                  {!listing.all_components_present && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-aurora-red font-medium">Missing components</p>
                        {listing.missing_components && (
                          <p className="text-text-secondary mt-1">{listing.missing_components}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {listing.condition_notes && (
                    <p className={`text-text-secondary leading-relaxed ${!listing.all_components_present ? 'pt-2 border-t border-border-subtle' : ''}`}>
                      {listing.condition_notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Included Expansions */}
            {listing.included_expansions && listing.included_expansions.length > 0 && (
              <div className="p-3 sm:p-4 border-b border-border-subtle">
                <h4 className="text-sm font-medium text-polar-night mb-3">
                  <span className="flex items-center gap-2">
                    <Puzzle className="w-4 h-4 text-aurora-green" />
                    Included Expansions ({listing.included_expansions.length})
                  </span>
                </h4>
                <div className="space-y-3">
                  {listing.included_expansions.map((expansion, index) => (
                    <div key={expansion.bgg_id} className="flex gap-3">
                      {/* Expansion Thumbnail */}
                      <button
                        onClick={() => {
                          if (expansion.image) {
                            // Find the index of this expansion's image in allImages
                            const imageIndex = expansionImageStartIndex +
                              listing.included_expansions
                                .slice(0, index)
                                .filter(e => e.image).length;
                            setCurrentImageIndex(imageIndex);
                            setIsLightboxOpen(true);
                          }
                        }}
                        className="flex-shrink-0"
                        disabled={!expansion.image}
                      >
                        <div className={`w-14 h-14 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden ${expansion.image ? 'hover:ring-2 hover:ring-frost-ice/50 cursor-pointer' : ''} transition-all`}>
                          {expansion.thumbnail || expansion.image ? (
                            <img
                              src={expansion.thumbnail || expansion.image || ''}
                              alt={expansion.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-text-muted" />
                          )}
                        </div>
                      </button>
                      {/* Expansion Info */}
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-polar-night line-clamp-1">
                          {expansion.name}
                          {expansion.year && (
                            <span className="text-text-muted font-normal"> ({expansion.year})</span>
                          )}
                        </p>
                        {(expansion.language || expansion.publisher) && (
                          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                            {expansion.language?.replace(/, /g, ' / ')}
                            {expansion.language && expansion.publisher && ' • '}
                            {expansion.publisher?.replace(/, /g, ' / ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: Shipping notes only (date now shown in collapsed view) */}
            {listing.shipping_notes && (
              <div className="p-3 sm:p-4">
                <span className="text-xs text-text-muted">📦 {listing.shipping_notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Mobile Sticky Add to Cart - only when expanded */}
        {isExpanded && !isOwnListing && (
          <div className="sm:hidden sticky bottom-0 left-0 right-0 bg-snow-white border-t border-border-subtle p-3 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex-shrink-0">
              <div className="text-lg font-bold text-polar-night">€{listing.price.toFixed(2)}</div>
              {listing.previous_price && listing.previous_price > listing.price && (
                <div className="text-xs text-aurora-green font-medium">
                  Save €{(listing.previous_price - listing.price).toFixed(2)}
                </div>
              )}
            </div>
            <Button
              variant="accent"
              onClick={handleAddToCart}
              disabled={loading}
              className="flex-grow"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Add to Cart'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={currentImageIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          gameName={listing.game_name}
        />
      )}

      {/* Condition Info Modal */}
      <ConditionInfoModal
        isOpen={showConditionInfo}
        onClose={() => setShowConditionInfo(false)}
        condition={listing.condition}
      />
    </>
  );
}
