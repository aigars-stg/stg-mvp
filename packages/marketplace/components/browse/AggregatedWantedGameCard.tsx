'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Card } from '@second-turn/design-system';
import { Package, Users, User as Baby, Time as Clock } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import type { AggregatedWantedGame } from '@/lib/types/wanted-listing';
import { formatPrice } from '@/lib/services/pricing';

interface AggregatedWantedGameCardProps {
  game: AggregatedWantedGame;
}

export function AggregatedWantedGameCard({ game }: AggregatedWantedGameCardProps) {
  const t = useTranslations('Wanted.ListingCard');
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link href={`/game/${game.bgg_game_id}#wanted`} className="h-full">
      <Card
        variant="interactive"
        padding="none"
        className="overflow-hidden h-full flex flex-col"
      >
        {/* Image Section */}
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

          {/* WANTED Badge */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-aurora-orange backdrop-blur-sm rounded-md text-xs text-snow-white font-bold uppercase tracking-wide shadow-lg">
            {t('wantedBadge')}
          </div>
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

          {/* Budget + Wanted count — pushed to bottom */}
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-2xl font-bold text-aurora-orange">
              {t('upTo', { price: formatPrice(game.budget_max) })}
            </span>
            <span className="text-text-muted">&middot;</span>
            <span className="text-sm text-text-secondary">
              {t('wantedCount', { count: game.wanted_count })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
