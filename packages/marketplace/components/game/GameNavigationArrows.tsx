'use client';

import { ChevronLeft, ChevronRight } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface GameNavigationArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function GameNavigationArrows({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: GameNavigationArrowsProps) {
  const t = useTranslations('Game.NavigationArrows');

  return (
    <>
      {/* Left Arrow - Previous game */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+12px)]
                   hidden lg:flex items-center justify-center
                   w-12 h-12 rounded-full bg-snow-white border-2 border-border
                   hover:border-frost-ice hover:bg-frost-ice/5
                   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-snow-white
                   transition-all shadow-lg z-10"
        aria-label={t('previousGame')}
      >
        <ChevronLeft className="w-6 h-6 text-polar-night" />
      </button>

      {/* Right Arrow - Next game */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+12px)]
                   hidden lg:flex items-center justify-center
                   w-12 h-12 rounded-full bg-snow-white border-2 border-border
                   hover:border-frost-ice hover:bg-frost-ice/5
                   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-snow-white
                   transition-all shadow-lg z-10"
        aria-label={t('nextGame')}
      >
        <ChevronRight className="w-6 h-6 text-polar-night" />
      </button>
    </>
  );
}
