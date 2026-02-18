'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Badge } from '@second-turn/design-system';
import { Package, AlertCircle, PuzzlePiece as Puzzle, TrashAlt as Trash2, RefreshCw as Loader2 } from '@/lib/icons';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { SwipeToDelete } from '@/components/common/SwipeToDelete';
import { OfferCardVersionInfo } from '@/components/game/OfferCardVersionInfo';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/services/pricing';

export interface CartItemData {
  item_id: string;
  listing_id: string;
  bgg_game_id: number;
  game_name: string;
  price: number;
  photo_url: string | null;
  condition: string;
  expires_at: string;
  is_expired: boolean;
  photo_urls: string[];
  is_expansion: boolean;
  language: string | null;
  all_components_present: boolean;
  version_name: string | null;
  publisher: string | null;
  edition_year: number | null;
  game_thumbnail: string | null;
  game_image: string | null;
}

interface CartItemCardProps {
  item: CartItemData;
  onRemove: (listingId: string) => void;
  isRemoving?: boolean;
}

export function CartItemCard({ item, onRemove, isRemoving = false }: CartItemCardProps) {
  const t = useTranslations('Cart');
  const tListings = useTranslations('Listings');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Collect all available images (BGG image first, then user photos)
  const allImages = [
    ...(item.game_image ? [item.game_image] : []),
    ...(item.photo_urls || []),
  ].filter(Boolean);

  // Display image: BGG image preferred, then user photos, then legacy fallback
  const displayImage = item.game_image || item.game_thumbnail || item.photo_urls?.[0] || item.photo_url;

  const conditionVariant = getConditionBadgeVariant(item.condition);

  // Format edition string (same logic as OfferCard)
  const formattedEdition = item.version_name
    ? item.edition_year
      ? `${item.version_name}, ${item.edition_year}`
      : item.version_name
    : item.edition_year
      ? `${item.edition_year} edition`
      : null;

  const handleImageClick = () => {
    if (allImages.length > 0) {
      setLightboxOpen(true);
    }
  };

  const handleRemove = () => {
    onRemove(item.listing_id);
  };

  const cardContent = (
    <div className={`bg-snow-white ${item.is_expired ? 'opacity-50' : ''}`}>
      {/* Mobile Layout - Compact Horizontal */}
      <div className="sm:hidden p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <button
            onClick={handleImageClick}
            className="flex-shrink-0 cursor-pointer"
          >
            <div className="relative w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-frost-ice/50 transition-all">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={item.game_name}
                  fill
                  className="object-contain p-1"
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <Package className="w-8 h-8 text-text-muted" />
              )}
              {allImages.length > 1 && (
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium z-10">
                  {allImages.length}
                </div>
              )}
            </div>
          </button>

          {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start gap-2">
              <Link
                href={`/game/${item.bgg_game_id}`}
                className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2 block"
              >
                {item.game_name}
              </Link>
              <span className="text-lg font-bold text-polar-night flex-shrink-0">
                {formatPrice(item.price)}
              </span>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant={conditionVariant} size="sm">
                {getConditionLabel(item.condition as ListingCondition)}
              </Badge>

              {item.is_expansion && (
                <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                  {tListings('card.expansion')}
                </Badge>
              )}

              {!item.all_components_present && (
                <span className="flex items-center gap-1 text-xs text-aurora-red">
                  <AlertCircle className="w-3 h-3" />
                  {tListings('card.missingComponents')}
                </span>
              )}
            </div>

            {/* Version Info */}
            <div className="mt-1.5">
              <OfferCardVersionInfo
                formattedEdition={formattedEdition}
                language={item.language}
                publisher={null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Grid */}
      <div className="hidden sm:grid sm:grid-cols-[100px_1fr_auto] gap-4 p-4 sm:p-5">
        {/* Thumbnail */}
        <button
          onClick={handleImageClick}
          className="flex-shrink-0 cursor-pointer"
        >
          <div className="relative w-[100px] h-[100px] rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-frost-ice/50 transition-all">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={item.game_name}
                fill
                className="object-contain p-2"
                sizes="100px"
                unoptimized
              />
            ) : (
              <Package className="w-10 h-10 text-text-muted" />
            )}
            {allImages.length > 1 && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium z-10">
                {allImages.length}
              </div>
            )}
          </div>
        </button>

        {/* Content */}
        <div className="flex flex-col justify-center min-w-0">
          <Link
            href={`/game/${item.bgg_game_id}`}
            className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
          >
            {item.game_name}
          </Link>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant={conditionVariant} size="sm">
              {getConditionLabel(item.condition as ListingCondition)}
            </Badge>

            {item.is_expansion && (
              <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                {tListings('card.expansion')}
              </Badge>
            )}

            {!item.all_components_present && (
              <span className="flex items-center gap-1 text-xs text-aurora-red">
                <AlertCircle className="w-3 h-3" />
                {tListings('card.missingComponents')}
              </span>
            )}
          </div>

          {/* Version Info */}
          <div className="mt-1.5">
            <OfferCardVersionInfo
              formattedEdition={formattedEdition}
              language={item.language}
              publisher={item.publisher}
            />
          </div>
        </div>

        {/* Price & Remove */}
        <div className="flex flex-col items-end justify-between flex-shrink-0">
          <span className="text-xl font-bold text-polar-night">
            {formatPrice(item.price)}
          </span>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="p-2 text-text-muted hover:text-aurora-red hover:bg-aurora-red/10 rounded-lg transition-colors disabled:opacity-50"
            aria-label={t('item.remove')}
          >
            {isRemoving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      {allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={0}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          gameName={item.game_name}
        />
      )}
    </div>
  );

  // On mobile, wrap with SwipeToDelete
  return (
    <>
      {/* Mobile: with swipe */}
      <div className="sm:hidden">
        <SwipeToDelete
          onDelete={handleRemove}
          isDeleting={isRemoving}
          deleteLabel={t('item.delete')}
          disabled={item.is_expired}
        >
          {cardContent}
        </SwipeToDelete>
      </div>

      {/* Desktop: without swipe */}
      <div className="hidden sm:block">
        {cardContent}
      </div>
    </>
  );
}
