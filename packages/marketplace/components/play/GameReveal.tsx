'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { TargetGame } from '@/lib/play/types';
import Image from 'next/image';

interface GameRevealProps {
  answer: TargetGame;
  won: boolean;
  guessCount: number;
  onDismiss: () => void;
}

export function GameReveal({ answer, won, guessCount, onDismiss }: GameRevealProps) {
  const t = useTranslations('Play');

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Result message */}
        <div className="mb-4">
          {won ? (
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {t('youWon', { count: guessCount })}
            </p>
          ) : (
            <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
              {t('youLost')}
            </p>
          )}
        </div>

        {/* Game Image */}
        <div className="mb-4">
          {answer.image ? (
            <Image
              src={answer.image}
              alt={answer.name}
              width={200}
              height={200}
              className="w-48 h-48 object-contain mx-auto rounded-lg"
              unoptimized
            />
          ) : answer.thumbnail ? (
            <Image
              src={answer.thumbnail}
              alt={answer.name}
              width={200}
              height={200}
              className="w-48 h-48 object-contain mx-auto rounded-lg"
              unoptimized
            />
          ) : (
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto flex items-center justify-center text-gray-400">
              ?
            </div>
          )}
        </div>

        {/* Game Name */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {answer.name}
        </h2>

        {/* Game Details */}
        <p className="text-gray-500 dark:text-gray-400">
          {answer.yearPublished} · {answer.playerCount} {t('players')}
        </p>

        {/* Tap to dismiss hint */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          {t('tapToDismiss')}
        </p>
      </div>
    </div>
  );
}
