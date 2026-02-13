'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight, ArrowRight } from '@/lib/icons';
import { AggregatedGameCard } from '@/components/browse';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import type { AggregatedGame } from '@/lib/types/aggregated-game';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';

export function HomepageBrowse() {
  const t = useTranslations('HomePage.collections');

  const [games, setGames] = useState<AggregatedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    async function fetchGames() {
      try {
        const response = await fetch('/api/games?limit=8&sort=newest');
        if (!response.ok) throw new Error('Failed to fetch games');
        const data = await response.json();
        setGames(data.games || []);
      } catch (err) {
        console.error('Error fetching games:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  // Check scroll state
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [games]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 260 * 2;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const gameIds = useMemo(() => games.map(g => g.bgg_game_id), [games]);

  if (!loading && games.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-polar-night">
            {loading ? (
              <span className="inline-block w-48 h-8 bg-bg-elevated rounded animate-pulse" />
            ) : (
              t('recently_listed.title')
            )}
          </h2>

          {!loading && (
            <Link
              href="/browse?sort=newest"
              className="hidden sm:flex items-center gap-1 text-frost-ice hover:text-frost-polar transition-colors font-medium"
            >
              {t('viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Scrollable Container */}
        <div className="relative group">
          {/* Scroll Buttons */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-snow-white border border-border rounded-full shadow-lg flex items-center justify-center text-polar-night hover:bg-bg-secondary transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-snow-white border border-border rounded-full shadow-lg flex items-center justify-center text-polar-night hover:bg-bg-secondary transition-all opacity-0 group-hover:opacity-100 translate-x-1/2"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Cards Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[260px] snap-start">
                    <ListingCardSkeleton />
                  </div>
                ))
              : games.map((game, index) => (
                  <div key={game.bgg_game_id} className="flex-shrink-0 w-[260px] snap-start">
                    <AggregatedGameCard
                      game={game}
                      allGameIds={gameIds}
                      index={index}
                    />
                  </div>
                ))
            }
          </div>
        </div>

        {/* Mobile View All */}
        {!loading && (
          <div className="mt-6 text-center sm:hidden">
            <Link href="/browse?sort=newest">
              <Button variant="secondary">
                {t('viewAll')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
