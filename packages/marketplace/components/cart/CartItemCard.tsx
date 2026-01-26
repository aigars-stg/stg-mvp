'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@second-turn/design-system';
import { Package, AlertCircle, BookOpen, PuzzlePiece as Puzzle, TrashAlt as Trash2, RefreshCw as Loader2 } from 'griddy-icons';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { SwipeToDelete } from '@/components/common/SwipeToDelete';
import { getConditionLabel, type ListingCondition } from '@/lib/types/listing';
import { getConditionBadgeVariant } from '@/lib/utils/condition-utils';
import { useTranslations } from 'next-intl';

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
  // Extended fields (optional - will be added to API)
  photo_urls?: string[];
  is_expansion?: boolean;
  language?: string;
  all_components_present?: boolean;
}

interface CartItemCardProps {
  item: CartItemData;
  onRemove: (listingId: string) => void;
  isRemoving?: boolean;
}

// Priority languages for Baltic region
const PRIORITY_LANGUAGES = ['Latvian', 'Lithuanian', 'Estonian', 'English', 'German'];

/**
 * Format languages for display - show priority languages first, collapse others
 */
function formatLanguages(languageString: string): { display: string; icons: string[] } {
  const languages = languageString.split(/,\s*/).map(l => l.trim()).filter(Boolean);

  if (languages.length === 0) {
    return { display: '', icons: [] };
  }

  // Map language names to flag emoji codes
  const languageFlags: Record<string, string> = {
    'Latvian': '🇱🇻',
    'Lithuanian': '🇱🇹',
    'Estonian': '🇪🇪',
    'English': '🇬🇧',
    'German': '🇩🇪',
    'Russian': '🇷🇺',
    'Polish': '🇵🇱',
    'French': '🇫🇷',
    'Spanish': '🇪🇸',
    'Italian': '🇮🇹',
    'Dutch': '🇳🇱',
    'Czech': '🇨🇿',
    'Hungarian': '🇭🇺',
    'Finnish': '🇫🇮',
    'Swedish': '🇸🇪',
    'Norwegian': '🇳🇴',
    'Danish': '🇩🇰',
  };

  // Get flag icons for display (max 4)
  const icons = languages
    .slice(0, 4)
    .map(lang => languageFlags[lang])
    .filter(Boolean);

  // Text display for tooltip
  if (languages.length <= 3) {
    return { display: languages.join(' / '), icons };
  }

  const priorityPresent = PRIORITY_LANGUAGES.filter(lang => languages.includes(lang));
  const nonPriorityCount = languages.length - priorityPresent.length;

  if (priorityPresent.length > 0 && nonPriorityCount > 0) {
    return { display: `${priorityPresent.join(' / ')} +${nonPriorityCount}`, icons };
  }

  return { display: `${languages.slice(0, 2).join(' / ')} +${languages.length - 2}`, icons };
}

export function CartItemCard({ item, onRemove, isRemoving = false }: CartItemCardProps) {
  const t = useTranslations('Cart');
  const tListings = useTranslations('Listings');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Collect all available images
  const allImages = item.photo_urls && item.photo_urls.length > 0
    ? item.photo_urls
    : item.photo_url
      ? [item.photo_url]
      : [];

  const conditionVariant = getConditionBadgeVariant(item.condition);
  const languageInfo = item.language ? formatLanguages(item.language) : null;

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
      {/* Mobile Layout - Vertical Stack */}
      <div className="sm:hidden">
        {/* Image Carousel */}
        <ImageCarousel
          images={allImages}
          alt={item.game_name}
          showArrows={false}
          showDots={true}
          showCounter={false}
          enableSwipe={true}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          onImageClick={handleImageClick}
          containerClassName="relative h-44 bg-bg-secondary flex items-center justify-center group overflow-hidden cursor-pointer"
          placeholderIcon={<Package className="w-12 h-12 text-text-muted" />}
        />

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-grow min-w-0">
              {/* Game Name */}
              <Link
                href={`/game/${item.bgg_game_id}`}
                className="font-medium text-polar-night hover:text-frost-ice transition-colors line-clamp-2 block"
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

                {item.all_components_present === false && (
                  <span title={tListings('card.missingComponents')}>
                    <AlertCircle className="w-4 h-4 text-aurora-red" />
                  </span>
                )}
              </div>

              {/* Language Icons */}
              {languageInfo && languageInfo.icons.length > 0 && (
                <div
                  className="flex items-center gap-1 mt-2 text-sm"
                  title={languageInfo.display}
                >
                  <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-base">{languageInfo.icons.join(' ')}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <span className="text-lg font-bold text-polar-night flex-shrink-0">
              €{item.price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden sm:flex gap-4 p-4 sm:p-5">
        {/* Image Carousel */}
        <div className="flex-shrink-0 w-32 h-32">
          <ImageCarousel
            images={allImages}
            alt={item.game_name}
            showArrows={false}
            showDots={true}
            showCounter={false}
            enableSwipe={true}
            currentIndex={currentImageIndex}
            onIndexChange={setCurrentImageIndex}
            onImageClick={handleImageClick}
            containerClassName="relative h-full w-full bg-bg-secondary rounded-lg flex items-center justify-center group overflow-hidden cursor-pointer"
            imageClassName="object-contain p-2"
            placeholderIcon={<Package className="w-10 h-10 text-text-muted" />}
          />
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0 flex flex-col justify-center">
          {/* Game Name */}
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

            {item.all_components_present === false && (
              <span title={tListings('card.missingComponents')}>
                <AlertCircle className="w-4 h-4 text-aurora-red" />
              </span>
            )}

            {/* Language Icons */}
            {languageInfo && languageInfo.icons.length > 0 && (
              <div
                className="flex items-center gap-1 text-sm"
                title={languageInfo.display}
              >
                <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-base">{languageInfo.icons.join(' ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price & Remove */}
        <div className="flex flex-col items-end justify-between flex-shrink-0">
          <span className="text-xl font-bold text-polar-night">
            €{item.price.toFixed(2)}
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
          initialIndex={currentImageIndex}
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
