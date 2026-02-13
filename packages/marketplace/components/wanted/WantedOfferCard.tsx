'use client';

import Image from 'next/image';
import { Badge } from '@second-turn/design-system';
import { Package, PuzzlePiece as Puzzle, BookOpen, Globe, Building, LinkExternal as ExternalLink, Calendar, InfoCircle as Info } from '@/lib/icons';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { getCountryFlag, getCountryName } from '@/lib/country-utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CollapsibleDetails } from '@/components/game/CollapsibleDetails';

interface WantedOfferCardProps {
  wantedListing: WantedListingWithDetails;
  isPreview?: boolean;
}

export function WantedOfferCard({ wantedListing, isPreview: _isPreview = false }: WantedOfferCardProps) {
  const t = useTranslations('Wanted.OfferCard');
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Format edition with year like OfferCard: "English edition, 2019"
  const formattedEdition = wantedListing.version_name
    ? wantedListing.edition_year
      ? `${wantedListing.version_name}, ${wantedListing.edition_year}`
      : wantedListing.version_name
    : wantedListing.edition_year
      ? `${wantedListing.edition_year}`
      : null;

  // Format budget display
  const currencySymbol = wantedListing.currency === 'EUR' ? '€' : wantedListing.currency;
  const budgetDisplay = wantedListing.min_price && wantedListing.min_price > 0
    ? `${currencySymbol}${wantedListing.min_price}–${currencySymbol}${wantedListing.max_price}`
    : t('upTo', { price: `${currencySymbol}${wantedListing.max_price}` });

  // BGG link
  const bggGameUrl = `https://boardgamegeek.com/boardgame/${wantedListing.bgg_game_id}`;

  // Display image
  const displayImage = wantedListing.version_image || wantedListing.game?.image || wantedListing.game?.thumbnail;

  // Format listed date
  const listedDate = new Date(wantedListing.created_at);
  const formattedDate = listedDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

  return (
    <div className="bg-snow-white border-2 rounded-xl overflow-hidden transition-all border-border hover:border-aurora-orange/50">
      {/* Main Content */}
      <div className="p-3 sm:p-4">
        {/* Desktop: 3-column grid layout */}
        <div className="hidden sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_auto] gap-4">
          {/* LEFT COLUMN: Photo */}
          <div className="flex flex-col gap-2">
            <div className="w-full aspect-square rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden relative">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={wantedListing.game_name}
                  fill
                  className="object-contain p-2"
                  sizes="160px"
                  unoptimized
                />
              ) : (
                <Package className="w-10 h-10 text-text-muted" />
              )}
            </div>
          </div>

          {/* MIDDLE COLUMN: Game info, version */}
          <div className="flex flex-col min-w-0">
            {/* Game Name with BGG link */}
            <div className="flex items-start gap-2 mb-1">
              <h3 className="text-base font-semibold text-polar-night">
                {wantedListing.game_name}
              </h3>
              <a
                href={bggGameUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 p-1 text-text-muted hover:text-aurora-orange transition-colors"
                title={t('viewOnBGG')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Badges - Expansion only (no condition for wanted) */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {wantedListing.game?.is_expansion && (
                <Badge
                  variant="default"
                  size="sm"
                  icon={<Puzzle className="w-3 h-3" />}
                >
                  {t('expansion')}
                </Badge>
              )}
            </div>

            {/* Version Info - edition, language, publisher each on own line */}
            {(formattedEdition || wantedListing.language || wantedListing.publisher) && (
              <div className="text-sm text-text-secondary mb-2 space-y-0.5">
                {formattedEdition && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    {formattedEdition}
                  </p>
                )}
                {wantedListing.language && (
                  <p className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span>{wantedListing.language.replace(/ \| /g, ' / ')}</span>
                  </p>
                )}
                {wantedListing.publisher && (
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span>{wantedListing.publisher.replace(/ \| /g, ' / ')}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Budget */}
          <div className="flex flex-col items-end gap-2 min-w-[140px]">
            <div className="text-right">
              <div className="text-xs text-text-secondary mb-0.5">
                {t('budget')}
              </div>
              <div className="text-2xl font-bold text-aurora-orange">
                {budgetDisplay}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Compact layout matching OfferCard */}
        <div className="flex flex-col gap-3 sm:hidden">
          {/* Top row: Image + Budget */}
          <div className="flex gap-3">
            {/* Image - compact 80x80 like OfferCard */}
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 rounded-lg bg-bg-secondary flex items-center justify-center overflow-hidden">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt={wantedListing.game_name}
                    fill
                    className="object-contain p-1"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <Package className="w-8 h-8 text-text-muted" />
                )}
              </div>
            </div>

            {/* Budget & Expansion Badge */}
            <div className="flex-grow flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  {wantedListing.game?.is_expansion && (
                    <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                      {t('expansion')}
                    </Badge>
                  )}
                </div>
                {/* Budget */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="text-xl font-bold text-aurora-orange">
                    {budgetDisplay}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Name with BGG link */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-polar-night line-clamp-1">
              {wantedListing.game_name}
            </h3>
            <a
              href={bggGameUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-1 text-text-muted hover:text-aurora-orange transition-colors"
              title={t('viewOnBGG')}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Version Info - edition, language, publisher */}
          {(formattedEdition || wantedListing.language || wantedListing.publisher) && (
            <div className="text-sm text-text-secondary space-y-0.5">
              {formattedEdition && (
                <p className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  {formattedEdition}
                </p>
              )}
              {wantedListing.language && (
                <p className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span>{wantedListing.language.replace(/ \| /g, ' / ')}</span>
                </p>
              )}
              {wantedListing.publisher && (
                <p className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span>{wantedListing.publisher.replace(/ \| /g, ' / ')}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes Section - Collapsible like OfferCard's Condition Details */}
      {wantedListing.notes && (
        <div className="border-t border-border-subtle">
          <CollapsibleDetails
            title={t('additionalNotes')}
            icon={<Info className="w-4 h-4" />}
            isExpanded={notesExpanded}
            onToggle={() => setNotesExpanded(!notesExpanded)}
            subtitle={wantedListing.notes.slice(0, 60) + (wantedListing.notes.length > 60 ? '...' : '')}
          >
            <p className="text-sm text-text-secondary leading-relaxed">
              {wantedListing.notes}
            </p>
          </CollapsibleDetails>
        </div>
      )}

      {/* Footer: Buyer Info and Listed Date */}
      <div className="border-t border-border px-3 sm:px-4 py-3 flex items-center justify-between">
        {/* Buyer Info */}
        {wantedListing.buyer && (
          <div className="flex items-center gap-2">
            {wantedListing.buyer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- external avatar URLs
              <img
                src={wantedListing.buyer.avatar_url}
                alt={wantedListing.buyer.full_name}
                className="w-6 h-6 rounded-sm object-cover border border-border-subtle"
              />
            ) : (
              <div className="w-6 h-6 rounded-sm bg-aurora-orange/20 flex items-center justify-center text-xs font-semibold text-aurora-orange">
                {wantedListing.buyer.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-text-secondary">
              {wantedListing.buyer.full_name}
              {wantedListing.buyer.country && getCountryFlag(wantedListing.buyer.country) && (
                <span
                  className={`${getCountryFlag(wantedListing.buyer.country)} ml-1`}
                  role="img"
                  aria-label={getCountryName(wantedListing.buyer.country)}
                  title={getCountryName(wantedListing.buyer.country)}
                />
              )}
            </span>
          </div>
        )}

        {/* Listed Date */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('listed', { date: formattedDate })}</span>
        </div>
      </div>
    </div>
  );
}
