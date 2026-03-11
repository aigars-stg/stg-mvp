'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@second-turn/design-system';
import {
  Package,
  AlertCircle,
  PuzzlePiece as Puzzle,
  InfoCircle as Info,
  LinkExternal as ExternalLink,
} from '@/lib/icons';
import { OfferCardVersionInfo } from '@/components/game/OfferCardVersionInfo';
import { CollapsibleDetails } from '@/components/game/CollapsibleDetails';
import { DotCarousel } from '@/components/common/ImageCarousel';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { ConditionInfoModal } from '@/components/common/ConditionInfoModal';
import { formatPrice } from '@/lib/services/pricing';
import { type ListingCondition } from '@/lib/types/listing';
import type { OrderDetailItem } from '@/lib/types/order-detail';

interface OrderListingCardProps {
  item: OrderDetailItem;
  /** Show clickable link to game page */
  showGameLink?: boolean;
}

export function OrderListingCard({ item, showGameLink = false }: OrderListingCardProps) {
  const t = useTranslations('OfferCard');
  const tListings = useTranslations('Listings');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showConditionInfo, setShowConditionInfo] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // BGG full image first (mirrors OfferCard's game.image), then user-uploaded photos
  const allImages: string[] = [
    ...(item.game_image ? [item.game_image] : item.game_thumbnail ? [item.game_thumbnail] : []),
    ...(item.photo_urls ?? (item.photo_url ? [item.photo_url] : [])),
  ];

  const displayImage = allImages[0] ?? null;

  const bggGameUrl = item.bgg_game_id
    ? `https://boardgamegeek.com/boardgame/${item.bgg_game_id}`
    : null;

  const formattedEdition = item.version_name
    ? item.edition_year
      ? `${item.version_name}, ${item.edition_year}`
      : item.version_name
    : item.edition_year
      ? `${item.edition_year} edition`
      : null;

  const includedExpansions = item.included_expansions ?? [];
  const hasConditionDetails = !item.all_components_present || !!item.condition_notes;

  return (
    <>
      <div className="bg-snow-white border rounded-xl overflow-hidden">
        <div className="p-3 sm:p-4">
          {/* Desktop: 3-column grid */}
          <div className="hidden sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_auto] gap-4">
            {/* LEFT: Photo carousel */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => allImages.length > 0 && setIsLightboxOpen(true)}
                className={allImages.length > 0 ? 'cursor-pointer group' : 'cursor-default'}
              >
                <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-frost-ice/50 transition-all relative">
                  {allImages[currentImageIndex] ? (
                    <Image
                      src={allImages[currentImageIndex]}
                      alt={item.game_name}
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                      unoptimized
                    />
                  ) : displayImage ? (
                    <Image
                      src={displayImage}
                      alt={item.game_name}
                      fill
                      className="object-contain p-2"
                      sizes="160px"
                      unoptimized
                    />
                  ) : (
                    <Package className="w-10 h-10 text-text-muted" aria-hidden="true" />
                  )}
                </div>
              </button>
              <DotCarousel
                images={allImages}
                alt={item.game_name}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                ariaLabel={(n) => t('listing.viewImageAria', { number: n })}
              />
            </div>

            {/* MIDDLE: Game info */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-start gap-2 mb-1">
                {showGameLink && item.bgg_game_id ? (
                  <Link
                    href={`/game/${item.bgg_game_id}`}
                    className="text-base font-semibold text-polar-night hover:text-frost-ice transition-colors line-clamp-2"
                  >
                    {item.game_name}
                  </Link>
                ) : (
                  <h3 className="text-base font-semibold text-polar-night line-clamp-2">
                    {item.game_name}
                  </h3>
                )}
                {bggGameUrl && (
                  <a
                    href={bggGameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                    title={t('listing.viewOnBGG')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>

              <OfferCardVersionInfo
                formattedEdition={formattedEdition}
                language={item.language ?? null}
                publisher={item.publisher ?? null}
              />
            </div>

            {/* RIGHT: Price + condition */}
            <div className="flex flex-col items-end gap-1 min-w-[140px]">
              <span className="text-xl font-bold text-polar-night">
                {formatPrice(item.price)}
              </span>
              <button
                type="button"
                onClick={() => setShowConditionInfo(true)}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-frost-ice transition-colors"
                title={t('listing.conditionGradesTooltip')}
              >
                {tListings(`conditions.${item.condition}`)}
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              {item.all_components_present === false && (
                <span className="flex items-center gap-1 text-xs text-aurora-red">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  {t('listing.missingParts')}
                </span>
              )}
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: image + price/condition */}
            <div className="flex gap-3">
              <button
                onClick={() => allImages.length > 0 && setIsLightboxOpen(true)}
                className="flex-shrink-0"
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
                    <Package className="w-8 h-8 text-text-muted" aria-hidden="true" />
                  )}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-polar-night/80 backdrop-blur-sm rounded text-[10px] text-snow-white font-medium z-10">
                      {t('listing.photosCount', { count: allImages.length })}
                    </div>
                  )}
                </div>
              </button>

              <div className="flex-grow flex flex-col justify-center gap-1">
                <span className="text-lg font-bold text-polar-night">
                  {formatPrice(item.price)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowConditionInfo(true)}
                  className="flex items-center gap-1 text-sm text-text-secondary hover:text-frost-ice transition-colors self-start"
                  title={t('listing.conditionGradesTooltip')}
                >
                  {tListings(`conditions.${item.condition}`)}
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {item.all_components_present === false && (
                  <span className="flex items-center gap-1 text-xs text-aurora-red">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    {t('listing.missingParts')}
                  </span>
                )}
              </div>
            </div>

            {/* Game name + BGG link */}
            <div className="flex items-center gap-2">
              {showGameLink && item.bgg_game_id ? (
                <Link
                  href={`/game/${item.bgg_game_id}`}
                  className="text-base font-semibold text-polar-night hover:text-frost-ice transition-colors line-clamp-1"
                >
                  {item.game_name}
                </Link>
              ) : (
                <h3 className="text-base font-semibold text-polar-night line-clamp-1">
                  {item.game_name}
                </h3>
              )}
              {bggGameUrl && (
                <a
                  href={bggGameUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 text-text-muted hover:text-frost-ice transition-colors"
                  title={t('listing.viewOnBGG')}
                >
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>

            <OfferCardVersionInfo
              formattedEdition={formattedEdition}
              language={item.language ?? null}
              publisher={item.publisher ?? null}
            />
          </div>
        </div>

        {/* Collapsible sections */}
        {(includedExpansions.length > 0 || hasConditionDetails || item.shipping_notes) && (
          <div className="border-t border-border-subtle">
            {includedExpansions.length > 0 && (
              <CollapsibleDetails
                title={t('expansions.title', { count: includedExpansions.length })}
                icon={<Puzzle className="w-4 h-4 text-aurora-green" aria-hidden="true" />}
                isExpanded={expandedSections.has('expansions')}
                onToggle={() => toggleSection('expansions')}
                subtitle={
                  includedExpansions.length === 1
                    ? includedExpansions[0].name
                    : `${includedExpansions[0].name} ${t('expansions.moreCount', { count: includedExpansions.length - 1 })}`
                }
              >
                <div className="space-y-3">
                  {includedExpansions.map((expansion) => {
                    const expansionSubtitle = [
                      expansion.language?.replace(/, /g, ' / '),
                      expansion.publisher?.replace(/, /g, ' / '),
                      expansion.year,
                    ].filter(Boolean).join(' • ');

                    return (
                      <div key={expansion.bgg_id} className="flex gap-3">
                        <div className="relative w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {expansion.thumbnail || expansion.image ? (
                            <Image
                              src={(expansion.thumbnail || expansion.image) as string}
                              alt={expansion.name}
                              fill
                              className="object-contain p-1"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <Package className="w-5 h-5 text-text-muted" aria-hidden="true" />
                          )}
                        </div>
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
                          <a
                            href={`https://boardgamegeek.com/boardgameexpansion/${expansion.bgg_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-1.5 text-text-muted hover:text-frost-ice transition-colors"
                            title={t('listing.viewOnBGG')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleDetails>
            )}

            {hasConditionDetails && (
              <CollapsibleDetails
                title={t('conditionDetails.title')}
                icon={
                  item.all_components_present === false
                    ? <AlertCircle className="w-4 h-4 text-aurora-red" aria-hidden="true" />
                    : <Info className="w-4 h-4" aria-hidden="true" />
                }
                isExpanded={expandedSections.has('condition')}
                onToggle={() => toggleSection('condition')}
                badge={
                  item.all_components_present === false
                    ? <span className="text-xs text-aurora-red font-medium">{t('listing.missingParts')}</span>
                    : undefined
                }
                subtitle={item.condition_notes ? item.condition_notes.slice(0, 60) + (item.condition_notes.length > 60 ? '...' : '') : undefined}
              >
                <div className="space-y-2 text-sm">
                  {item.all_components_present === false && item.missing_components && (
                    <p className="text-text-secondary">{item.missing_components}</p>
                  )}
                  {item.condition_notes && (
                    <p className={`text-text-secondary leading-relaxed ${item.all_components_present === false && item.missing_components ? 'pt-2 border-t border-border-subtle' : ''}`}>
                      {item.condition_notes}
                    </p>
                  )}
                </div>
              </CollapsibleDetails>
            )}

            {item.shipping_notes && (
              <div className="p-3 sm:p-4">
                <span className="text-xs text-text-muted">📦 {item.shipping_notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Condition badge footer */}
        <div className="border-t border-border-subtle px-3 sm:px-4 py-2.5 flex items-center gap-2">
          <Badge variant={item.condition as ListingCondition} size="sm">
            {tListings(`conditions.${item.condition}`)}
          </Badge>
        </div>
      </div>

      {allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={currentImageIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          gameName={item.game_name}
        />
      )}

      <ConditionInfoModal
        isOpen={showConditionInfo}
        onClose={() => setShowConditionInfo(false)}
        condition={item.condition as ListingCondition}
      />
    </>
  );
}
