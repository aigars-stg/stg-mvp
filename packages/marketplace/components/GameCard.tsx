import Link from 'next/link';
import { Card, Badge } from '@second-turn/design-system';
import type { Game } from '@/lib/mock-data';
import { getLanguageFlag } from '@/lib/bgg-utils';

interface GameCardProps {
  game: Game;
}

const conditionConfig = {
  likeNew: { label: '📦 Like New', variant: 'info' as const },
  veryGood: { label: '✨ Very Good', variant: 'success' as const },
  good: { label: '🎲 Good', variant: 'warning' as const },
  acceptable: { label: '🔧 Acceptable', variant: 'default' as const },
};

export function GameCard({ game }: GameCardProps) {
  const conditionInfo = conditionConfig[game.condition];

  return (
    <Link href={`/games/${game.id}`}>
      <Card
        variant="interactive"
        className="h-full flex flex-col transition-all duration-200 hover:scale-[1.02]"
      >
        {/* Image Section */}
        <div className="relative aspect-[3/4] bg-polar-nightDark/5 rounded-t-lg overflow-hidden">
          {/* Placeholder for image */}
          <div className="absolute inset-0 flex items-center justify-center text-polar-nightDark/20">
            <div className="text-center">
              <div className="text-4xl mb-2">🎲</div>
              <div className="text-xs">{game.title}</div>
            </div>
          </div>

          {/* Condition Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={conditionInfo.variant} size="sm">
              {conditionInfo.label}
            </Badge>
          </div>

          {/* Language Badge - Below condition */}
          {game.language && (
            <div className="absolute top-[4.5rem] left-3">
              <Badge
                variant="default"
                size="sm"
                className="bg-snow-white/95 backdrop-blur-sm border border-border-subtle"
              >
                <span className="mr-1">{getLanguageFlag(game.language)}</span>
                {game.language}
              </Badge>
            </div>
          )}

          {/* Wishlist Heart - Larger touch target on mobile */}
          <button
            className="absolute top-2 right-2 sm:top-3 sm:right-3 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-snow-white/90 hover:bg-snow-white flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.preventDefault();
              // Handle wishlist toggle
            }}
            aria-label="Add to wishlist"
          >
            <span className="text-xl sm:text-lg">🤍</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-3 sm:p-4">
          {/* Title and Meta */}
          <h3 className="text-base sm:text-lg font-semibold text-polar-night line-clamp-2 mb-1">
            {game.title}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3">
            {game.publisher || game.designer} • {game.yearPublished || game.year}
          </p>

          {/* Game Details */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-text-muted mb-3 sm:mb-4">
            <span>👥 {game.playerCount}</span>
            <span>⏱️ {game.playingTime}m</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pricing and Seller */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-polar-night">
                €{game.price}
              </div>
              <div className="text-xs text-text-secondary">
                +€{game.shipping} shipping
              </div>
            </div>

            {/* Seller Info */}
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end mb-1">
                <span className="text-xs sm:text-sm font-medium text-polar-night truncate max-w-[80px] sm:max-w-none">
                  {game.seller.username}
                </span>
                {game.seller.verified && (
                  <span className="text-frost-ice flex-shrink-0" title="Verified Seller">✓</span>
                )}
              </div>
              <div className="text-xs text-text-secondary flex items-center gap-1 justify-end">
                <span>⭐</span>
                <span>{game.seller.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-subtle text-xs text-text-secondary">
            📍 {game.location}
          </div>
        </div>
      </Card>
    </Link>
  );
}
