'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@second-turn/design-system';
import { useSwipeGesture } from './useSwipeGesture';
import type { SwipeCardProps } from './types';
import { getLanguageFlag } from '@/lib/bgg-utils';

const conditionConfig = {
  likeNew: { label: '📦 Like New', variant: 'default' as const },
  veryGood: { label: '✨ Very Good', variant: 'success' as const },
  good: { label: '🎲 Good', variant: 'warning' as const },
  acceptable: { label: '🔧 Acceptable', variant: 'default' as const },
  forParts: { label: '🔩 For Parts', variant: 'error' as const },
};

// Card rotation and scale values for each position in stack
const stackPositions = [
  { rotation: -1, scale: 1, tx: 0, ty: 0, opacity: 1 },
  { rotation: -6, scale: 0.97, tx: 0, ty: 0, opacity: 1 },
  { rotation: 4, scale: 0.94, tx: 0, ty: 0, opacity: 1 },
  { rotation: -7, scale: 0.91, tx: 0, ty: 0, opacity: 1 },
  { rotation: 3, scale: 0.88, tx: 0, ty: 0, opacity: 1 },
];

export function SwipeCard({ game, index, totalCards, onSwipe, onTap }: SwipeCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const conditionInfo = conditionConfig[game.condition];
  const isTopCard = index === 0;
  const stackPosition = stackPositions[Math.min(index, stackPositions.length - 1)];

  const handleSwipe = (direction: 'left' | 'right') => {
    setIsExiting(true);
    setExitDirection(direction);
    onSwipe(direction, game.id);
  };

  const handleTap = () => {
    onTap(game);
  };

  const { bind, style, isActive, isDragging } = useSwipeGesture({
    onSwipe: handleSwipe,
    onTap: handleTap,
    index,
    disabled: !isTopCard,
  });

  // Calculate final transform based on gesture or exit animation
  const getTransform = () => {
    if (isExiting && exitDirection) {
      // Exit animation - fly off screen
      const finalX = exitDirection === 'right' ? 1000 : -1000;
      const finalRotation = exitDirection === 'right' ? 45 : -45;
      return `translate(-50%, -50%) translate(${finalX}px, ${style.y}px) rotate(${finalRotation}deg) scale(1)`;
    }

    if (isDragging) {
      // Active dragging
      return `translate(-50%, -50%) translate(${style.x}px, ${style.y}px) rotate(${style.rotation}deg) scale(${style.scale})`;
    }

    // Stacked position
    return `translate(-50%, -50%) translate(${stackPosition.tx}px, ${stackPosition.ty}px) rotate(${stackPosition.rotation}deg) scale(${stackPosition.scale})`;
  };

  return (
    <div
      {...(isTopCard ? bind() : {})}
      className={`
        absolute left-1/2 top-1/2
        w-[min(315px,75vw)] h-[min(544.5px,130vw)]
        bg-white rounded-xl shadow-lg
        touch-none select-none
        ${isTopCard ? 'cursor-grab' : 'pointer-events-none'}
        ${isActive ? 'cursor-grabbing' : ''}
        ${isDragging ? '' : 'transition-all duration-400 ease-out'}
        ${isExiting ? 'transition-all duration-400 ease-in-out' : ''}
      `}
      style={{
        transform: getTransform(),
        opacity: isExiting ? 0 : (isDragging ? style.opacity : stackPosition.opacity),
        zIndex: 10 - index,
        transformOrigin: 'center center',
      }}
    >
      {/* Card Content */}
      <div className="h-full flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[3/4] bg-polar-nightDark/5 rounded-t-xl overflow-hidden">
          {/* Placeholder for image */}
          <div className="absolute inset-0 flex items-center justify-center text-polar-nightDark/20">
            <div className="text-center">
              <div className="text-4xl mb-2">🎲</div>
              <div className="text-xs px-4">{game.title}</div>
            </div>
          </div>

          {/* Condition Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={conditionInfo.variant} size="sm">
              {conditionInfo.label}
            </Badge>
          </div>

          {/* Language Badge */}
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
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col p-4">
          {/* Title and Meta */}
          <h3 className="text-lg font-semibold text-polar-night line-clamp-2 mb-1">
            {game.title}
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            {game.publisher || game.designer} • {game.yearPublished || game.year}
          </p>

          {/* Game Details */}
          <div className="flex items-center gap-3 text-xs text-text-muted mb-4">
            <span>👥 {game.playerCount}</span>
            <span>⏱️ {game.playingTime}m</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Seller Info */}
          <div className="mb-3 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-frost-ice/20 flex items-center justify-center text-xs font-semibold text-frost-ice">
                {game.seller.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-polar-night truncate">
                    {game.seller.username}
                  </span>
                  {game.seller.verified && (
                    <span className="text-frost-ice flex-shrink-0" title="Verified Seller">
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary flex items-center gap-1">
                  <span>⭐</span>
                  <span>{game.seller.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing and Action Hint */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-polar-night">€{game.price}</div>
              <div className="text-xs text-text-secondary">+€{game.shipping} shipping</div>
            </div>
            <div className="text-xs text-text-muted text-right leading-tight">
              Tap to view<br />Swipe to skip
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
