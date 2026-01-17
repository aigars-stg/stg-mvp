'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Badge, Button } from '@second-turn/design-system';
import { Package, AlertCircle, AlertTriangle, RefreshCw as Loader2, Heart, Calendar, PuzzlePiece as Puzzle, BookOpen, Globe, Building as Building2, InfoCircle as Info, LinkExternal as ExternalLink, Chat as MessageSquare, Tag as Gavel } from 'griddy-icons';
import { type TerminalCountry } from '@/lib/unisend/types';
import { useDeliveredPricing } from '@/lib/hooks/useDeliveredPricing';
import { PriceBreakdown } from '@/components/common/PriceBreakdown';
import type { ListingWithSeller } from '@/lib/types/listing';
import { isAuctionListing, isContactSellerListing } from '@/lib/types/listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserInfoCard } from '@/components/user';
import { getSellerBadgeTier } from '@/lib/types/seller';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { useSavedListingsContext } from '@/lib/contexts/SavedListingsContext';
import { ConditionInfoModal } from '@/components/common/ConditionInfoModal';
import { ReservationTimer } from '@/components/checkout/ReservationTimer';
import { CollapsibleDetails } from '@/components/game/CollapsibleDetails';
import { ListingQuestionsDrawer } from '@/components/game/ListingQuestionsDrawer';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { DotCarousel } from '@/components/common/ImageCarousel';
import { AuctionBidPanel } from '@/components/auction/AuctionBidPanel';
import { useTranslations, useLocale } from 'next-intl';

interface OfferCardProps {
  listing: ListingWithSeller;
  onAddToCart?: (listingId: string) => Promise<void>;
  isAddingToCart?: boolean;
  onSaveChange?: (listingId: string, saved: boolean) => void;
  /** Buyer's country for calculating accurate shipping estimate */
  buyerCountry?: TerminalCountry;
}

export function OfferCard({ listing, onAddToCart, isAddingToCart, onSaveChange, buyerCountry }: OfferCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('OfferCard');
  const tListings = useTranslations('Listings');
  const [localLoading, setLocalLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showConditionInfo, setShowConditionInfo] = useState(false);

  // Collapsible sections state (collapsed by default, persisted to localStorage)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('offercard-collapse-prefs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Question count for message badge
  const [questionCount, setQuestionCount] = useState(0);
  const [isQADrawerOpen, setIsQADrawerOpen] = useState(false);

  // Persist collapse preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('offercard-collapse-prefs', JSON.stringify([...expandedSections]));
    }
  }, [expandedSections]);

  // Fetch question count on mount (lightweight endpoint)
  useEffect(() => {
    fetch(`/api/listings/${listing.id}/questions?count_only=true`)
      .then(res => res.ok ? res.json() : { count: 0 })
      .then(data => setQuestionCount(data.count ?? 0))
      .catch(() => setQuestionCount(0));
  }, [listing.id]);

  // Toggle a collapsible section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Saved listing - uses context to avoid per-card API calls
  const { isSaved: checkIsSaved, toggleSave: contextToggleSave } = useSavedListingsContext();
  const isSaved = checkIsSaved(listing.id);
  const [saveLoading, setSaveLoading] = useState(false);

  // Reservation state - check if listing is currently reserved
  const [listingStatus, setListingStatus] = useState<'available' | 'reserved' | 'sold'>(
    listing.reserved_until && new Date(listing.reserved_until) > new Date()
      ? 'reserved'
      : 'available'
  );

  // Sync listingStatus when prop changes (e.g., after adding to cart)
  useEffect(() => {
    if (listing.reserved_until && new Date(listing.reserved_until) > new Date()) {
      setListingStatus('reserved');
    }
  }, [listing.reserved_until]);

  // Handle reservation timer expiry - refetch to check if sold or available
  const handleReservationExpire = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${listing.id}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'sold' || data.status === 'removed') {
          setListingStatus('sold');
        } else if (data.status === 'reserved') {
          // Still reserved by someone else, keep as reserved
          setListingStatus('reserved');
        } else {
          setListingStatus('available');
        }
      } else {
        // On error, assume available
        setListingStatus('available');
      }
    } catch {
      setListingStatus('available');
    }
  }, [listing.id]);

  const isOwnListing = user?.id === listing.seller_id;
  const loading = isAddingToCart || localLoading;

  // Calculate total delivered price (item + shipping + service fee)
  const deliveredPricing = useDeliveredPricing({
    listingType: listing.listing_type,
    transactionMethod: listing.transaction_method,
    pricingFormat: listing.pricing_format,
    price: listing.price,
    sellerCountry: listing.seller.country,
    buyerCountry,
  });

  // All images for main lightbox (BGG image + user photos only)
  // Expansion images are shown separately in their own thumbnails
  const allImages = [
    ...(listing.game?.image ? [listing.game.image] : []),
    ...listing.photo_urls,
  ].filter(Boolean);

  // User-uploaded photos only (for Photos section display)
  const userPhotos = listing.photo_urls.filter(Boolean);

  // Expansion images for separate lightbox access
  const expansionImages = (listing.included_expansions ?? [])
    .filter(e => e.image)
    .map(e => e.image as string);

  // All images including expansions (for when user clicks expansion thumbnail)
  const allImagesWithExpansions = [...allImages, ...expansionImages];

  // Get condition badge variant using shared utility
  const conditionVariant = getConditionBadgeVariant(listing.condition);

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
      const newSavedState = await contextToggleSave(listing.id);
      // Notify parent of save change (e.g., for my-listings page to remove unsaved items)
      onSaveChange?.(listing.id, newSavedState);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Contact Seller - initiate conversation and redirect to messages
  const [isInitiatingConversation, setIsInitiatingConversation] = useState(false);
  const handleContactSeller = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/signin?redirect=/game/${listing.bgg_game_id}`);
      return;
    }

    // Don't allow seller to message themselves
    if (isOwnListing) {
      return;
    }

    try {
      setIsInitiatingConversation(true);
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
        console.error('Failed to initiate conversation:', data.error);
        return;
      }

      const data = await response.json();
      router.push(`/messages/${data.conversation_id}`);
    } catch (error) {
      console.error('Failed to contact seller:', error);
    } finally {
      setIsInitiatingConversation(false);
    }
  };

  // Get BGG image for the version (same logic as ListingCard - BGG image first, then user photos)
  const displayImage = listing.game?.image || listing.photo_urls?.[0];

  // Format posted date with locale support
  const postedDate = new Date(listing.created_at).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
  const postedYear = new Date(listing.created_at).getFullYear();
  const currentYear = new Date().getFullYear();
  const dateString = postedYear === currentYear
    ? postedDate
    : `${postedDate}, ${postedYear}`;
  const formattedListedDate = t('listing.listed', { date: dateString });

  // BGG external link URL
  const bggGameUrl = `https://boardgamegeek.com/boardgame/${listing.bgg_game_id}`;

  // Format edition with year: "Latvian edition, 2024"
  const formattedEdition = listing.version_name
    ? listing.edition_year
      ? `${listing.version_name}, ${listing.edition_year}`
      : listing.version_name
    : listing.edition_year
      ? `${listing.edition_year} edition`
      : null;

  return (
    <>
      <div className="bg-snow-white border-2 rounded-xl overflow-hidden transition-all border-border hover:border-frost-ice/50">
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
                <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-frost-ice/50 transition-all relative">
                  {allImages[currentImageIndex] ? (
                    <Image
                      src={allImages[currentImageIndex]}
                      alt={listing.game_name}
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                      unoptimized
                    />
                  ) : displayImage ? (
                    <Image
                      src={displayImage}
                      alt={listing.game_name}
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                      unoptimized
                    />
                  ) : (
                    <Package className="w-10 h-10 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Carousel dots - only show if multiple images */}
              <DotCarousel
                images={allImages}
                alt={listing.game_name}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                ariaLabel={(n) => t('listing.viewImageAria', { number: n })}
              />
            </div>

            {/* MIDDLE COLUMN: Game info, condition, version */}
            <div className="flex flex-col min-w-0">
              {/* Game Name with BGG link */}
              <div className="flex items-start gap-2 mb-1">
                <h3 className="text-base font-semibold text-polar-night">
                  {listing.game_name}
                </h3>
                <a
                  href={bggGameUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                  title={t('listing.viewOnBGG')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Condition Badges - product description */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConditionInfo(true);
                  }}
                  className="cursor-pointer hover:ring-2 hover:ring-frost-ice/30 rounded-lg transition-all"
                  aria-label={t('listing.learnConditionAria', { condition: tListings(`conditions.${listing.condition}`) })}
                  title={t('listing.conditionGradesTooltip')}
                >
                  <Badge variant={conditionVariant} size="sm">
                    {tListings(`conditions.${listing.condition}`)}
                  </Badge>
                </button>
                {listing.game?.is_expansion && (
                  <Badge
                    variant="default"
                    size="sm"
                    icon={<Puzzle className="w-3 h-3" />}
                  >
                    {t('listing.expansion')}
                  </Badge>
                )}
                {!listing.all_components_present && (
                  <span className="flex items-center gap-1 text-xs text-aurora-red">
                    <AlertCircle className="w-3 h-3" />
                    {t('listing.missingParts')}
                  </span>
                )}
              </div>

              {/* Version Info - edition, language, publisher each on own line */}
              {(formattedEdition || listing.language || listing.publisher) && (
                <div className="text-sm text-text-secondary mb-2 space-y-0.5">
                  {formattedEdition && (
                    <p className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      {formattedEdition}
                    </p>
                  )}
                  {listing.language && (
                    <p className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span>{listing.language.replace(/, /g, ' / ')}</span>
                    </p>
                  )}
                  {listing.publisher && (
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span>{listing.publisher.replace(/, /g, ' / ')}</span>
                    </p>
                  )}
                </div>
              )}

              </div>

            {/* RIGHT COLUMN: Price */}
            <div className="flex flex-col items-end gap-2 min-w-[140px]">
              {/* Price */}
              <div className="text-right">
                {isAuctionListing(listing) ? (
                  <>
                    {/* Auction badge and current bid */}
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
                        {t('auction.badge')}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-secondary mb-0.5">
                      {listing.auction_current_bid ? t('auction.currentBid') : t('auction.startingPrice')}
                    </div>
                    <div className="text-2xl font-bold text-aurora-purple">
                      €{(listing.auction_current_bid || listing.auction_start_price || 0).toFixed(2)}
                    </div>
                    {listing.auction_bid_count !== undefined && listing.auction_bid_count > 0 && (
                      <div className="text-xs text-text-muted mt-0.5">
                        {listing.auction_bid_count} {listing.auction_bid_count === 1 ? t('auction.bid') : t('auction.bids')}
                      </div>
                    )}
                  </>
                ) : deliveredPricing.canCalculate ? (
                  <>
                    {/* Total delivered as primary price */}
                    <div className="text-2xl font-bold text-polar-night">
                      €{deliveredPricing.totalDelivered.toFixed(2)}
                      {deliveredPricing.isEstimate && <span className="text-base font-normal text-text-muted">*</span>}
                    </div>
                    {/* Previous price strikethrough */}
                    {listing.previous_price && listing.previous_price > listing.price && (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm text-text-muted line-through">
                          €{listing.previous_price.toFixed(2)}
                        </span>
                        <span className="text-xs text-aurora-green font-medium">
                          {t('price.save', { percentage: Math.round((1 - listing.price / listing.previous_price) * 100) })}
                        </span>
                      </div>
                    )}
                    {/* Always-visible breakdown */}
                    <div className="mt-1.5">
                      <PriceBreakdown pricing={deliveredPricing} variant="full" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Item price only for contact_seller or non-Baltic */}
                    <div className="text-2xl font-bold text-polar-night">
                      €{listing.price.toFixed(2)}
                    </div>
                    {listing.previous_price && listing.previous_price > listing.price && (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm text-text-muted line-through">
                          €{listing.previous_price.toFixed(2)}
                        </span>
                        <span className="text-xs text-aurora-green font-medium">
                          {t('price.save', { percentage: Math.round((1 - listing.price / listing.previous_price) * 100) })}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
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
                    <Image
                      src={displayImage}
                      alt={listing.game_name}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <Package className="w-8 h-8 text-text-muted" />
                  )}
                  {/* Photo count badge */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium z-10">
                      {t('listing.photosCount', { count: allImages.length })}
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
                      className="cursor-pointer hover:ring-2 hover:ring-frost-ice/30 rounded-lg transition-all self-start"
                      aria-label={t('listing.learnConditionAria', { condition: tListings(`conditions.${listing.condition}`) })}
                      title={t('listing.conditionGradesTooltip')}
                    >
                      <Badge variant={conditionVariant}>
                        {tListings(`conditions.${listing.condition}`)}
                      </Badge>
                    </button>
                    {listing.game?.is_expansion && (
                      <Badge
                        variant="default"
                        size="sm"
                        icon={<Puzzle className="w-3 h-3" />}
                      >
                        {t('listing.expansion')}
                      </Badge>
                    )}
                    {!listing.all_components_present && (
                      <span className="flex items-center gap-1 text-xs text-aurora-red">
                        <AlertCircle className="w-3 h-3" />
                        {t('listing.missingParts')}
                      </span>
                    )}
                  </div>
                  {/* Price & Save */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    {isAuctionListing(listing) ? (
                      <>
                        {/* Auction badge */}
                        <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />}>
                          {t('auction.badge')}
                        </Badge>
                        <div className="text-xs text-text-secondary mt-1">
                          {listing.auction_current_bid ? t('auction.currentBid') : t('auction.startingPrice')}
                        </div>
                        <div className="text-xl font-bold text-aurora-purple">
                          €{(listing.auction_current_bid || listing.auction_start_price || 0).toFixed(2)}
                        </div>
                      </>
                    ) : deliveredPricing.canCalculate ? (
                      <>
                        {/* Total delivered as primary price */}
                        <div className="text-xl font-bold text-polar-night">
                          €{deliveredPricing.totalDelivered.toFixed(2)}
                          {deliveredPricing.isEstimate && <span className="text-sm font-normal text-text-muted">*</span>}
                        </div>
                        {listing.previous_price && listing.previous_price > listing.price && (
                          <div className="text-sm text-text-muted line-through">
                            €{listing.previous_price.toFixed(2)}
                          </div>
                        )}
                        {/* Compact breakdown */}
                        <PriceBreakdown pricing={deliveredPricing} variant="compact" />
                      </>
                    ) : (
                      <>
                        {/* Item price only for contact_seller or non-Baltic */}
                        <div className="text-xl font-bold text-polar-night">
                          €{listing.price.toFixed(2)}
                        </div>
                        {listing.previous_price && listing.previous_price > listing.price && (
                          <div className="text-sm text-text-muted line-through">
                            €{listing.previous_price.toFixed(2)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Game Name with BGG link */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-polar-night line-clamp-1">
                {listing.game_name}
              </h3>
              <a
                href={bggGameUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                title={t('listing.viewOnBGG')}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Version Info - edition, language, publisher each on own line */}
            {(formattedEdition || listing.language || listing.publisher) && (
              <div className="text-sm text-text-secondary space-y-0.5">
                {formattedEdition && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    {formattedEdition}
                  </p>
                )}
                {listing.language && (
                  <p className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span>{listing.language.replace(/, /g, ' / ')}</span>
                  </p>
                )}
                {listing.publisher && (
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span>{listing.publisher.replace(/, /g, ' / ')}</span>
                  </p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="border-t border-border-subtle">
          {/* Included Expansions - Collapsible */}
            {listing.included_expansions && listing.included_expansions.length > 0 && (
              <CollapsibleDetails
                title={t('expansions.title', { count: listing.included_expansions.length })}
                icon={<Puzzle className="w-4 h-4 text-aurora-green" />}
                isExpanded={expandedSections.has('expansions')}
                onToggle={() => toggleSection('expansions')}
                subtitle={
                  listing.included_expansions.length === 1
                    ? listing.included_expansions[0].name
                    : `${listing.included_expansions[0].name} ${t('expansions.moreCount', { count: listing.included_expansions.length - 1 })}`
                }
              >
                <div className="space-y-3">
                  {listing.included_expansions.map((expansion, index) => {
                    const bggExpansionUrl = `https://boardgamegeek.com/boardgameexpansion/${expansion.bgg_id}`;
                    // Format: "German • Lookout Games • 2025"
                    const expansionSubtitle = [
                      expansion.language?.replace(/, /g, ' / '),
                      expansion.publisher?.replace(/, /g, ' / '),
                      expansion.year,
                    ].filter(Boolean).join(' • ');

                    return (
                      <div key={expansion.bgg_id} className="flex gap-3">
                        {/* Expansion Thumbnail */}
                        <button
                          onClick={() => {
                            if (expansion.image) {
                              // Find the index of this expansion's image in allImagesWithExpansions
                              const imageIndex = allImages.length +
                                (listing.included_expansions ?? [])
                                  .slice(0, index)
                                  .filter(e => e.image).length;
                              setCurrentImageIndex(imageIndex);
                              setIsLightboxOpen(true);
                            }
                          }}
                          className="flex-shrink-0"
                          disabled={!expansion.image}
                        >
                          <div className={`relative w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden ${expansion.image ? 'hover:ring-2 hover:ring-frost-ice/50 cursor-pointer' : ''} transition-all`}>
                            {expansion.thumbnail || expansion.image ? (
                              <Image
                                src={expansion.thumbnail || expansion.image || ''}
                                alt={expansion.name}
                                fill
                                className="object-contain p-1"
                                sizes="48px"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-5 h-5 text-text-muted" />
                            )}
                          </div>
                        </button>
                        {/* Expansion Info */}
                        <div className="flex-grow min-w-0 flex items-center">
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium text-polar-night line-clamp-1">
                              {expansion.name}
                            </p>
                            {expansionSubtitle && (
                              <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                                {expansionSubtitle}
                              </p>
                            )}
                          </div>
                          {/* BGG Link */}
                          <a
                            href={bggExpansionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 p-1.5 text-text-muted hover:text-frost-ice transition-colors"
                            title={t('listing.viewOnBGG')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleDetails>
            )}

            {/* Condition Details - Collapsible (only show if there's something notable) */}
            {(!listing.all_components_present || listing.condition_notes) && (
              <CollapsibleDetails
                title={t('conditionDetails.title')}
                icon={!listing.all_components_present
                  ? <AlertCircle className="w-4 h-4 text-aurora-red" />
                  : <Info className="w-4 h-4" />
                }
                isExpanded={expandedSections.has('condition')}
                onToggle={() => toggleSection('condition')}
                badge={!listing.all_components_present ? (
                  <span className="text-xs text-aurora-red font-medium">{t('listing.missingParts')}</span>
                ) : undefined}
                subtitle={listing.condition_notes?.slice(0, 60) + (listing.condition_notes && listing.condition_notes.length > 60 ? '...' : '')}
              >
                <div className="space-y-2 text-sm">
                  {!listing.all_components_present && listing.missing_components && (
                    <p className="text-text-secondary">{listing.missing_components}</p>
                  )}
                  {listing.condition_notes && (
                    <p className={`text-text-secondary leading-relaxed ${!listing.all_components_present && listing.missing_components ? 'pt-2 border-t border-border-subtle' : ''}`}>
                      {listing.condition_notes}
                    </p>
                  )}
                </div>
              </CollapsibleDetails>
            )}

            {/* Footer: Shipping notes only (date now shown in collapsed view) */}
          {listing.shipping_notes && (
            <div className="p-3 sm:p-4">
              <span className="text-xs text-text-muted">📦 {listing.shipping_notes}</span>
            </div>
          )}
        </div>

        {/* Auction Bid Panel - Full bidding interface for auction listings */}
        {isAuctionListing(listing) && !isOwnListing && (
          <div className="border-t border-border-subtle p-3 sm:p-4">
            <AuctionBidPanel listing={listing} />
          </div>
        )}

        {/* Contact Seller Warning Banner (Legal Requirement) - Desktop */}
        {isContactSellerListing(listing) && (
          <div className="hidden sm:block border-t border-border-subtle">
            <div className="bg-aurora-yellow/10 border-b border-aurora-yellow/30 px-4 py-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-aurora-yellow flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('contactSellerWarning')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER: Seller info + actions (desktop and mobile) */}
        <div className={`hidden sm:flex items-center justify-between gap-4 px-3 sm:px-4 py-3 ${!isContactSellerListing(listing) ? 'border-t border-border-subtle' : ''}`}>
          {/* Left: Seller Info */}
          <div className="min-w-0 flex-1">
            <UserInfoCard
              user={{
                id: listing.seller.id,
                name: listing.seller.full_name,
                avatarUrl: listing.seller.avatar_url,
                country: listing.seller.country,
              }}
              seller={{
                totalSales: listing.seller.total_completed_sales ?? 0,
                averageRating: listing.seller.average_rating ?? 0,
                totalReviews: listing.seller.total_reviews ?? 0,
                badgeTier: getSellerBadgeTier(
                  listing.seller.total_completed_sales ?? 0,
                  listing.seller.average_rating ?? 0
                ),
              }}
              size="sm"
              compact
            />
          </div>

          {/* Middle: Listed date */}
          <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
            {formattedListedDate}
          </span>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save Button */}
            {!isOwnListing && (
              <button
                onClick={handleSaveToggle}
                disabled={saveLoading}
                className="p-2 rounded-md hover:bg-bg-secondary transition-colors disabled:opacity-50"
                aria-label={isSaved ? t('actions.unsaveAria') : t('actions.saveAria')}
                title={isSaved ? t('actions.unsaveTooltip') : t('actions.saveTooltip')}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'text-aurora-red' : 'text-text-muted hover:text-aurora-red'}`} filled={isSaved} />
              </button>
            )}

            {/* Message Button with count */}
            {!isOwnListing && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsQADrawerOpen(true);
                }}
                className="p-2 rounded-md hover:bg-bg-secondary transition-colors relative"
                aria-label={t('actions.askQuestion')}
                title={t('actions.askQuestion')}
              >
                <MessageSquare className="w-5 h-5 text-text-muted hover:text-frost-ice" />
                {questionCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-frost-ice text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {questionCount > 99 ? '99+' : questionCount}
                  </span>
                )}
              </button>
            )}

            {/* Reservation Timer / Add to Cart - Not shown for auctions (bid panel is above) */}
            {!isOwnListing && !isAuctionListing(listing) && (
              <>
                {listingStatus === 'reserved' && listing.reserved_until && (
                  <div
                    className="flex items-center justify-center px-2"
                    title={t('actions.reservedTooltip')}
                  >
                    <ReservationTimer
                      expiresAt={listing.reserved_until}
                      onExpire={handleReservationExpire}
                      showLabel={false}
                      size="sm"
                    />
                  </div>
                )}
                {listingStatus === 'sold' ? (
                  <div className="text-sm text-text-muted px-4 py-2">{t('actions.sold')}</div>
                ) : isContactSellerListing(listing) ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleContactSeller}
                    disabled={isInitiatingConversation || isOwnListing}
                  >
                    {isInitiatingConversation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {t('actions.contactSeller')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant={listingStatus === 'reserved' ? 'secondary' : 'accent'}
                    size="sm"
                    onClick={handleAddToCart}
                    disabled={loading || listingStatus === 'reserved'}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : listingStatus === 'reserved' ? (
                      t('actions.reserved')
                    ) : (
                      t('actions.addToCart')
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Seller Info */}
        <div className="sm:hidden border-t border-border-subtle px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <UserInfoCard
                user={{
                  id: listing.seller.id,
                  name: listing.seller.full_name,
                  avatarUrl: listing.seller.avatar_url,
                  country: listing.seller.country,
                }}
                seller={{
                  totalSales: listing.seller.total_completed_sales ?? 0,
                  averageRating: listing.seller.average_rating ?? 0,
                  totalReviews: listing.seller.total_reviews ?? 0,
                  badgeTier: getSellerBadgeTier(
                    listing.seller.total_completed_sales ?? 0,
                    listing.seller.average_rating ?? 0
                  ),
                }}
                size="xs"
                compact
              />
            </div>
            {/* Listed date */}
            <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
              {formattedListedDate}
            </span>
          </div>
        </div>

        {/* Contact Seller Warning Banner (Legal Requirement) - Mobile */}
        {isContactSellerListing(listing) && (
          <div className="sm:hidden border-t border-border-subtle">
            <div className="bg-aurora-yellow/10 px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-aurora-yellow flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('contactSellerWarning')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Footer: Actions - Not shown for auctions (bid panel is above) */}
        {!isOwnListing && !isAuctionListing(listing) && (
          <div className={`sm:hidden sticky bottom-0 left-0 right-0 bg-snow-white ${!isContactSellerListing(listing) ? 'border-t border-border-subtle' : ''} p-3 shadow-lg`}>
            <div className="flex items-center justify-between gap-2">
              {/* Price */}
              <div className="flex-shrink-0">
                <div className="text-lg font-bold text-polar-night">€{listing.price.toFixed(2)}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Save Button */}
                <button
                  onClick={handleSaveToggle}
                  disabled={saveLoading}
                  className="p-2 rounded-md hover:bg-bg-secondary transition-colors disabled:opacity-50"
                  aria-label={isSaved ? t('actions.unsaveAria') : t('actions.saveAria')}
                >
                  <Heart className={`w-5 h-5 ${isSaved ? 'text-aurora-red' : 'text-text-muted'}`} filled={isSaved} />
                </button>

                {/* Message Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsQADrawerOpen(true);
                  }}
                  className="p-2 rounded-md hover:bg-bg-secondary transition-colors relative"
                  aria-label={t('actions.askQuestion')}
                >
                  <MessageSquare className="w-5 h-5 text-text-muted" />
                  {questionCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 bg-frost-ice text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {questionCount > 99 ? '99+' : questionCount}
                    </span>
                  )}
                </button>

                {/* Reservation Timer / Add to Cart / Contact Seller */}
                {listingStatus === 'reserved' && listing.reserved_until ? (
                  <ReservationTimer
                    expiresAt={listing.reserved_until}
                    onExpire={handleReservationExpire}
                    showLabel={true}
                    size="sm"
                  />
                ) : listingStatus === 'sold' ? (
                  <span className="text-sm text-text-muted px-3">{t('actions.sold')}</span>
                ) : isContactSellerListing(listing) ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleContactSeller}
                    disabled={isInitiatingConversation || isOwnListing}
                  >
                    {isInitiatingConversation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {t('actions.contactSeller')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleAddToCart}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('actions.addToCart')
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox - includes expansion images for when they're clicked */}
      {allImagesWithExpansions.length > 0 && (
        <ImageLightbox
          images={allImagesWithExpansions}
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

      {/* Q&A Drawer */}
      <ListingQuestionsDrawer
        listingId={listing.id}
        sellerId={listing.seller_id}
        gameName={listing.game_name}
        gameImage={listing.game?.thumbnail || listing.game?.image || null}
        price={listing.price}
        condition={listing.condition}
        isOpen={isQADrawerOpen}
        onClose={() => setIsQADrawerOpen(false)}
        onQuestionCountChange={setQuestionCount}
        onLoginRequired={() => {
          router.push(`/auth/signin?redirect=/game/${listing.bgg_game_id}`);
        }}
      />
    </>
  );
}
