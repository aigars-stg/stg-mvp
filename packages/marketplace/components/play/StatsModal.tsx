'use client';

import { useTranslations } from 'next-intl';
import { getWinPercentage, getAverageGuesses } from '@/lib/play/storage';
import type { PlayStats } from '@/lib/play/types';
import { X } from 'griddy-icons';

interface StatsModalProps {
  stats: PlayStats;
  onClose: () => void;
}

export function StatsModal({ stats, onClose }: StatsModalProps) {
  const t = useTranslations('Play');

  const winPercent = getWinPercentage(stats);
  const avgGuesses = getAverageGuesses(stats);
  const maxDistribution = Math.max(...stats.distribution, 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('statsTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.played}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('statPlayed')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{winPercent}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('statWinRate')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.currentStreak}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('statCurrentStreak')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.maxStreak}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('statMaxStreak')}</p>
          </div>
        </div>

        {/* Average Guesses */}
        {stats.won > 0 && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('averageGuesses')}: <span className="font-semibold">{avgGuesses}</span>
            </p>
          </div>
        )}

        {/* Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('guessDistribution')}
          </h3>
          {stats.distribution.map((count, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-4 text-sm text-gray-600 dark:text-gray-400">{index + 1}</span>
              <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-500"
                  style={{
                    width: `${(count / maxDistribution) * 100}%`,
                    minWidth: count > 0 ? '20px' : '0',
                  }}
                />
              </div>
              <span className="w-8 text-sm text-gray-600 dark:text-gray-400 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
