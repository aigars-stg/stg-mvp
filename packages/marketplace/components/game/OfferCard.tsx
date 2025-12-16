'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button } from '@second-turn/design-system';
import {
  Package,
  MapPin,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  Heart,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { SellerTrustCompact } from '@/components/seller/SellerTrustBadge';
import { getSellerBadgeTier } from '@/lib/types/seller';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';

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
  const [contactingSellerLoading, setContactingSellerLoading] = useState(false);

  // Saved listing - uses context to avoid per-card API calls
  const { isSaved: checkIsSaved, toggleSave: contextToggleSave } = useSavedListingsContext();
  const isSaved = checkIsSaved(listing.id);
  const [saveLoading, setSaveLoading] = useState(false);

  const isOwnListing = user?.id === listing.seller_id;
  const loading = isAddingToCart || localLoading;

  // Get all images for gallery
  const allImages = [
    ...(listing.game?.image ? [listing.game.image] : []),
    ...listing.photo_urls,
  ].filter(Boolean);

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

  const handleContactSeller = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/signin?redirect=/game/${listing.bgg_game_id}`);
      return;
    }

    if (listing.seller_id === user.id) return;

    try {
      setContactingSellerLoading(true);
      const response = await fetch('/api/messages/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          seller_id: listing.seller_id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate conversation');
      }

      const data = await response.json();
      router.push(`/messages/${data.conversation_id}`);
    } catch (error) {
      console.error('Failed to contact seller:', error);
    } finally {
      setContactingSellerLoading(false);
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
        <div className="p-4">
          <div className="flex gap-4">
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
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-frost-ice/50 transition-all">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={listing.game_name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Package className="w-8 h-8 text-text-muted" />
                )}
              </div>
            </button>

            {/* Content */}
            <div className="flex-grow min-w-0">
              {/* Top Row: Condition & Price */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getConditionVariant()}>
                    {getConditionLabel(listing.condition)}
                  </Badge>
                  {!listing.all_components_present && (
                    <span className="flex items-center gap-1 text-xs text-aurora-red">
                      <AlertCircle className="w-3 h-3" />
                      Missing parts
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-polar-night">
                    €{listing.price.toFixed(2)}
                  </div>
                  {listing.previous_price && listing.previous_price > listing.price && (
                    <div className="text-sm text-text-muted line-through">
                      €{listing.previous_price.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Version Info */}
              {(listing.version_name || listing.edition_year || listing.language || listing.publisher) && (
                <p className="text-sm text-text-secondary mb-2 line-clamp-1">
                  {listing.version_name}
                  {listing.version_name && listing.edition_year && ' '}
                  {listing.edition_year && `(${listing.edition_year})`}
                  {(listing.version_name || listing.edition_year) && (listing.language || listing.publisher) && ' • '}
                  {listing.language?.replace(/, /g, ' / ')}
                  {listing.language && listing.publisher && ' • '}
                  {listing.publisher?.replace(/, /g, ' / ')}
                </p>
              )}

              {/* Bottom Row: Seller & Shipping */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Seller Info with Trust Signals */}
                <Link
                  href={`/sellers/${listing.seller.id}`}
                  className="flex flex-col gap-1 hover:bg-bg-secondary/50 -ml-1 pl-1 pr-2 py-1 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    {listing.seller.avatar_url ? (
                      <img
                        src={listing.seller.avatar_url}
                        alt={listing.seller.full_name}
                        className="w-6 h-6 rounded-sm object-cover border border-border-subtle"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-sm bg-frost-ice/20 flex items-center justify-center text-xs font-semibold text-frost-ice">
                        {listing.seller.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
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

                {/* Shipping Options */}
                <div className="flex gap-1.5">
                  {listing.shipping_local_pickup && (
                    <Badge variant="default" size="sm" icon={<MapPin className="w-3 h-3" />}>
                      Pickup
                    </Badge>
                  )}
                  {listing.shipping_parcel_locker && (
                    <Badge variant="default" size="sm" icon={<Truck className="w-3 h-3" />}>
                      Shipping
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 flex-shrink-0 justify-center">
              {!isOwnListing ? (
                <>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleAddToCart}
                    disabled={loading}
                    className="whitespace-nowrap"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add to Cart'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="whitespace-nowrap"
                  >
                    {isExpanded ? 'Less' : 'Details'}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="whitespace-nowrap"
                >
                  {isExpanded ? 'Less' : 'Details'}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-1" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="border-t border-border-subtle">
            {/* Photo Gallery */}
            {allImages.length > 1 && (
              <div className="p-4 border-b border-border-subtle">
                <h4 className="text-sm font-medium text-polar-night mb-3">Photos</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setIsLightboxOpen(true);
                      }}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all hover:border-frost-ice ${
                        index === currentImageIndex
                          ? 'border-frost-ice ring-2 ring-frost-ice/30'
                          : 'border-border-subtle'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${listing.game_name} photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Condition Details */}
            <div className="p-4 border-b border-border-subtle">
              <h4 className="text-sm font-medium text-polar-night mb-3">Condition Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  {listing.all_components_present ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
                      <span className="text-polar-night">All components present</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-aurora-red font-medium">Missing components</p>
                        {listing.missing_components && (
                          <p className="text-text-secondary mt-1">{listing.missing_components}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {listing.condition_notes && (
                  <p className="text-text-secondary leading-relaxed pt-2 border-t border-border-subtle">
                    {listing.condition_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Shipping Details */}
            <div className="p-4 border-b border-border-subtle">
              <h4 className="text-sm font-medium text-polar-night mb-3">Shipping & Pickup</h4>
              <div className="space-y-2">
                {listing.shipping_local_pickup && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-frost-ice" />
                    <span className="text-polar-night">Local pickup available</span>
                  </div>
                )}
                {listing.shipping_parcel_locker && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-frost-ice" />
                    <span className="text-polar-night">Parcel locker / Courier delivery</span>
                  </div>
                )}
                {listing.shipping_notes && (
                  <p className="text-sm text-text-secondary leading-relaxed pt-2 border-t border-border-subtle">
                    {listing.shipping_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Listing Information */}
            <div className="p-4 border-b border-border-subtle">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Calendar className="w-3 h-3" />
                <span>Posted {postedDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex flex-wrap gap-2">
              {!isOwnListing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleContactSeller}
                  disabled={contactingSellerLoading}
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {contactingSellerLoading ? 'Opening...' : 'Contact Seller'}
                </Button>
              )}
              <Button
                variant={isSaved ? 'accent' : 'ghost'}
                size="sm"
                onClick={handleSaveToggle}
                disabled={saveLoading}
              >
                <Heart className={`w-4 h-4 mr-1.5 ${isSaved ? 'fill-current' : ''}`} />
                {saveLoading ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
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
    </>
  );
}
