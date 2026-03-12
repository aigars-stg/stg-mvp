'use client';

import { useState, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { Card } from '@second-turn/design-system';
import { Package, Users, User as Baby, Time as Clock, PuzzlePiece as Puzzle, Delivery } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import type { AggregatedGame } from '@/lib/types/aggregated-game';
import { saveBrowseContext } from '@/lib/browse-context';
import { formatPrice } from '@/lib/services/pricing';
import { getAuctionUrgencyTier } from '@/lib/types/listing';
import { AuctionCountdown } from './AuctionCountdown';

interface AggregatedGameCardProps {
  game: AggregatedGame;
  allGameIds?: number[];
  index?: number;
}

export function AggregatedGameCard({ game, allGameIds, index }: AggregatedGameCardProps) {
  const tListings = useTranslations('Listings.card');
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = useCallback(() => {
    if (allGameIds && index !== undefined) {
      saveBrowseContext(allGameIds, index);
    }
  }, [allGameIds, index]);

  const hasNonAuction = game.instant_buy_lowest_price !== null;
  const isAuctionOnly = !hasNonAuction && game.auction_count > 0;
  const isAuctionEndedOnly = !hasNonAuction && game.auction_count === 0 && game.auction_ended_count > 0;
  const showPlus = game.offer_count > 1;
  const showExpansionIcon = game.is_expansion || game.has_bundled_expansions || game.has_expansion_listings;

  // Urgency tier for auction icon and price coloring
  const urgency = getAuctionUrgencyTier(game.auction_soonest_ends_at);
  const hasActiveAuction = game.auction_count > 0 && urgency.tier !== 'ended';

  return (
    <Link href={`/game/${game.bgg_game_id}`} className="h-full" onClick={handleClick}>
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section — clean, no overlays */}
        <div className="relative h-40 sm:h-44 lg:h-48 bg-polar-night/5 flex items-center justify-center overflow-hidden">
          {game.image || game.thumbnail ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-polar-night/10" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- external BGG image URLs */}
              <img
                src={game.image || game.thumbnail || ''}
                alt={game.game_name}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <Package className="w-16 h-16 text-text-muted" />
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Game Name */}
          <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem] mb-2">
            {game.game_name}
          </h3>

          {/* Game Metadata + Listing type icons */}
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary items-center mb-3">
            {game.player_count && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {game.player_count}
              </span>
            )}
            {game.min_age && (
              <span className="flex items-center gap-1">
                <Baby className="w-4 h-4" />
                {game.min_age}+
              </span>
            )}
            {game.playing_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {game.playing_time}
              </span>
            )}

            {/* Vertical divider + listing type icons */}
            <span className="w-px h-3.5 bg-border-subtle" />
            {game.instant_buy_count > 0 && (
              <span title={tListings('claimTooltip', { count: game.instant_buy_count })}>
                <Delivery className="w-4 h-4 text-aurora-orange" />
              </span>
            )}
            {showExpansionIcon && (
              <span title={tListings(game.has_expansion_listings ? 'expansionOffersTooltip' : 'expansionTooltip')}>
                <Puzzle className="w-4 h-4 text-text-muted" />
              </span>
            )}
          </div>

          {/* Price + Offer count — single line, pushed to bottom */}
          <div className="mt-auto flex items-baseline gap-2">
            {isAuctionOnly ? (
              <span className={`text-2xl font-bold ${urgency.priceColorClass}`}>
                {formatPrice(game.auction_lowest_price!)}{showPlus && '+'}
              </span>
            ) : isAuctionEndedOnly ? (
              <span className="text-2xl font-bold text-text-muted">
                {formatPrice(game.auction_lowest_price!)}{showPlus && '+'}
              </span>
            ) : (
              <span className="text-2xl font-bold text-polar-night">
                {formatPrice(game.instant_buy_lowest_price!)}{showPlus && '+'}
              </span>
            )}
            <span className="text-text-muted">·</span>
            <span className="text-sm text-text-secondary">
              {tListings('offers', { count: game.offer_count })}
            </span>
          </div>

          {/* Auction countdown — live-ticking for hot/critical tiers */}
          {hasActiveAuction && (
            <AuctionCountdown endsAt={game.auction_soonest_ends_at} />
          )}
          {!hasActiveAuction && game.auction_ended_count > 0 && (
            <AuctionCountdown endsAt={null} showEnded />
          )}
        </div>
      </Card>
    </Link>
  );
}
