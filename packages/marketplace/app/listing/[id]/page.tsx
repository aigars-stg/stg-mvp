'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Badge } from '@second-turn/design-system';
import { Package, MapPin, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Users, Baby, Clock, Heart, Share2, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import Link from 'next/link';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { ListingCard } from '@/components/listing/ListingCard';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;

  const [listing, setListing] = useState<ListingWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    async function fetchListing() {
      try {
        setLoading(true);
        const response = await fetch(`/api/listings/${listingId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Listing not found');
          } else {
            setError('Failed to load listing');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setListing(data.listing);
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    }

    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-polar-night mb-2">
            {error || 'Listing not found'}
          </h2>
          <p className="text-text-secondary mb-6">
            This listing may have been removed or doesn't exist.
          </p>
          <Link href="/browse">
            <Button variant="primary">Browse Listings</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const conditionLabel = getConditionLabel(listing.condition);

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

  return (
    <div className="min-h-screen bg-bg">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Photo Gallery */}
          <div>
            {(() => {
              const allImages = [
                ...(listing.game?.image ? [listing.game.image] : []),
                ...listing.photo_urls,
              ].filter(Boolean);

              if (allImages.length === 0) {
                return (
                  <Card padding="none" className="overflow-hidden">
                    <div className="relative bg-polar-night/5 flex items-center justify-center min-h-[500px]">
                      <Package className="w-24 h-24 text-text-muted" />
                    </div>
                  </Card>
                );
              }

              const handleThumbnailClick = (index: number) => {
                setCurrentImageIndex(index);
              };

              const onTouchStart = (e: React.TouchEvent) => {
                setTouchEnd(null);
                setTouchStart(e.targetTouches[0].clientX);
              };

              const onTouchMove = (e: React.TouchEvent) => {
                setTouchEnd(e.targetTouches[0].clientX);
              };

              const onTouchEnd = () => {
                if (!touchStart || !touchEnd) return;

                const distance = touchStart - touchEnd;
                const isLeftSwipe = distance > minSwipeDistance;
                const isRightSwipe = distance < -minSwipeDistance;

                if (isLeftSwipe) {
                  setCurrentImageIndex((currentImageIndex + 1) % allImages.length);
                } else if (isRightSwipe) {
                  setCurrentImageIndex((currentImageIndex - 1 + allImages.length) % allImages.length);
                }
              };

              return (
                <>
                  <div className="flex gap-3">
                    {/* Vertical Thumbnail Strip (Desktop Only) */}
                    {allImages.length > 1 && (
                      <div className="hidden lg:flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-frost-ice/30 scrollbar-track-transparent">
                        {allImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => handleThumbnailClick(index)}
                            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all hover:border-frost-ice ${
                              index === currentImageIndex
                                ? 'border-frost-ice ring-2 ring-frost-ice/30'
                                : 'border-border-subtle'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${listing.game_name} thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Main Image Card */}
                    <div className="flex-1">
                      <Card padding="none" className="overflow-hidden">
                        <div
                          className="relative bg-polar-night/5 flex items-center justify-center group cursor-pointer min-h-[500px]"
                          onTouchStart={allImages.length > 1 ? onTouchStart : undefined}
                          onTouchMove={allImages.length > 1 ? onTouchMove : undefined}
                          onTouchEnd={allImages.length > 1 ? onTouchEnd : undefined}
                          onClick={() => setIsLightboxOpen(true)}
                        >
                          <img
                            src={allImages[currentImageIndex]}
                            alt={`${listing.game_name} - Image ${currentImageIndex + 1}`}
                            className="max-w-full max-h-full object-contain p-8"
                          />

                          {/* Image Counter Badge */}
                          {allImages.length > 1 && (
                            <div className="absolute top-4 right-4 bg-polar-night/80 text-snow-white px-3 py-1 rounded-full text-sm font-medium">
                              {currentImageIndex + 1} / {allImages.length}
                            </div>
                          )}

                          {/* Click Hint */}
                          <div className="absolute top-4 left-4 bg-polar-night/80 text-snow-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Click for fullscreen
                          </div>

                          {/* Navigation Arrows */}
                          {allImages.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex((currentImageIndex - 1 + allImages.length) % allImages.length);
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-snow-white/90 hover:bg-snow-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="w-6 h-6 text-polar-night" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex((currentImageIndex + 1) % allImages.length);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-snow-white/90 hover:bg-snow-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Next image"
                              >
                                <ChevronRight className="w-6 h-6 text-polar-night" />
                              </button>
                            </>
                          )}

                          {/* Dot Indicators */}
                          {allImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {allImages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleThumbnailClick(index);
                                  }}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentImageIndex
                                      ? 'bg-frost-ice w-6'
                                      : 'bg-snow-white/60 hover:bg-snow-white'
                                  }`}
                                  aria-label={`Go to image ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Horizontal Thumbnail Strip (Mobile Only) */}
                      {allImages.length > 1 && (
                        <div className="lg:hidden mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-frost-ice/30 scrollbar-track-transparent">
                          {allImages.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => handleThumbnailClick(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:border-frost-ice ${
                                index === currentImageIndex
                                  ? 'border-frost-ice ring-2 ring-frost-ice/30'
                                  : 'border-border-subtle'
                              }`}
                            >
                              <img
                                src={image}
                                alt={`${listing.game_name} thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Lightbox */}
                  <ImageLightbox
                    images={allImages}
                    initialIndex={currentImageIndex}
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                    gameName={listing.game_name}
                  />
                </>
              );
            })()}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-3xl font-bold text-polar-night mb-2">
                {listing.game_name}
                {listing.edition_year && (
                  <span className="text-text-muted font-normal"> ({listing.edition_year})</span>
                )}
              </h1>

              {/* Game Metadata */}
              {(listing.game?.player_count || listing.game?.min_age || listing.game?.playing_time || listing.game?.is_expansion || listing.bgg_game_id) && (
                <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-4 items-center">
                  {listing.game?.player_count && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {listing.game.player_count}
                    </span>
                  )}
                  {listing.game?.min_age && (
                    <span className="flex items-center gap-1.5">
                      <Baby className="w-4 h-4" />
                      {listing.game.min_age}+
                    </span>
                  )}
                  {listing.game?.playing_time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {listing.game.playing_time}
                    </span>
                  )}
                  {listing.game?.is_expansion && (
                    <Badge variant="warning" size="sm">
                      Expansion
                    </Badge>
                  )}
                  {listing.bgg_game_id && (
                    <a
                      href={`https://boardgamegeek.com/boardgame/${listing.bgg_game_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-frost-ice hover:text-aurora-blue transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>BGG</span>
                    </a>
                  )}
                </div>
              )}

              {/* Version/Publisher Info */}
              {(listing.language || listing.publisher) && (
                <p className="text-sm text-text-secondary">
                  {listing.language?.replace(/, /g, ' / ')}
                  {listing.language && listing.publisher && ' • '}
                  {listing.publisher?.replace(/, /g, ' / ')}
                </p>
              )}

              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-polar-night">
                  €{listing.price.toFixed(2)}
                </span>
                <Badge variant={getConditionVariant()} size="lg">
                  {conditionLabel}
                </Badge>
              </div>
            </div>

            {/* Condition Details */}
            <Card padding="md">
              <h3 className="font-semibold text-polar-night mb-3">Condition Details</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  {listing.all_components_present ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
                      <span className="text-polar-night">All components present</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
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
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-text-secondary leading-relaxed">
                      {listing.condition_notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Shipping Options */}
            <Card padding="md">
              <h3 className="font-semibold text-polar-night mb-3">Shipping & Pickup</h3>

              <div className="space-y-2">
                {listing.shipping_local_pickup && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-5 h-5 text-frost-ice" />
                    <span className="text-polar-night">Local pickup available</span>
                  </div>
                )}
                {listing.shipping_parcel_locker && (
                  <div className="flex items-center gap-3 text-sm">
                    <Package className="w-5 h-5 text-frost-ice" />
                    <span className="text-polar-night">Parcel locker delivery</span>
                  </div>
                )}

                {listing.shipping_notes && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {listing.shipping_notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Buy Now Button */}
            <Button variant="accent" size="lg" fullWidth>
              Buy Now
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" fullWidth>
                <Heart className="w-5 h-5 mr-2" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>

            {/* Seller Info */}
            <Card padding="md">
              <h3 className="font-semibold text-polar-night mb-3">Seller</h3>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-frost-ice/20 flex items-center justify-center text-lg font-semibold text-frost-ice">
                  {listing.seller.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-polar-night">
                    {listing.seller.full_name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Member since {new Date(listing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>

              <Button variant="secondary" size="md" fullWidth>
                Contact Seller
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
