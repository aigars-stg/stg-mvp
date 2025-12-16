'use client';

import Link from 'next/link';
import { Card, Badge } from '@second-turn/design-system';
import { Package, Users, Baby, Clock } from 'lucide-react';
import type { AggregatedGame } from '@/lib/types/aggregated-game';

interface AggregatedGameCardProps {
  game: AggregatedGame;
}

export function AggregatedGameCard({ game }: AggregatedGameCardProps) {
  return (
    <Link href={`/game/${game.bgg_game_id}`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
        <div className="relative h-48 sm:h-56 lg:h-64 bg-polar-night/5 flex items-center justify-center overflow-hidden">
          {game.image || game.thumbnail ? (
            <img
              src={game.image || game.thumbnail || ''}
              alt={game.game_name}
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : (
            <Package className="w-16 h-16 text-text-muted" />
          )}

          {/* Expansion Badge */}
          {game.is_expansion && (
            <div className="absolute top-3 left-3">
              <Badge variant="warning" size="sm">
                Expansion
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

          {/* Price */}
          <div className="mt-auto">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-text-secondary">From</span>
              <span className="text-2xl font-bold text-polar-night">
                €{game.lowest_price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
