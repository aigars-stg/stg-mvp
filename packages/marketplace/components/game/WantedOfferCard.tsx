'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@second-turn/design-system';
import { Package, Globe, BookOpen, Building as Building2, LinkExternal as ExternalLink, InfoCircle as Info } from 'griddy-icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { UserInfoCard } from '@/components/user';
import { ImageLightbox } from '@/components/listing/ImageLightbox';
import { CollapsibleDetails } from '@/components/game/CollapsibleDetails';
import { useTranslations } from 'next-intl';

interface WantedOfferCardProps {
  listing: WantedListingWithDetails;
  showBuyer?: boolean;
}

export function WantedOfferCard({
  listing,
  showBuyer = true,
}: WantedOfferCardProps) {
  const router = useRouter();
  const t = useTranslations('Wanted.ListingCard');

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Format budget display with translation
  const currencySymbol = listing.currency === 'EUR' ? '€' : listing.currency;
  const budgetDisplay = listing.min_price && listing.min_price > 0
    ? `${currencySymbol}${listing.min_price}–${currencySymbol}${listing.max_price}`
    : t('upTo', { price: `${currencySymbol}${listing.max_price}` });

  // Response tracking
  const isAtMaxResponses = listing.response_count >= 10;

  // Get display image (version image or game image)
  const displayImage = listing.version_image || listing.game?.image;
  const allImages = displayImage ? [displayImage] : [];

  // Format edition with year: "Latvian edition, 2024"
  const formattedEdition = listing.version_name
    ? listing.edition_year
      ? `${listing.version_name}, ${listing.edition_year}`
      : listing.version_name
    : listing.edition_year
      ? `${listing.edition_year}`
      : null;

  // BGG external link URL
  const bggGameUrl = `https://boardgamegeek.com/boardgame/${listing.bgg_game_id}`;

  const handleIHaveThis = () => {
    router.push(`/sell?wantedListingId=${listing.id}`);
  };

  return (
    <>
      <div className="bg-snow-white border-2 rounded-xl overflow-hidden border-border">
        <div className="p-3 sm:p-4">
          {/* Desktop: 3-column grid layout */}
          <div className="hidden sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_auto] gap-4">
            {/* LEFT COLUMN: Image */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (allImages.length > 0) {
                    setIsLightboxOpen(true);
                  }
                }}
                className="cursor-pointer group"
                disabled={allImages.length === 0}
              >
                <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-aurora-orange/50 transition-all relative">
                  {displayImage ? (
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
                  {/* WANTED Badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-aurora-orange rounded text-[10px] text-snow-white font-bold uppercase tracking-wide shadow-sm">
                    {t('wantedBadge')}
                  </div>
                </div>
              </button>
            </div>

            {/* MIDDLE COLUMN: Game name and version info */}
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
                  title={t('viewOnBGG')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Version Info - edition, language, publisher */}
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

            {/* RIGHT COLUMN: Budget */}
            <div className="flex flex-col items-end min-w-[140px]">
              <p className="text-xs text-text-muted mb-0.5">{t('budget')}</p>
              <div className="text-2xl font-bold text-aurora-orange">
                {budgetDisplay}
              </div>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: Image + Budget */}
            <div className="flex gap-3">
              {/* Image */}
              <button
                onClick={() => {
                  if (allImages.length > 0) {
                    setIsLightboxOpen(true);
                  }
                }}
                className="flex-shrink-0"
                disabled={allImages.length === 0}
              >
                <div className="relative w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-aurora-orange/50 transition-all">
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
                  {/* WANTED Badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-aurora-orange rounded text-[8px] text-snow-white font-bold uppercase tracking-wide">
                    {t('wantedBadge')}
                  </div>
                </div>
              </button>

              {/* Budget */}
              <div className="flex-grow flex flex-col justify-center">
                <p className="text-xs text-text-muted mb-0.5">{t('budget')}</p>
                <div className="text-xl font-bold text-aurora-orange">
                  {budgetDisplay}
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
                title={t('viewOnBGG')}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Version Info */}
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

        {/* Collapsible Notes Section */}
        {listing.notes && (
          <div className="border-t border-border-subtle">
            <CollapsibleDetails
              title={t('additionalNotes')}
              icon={<Info className="w-4 h-4" />}
              isExpanded={notesExpanded}
              onToggle={() => setNotesExpanded(!notesExpanded)}
              subtitle={listing.notes.slice(0, 60) + (listing.notes.length > 60 ? '...' : '')}
            >
              <p className="text-sm text-text-secondary leading-relaxed">
                {listing.notes}
              </p>
            </CollapsibleDetails>
          </div>
        )}

        {/* Footer: Buyer info + action */}
        <div className="border-t border-border-subtle px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Buyer Info */}
            {showBuyer && listing.buyer && (
              <div className="min-w-0 flex-1">
                <UserInfoCard
                  user={{
                    id: listing.buyer.id,
                    name: listing.buyer.full_name,
                    avatarUrl: listing.buyer.avatar_url,
                    country: listing.buyer.country,
                  }}
                  size="sm"
                  compact
                />
              </div>
            )}

            {/* I Have This Button */}
            <div className="flex-shrink-0">
              {!isAtMaxResponses ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleIHaveThis}
                >
                  {t('iHaveThis')}
                </Button>
              ) : (
                <span className="text-xs text-text-secondary">
                  {t('maxResponsesReached')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={0}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          gameName={listing.game_name}
        />
      )}
    </>
  );
}
