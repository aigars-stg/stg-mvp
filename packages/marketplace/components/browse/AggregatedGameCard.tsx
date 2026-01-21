'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, Badge } from '@second-turn/design-system';
import { Package, Users, User as Baby, Time as Clock, PuzzlePiece as Puzzle, Tag as Gavel } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import type { AggregatedGame } from '@/lib/types/aggregated-game';
import { saveBrowseContext } from '@/lib/browse-context';

interface AggregatedGameCardProps {
  game: AggregatedGame;
  allGameIds?: number[];
  index?: number;
}

export function AggregatedGameCard({ game, allGameIds, index }: AggregatedGameCardProps) {
  const tListings = useTranslations('Listings.card');
  const tPrice = useTranslations('OfferCard.price');
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = useCallback(() => {
    if (allGameIds && index !== undefined) {
      saveBrowseContext(allGameIds, index);
    }
  }, [allGameIds, index]);

  return (
    <Link href={`/game/${game.bgg_game_id}`} className="h-full" onClick={handleClick}>
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <div className="relative h-48 sm:h-56 lg:h-64 bg-polar-night/5 flex items-center justify-center overflow-hidden">
          {game.image || game.thumbnail ? (
            <>
              {/* Loading placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 animate-pulse bg-polar-night/10" />
              )}
              <img
                src={game.image || game.thumbnail || ''}
                alt={game.game_name}
                className={`max-w-full max-h-full object-contain p-4 transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <Package className="w-16 h-16 text-text-muted" />
          )}

          {/* Expansion Badge */}
          {game.is_expansion && (
            <div className="absolute top-3 left-3">
              <Badge variant="default" size="sm" icon={<Puzzle className="w-3 h-3" />}>
                {tListings('expansion')}
              </Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Game Name */}
          <h3 className="font-bold text-lg text-polar-night line-clamp-2 min-h-[2.5rem] mb-2">
            {game.game_name}
          </h3>

          {/* Game Metadata */}
          {(game.player_count || game.min_age || game.playing_time) && (
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
            </div>
          )}

          {/* Price + Auction Badge */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-text-secondary">{tPrice('from')}</span>
                <span className={`text-2xl font-bold ${game.has_auction ? 'text-aurora-purple' : 'text-polar-night'}`}>
                  €{game.lowest_price.toFixed(2)}
                </span>
              </div>
              {game.has_auction && (
                <Badge variant="outline" size="sm" icon={<Gavel className="w-3 h-3" />} className="border-aurora-purple/50 text-aurora-purple">
                  {tListings('auction')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
