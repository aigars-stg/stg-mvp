'use client';

import { useState, useEffect, useCallback } from 'react';
import { SwipeCard } from './SwipeCard';
import type { CardStackProps } from './types';
import type { Game } from '@/lib/mock-data';

export function CardStack({
  games,
  onSwipe,
  onCardTap,
  onStackEmpty,
  maxCards = 5,
}: CardStackProps) {
  const [currentGames, setCurrentGames] = useState<Game[]>(games.slice(0, maxCards));
  const [, setRemovingCardId] = useState<string | null>(null);

  // Update games when prop changes
  useEffect(() => {
    setCurrentGames(games.slice(0, maxCards));
  }, [games, maxCards]);

  const handleSwipe = useCallback(
    (direction: 'left' | 'right', gameId: string) => {
      const swipedGame = currentGames.find((g) => g.id === gameId);
      if (!swipedGame) return;

      setRemovingCardId(gameId);

      // Call the onSwipe callback
      onSwipe?.(direction, swipedGame);

      // Remove card after animation completes
      setTimeout(() => {
        setCurrentGames((prev) => {
          const updated = prev.filter((g) => g.id !== gameId);

          // Check if we need to load more cards
          const remainingIndex = games.findIndex((g) => g.id === gameId);
          if (remainingIndex !== -1 && remainingIndex + maxCards < games.length) {
            const nextGame = games[remainingIndex + maxCards];
            if (nextGame) {
              updated.push(nextGame);
            }
          }

          // Check if stack is empty
          if (updated.length === 0) {
            onStackEmpty?.();
          }

          return updated;
        });

        setRemovingCardId(null);
      }, 400); // Match transition duration
    },
    [currentGames, games, maxCards, onSwipe, onStackEmpty]
  );

  const handleCardTap = useCallback(
    (game: Game) => {
      onCardTap?.(game);
    },
    [onCardTap]
  );

  if (currentGames.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-polar-night mb-2">
          You&apos;ve seen all featured games!
        </h3>
        <p className="text-text-secondary">
          Check out the full catalog below
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[405px] h-[635px] sm:h-[635px] h-[550px] mx-auto overflow-visible">
      {/* Swipe Hint - shown on first load */}
      <SwipeHint />

      {/* Card Stack */}
      {currentGames.map((game, index) => (
        <SwipeCard
          key={game.id}
          game={game}
          index={index}
          totalCards={currentGames.length}
          onSwipe={handleSwipe}
          onTap={handleCardTap}
        />
      ))}
    </div>
  );
}

// Swipe Hint Component
function SwipeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('hasSeenSwipeHint');

    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShow(true);

        // Hide after 3 seconds
        const hideTimer = setTimeout(() => {
          setShow(false);
          localStorage.setItem('hasSeenSwipeHint', 'true');
        }, 3000);

        return () => clearTimeout(hideTimer);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[200] animate-fade-in-out">
      <div className="inline-flex items-center gap-4 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg text-white font-semibold text-lg">
        <span className="animate-swipe-left text-2xl">←</span>
        <span>Swipe left or right</span>
        <span className="animate-swipe-right text-2xl">→</span>
      </div>
    </div>
  );
}
