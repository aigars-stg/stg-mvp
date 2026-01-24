'use client';

import { useTranslations } from 'next-intl';
import { FeedbackCell } from './FeedbackCell';
import type { GuessResult } from '@/lib/play/types';
import Image from 'next/image';

interface FeedbackGridProps {
  guesses: GuessResult[];
}

export function FeedbackGrid({ guesses }: FeedbackGridProps) {
  const t = useTranslations('Play');

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <th className="px-2 py-2 text-left font-medium">{t('columnGame')}</th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnYear')}</span>
              <span className="sm:hidden">YR</span>
            </th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnPlayers')}</span>
              <span className="sm:hidden">PL</span>
            </th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnWeight')}</span>
              <span className="sm:hidden">WT</span>
            </th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnTime')}</span>
              <span className="sm:hidden">TM</span>
            </th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnCategory')}</span>
              <span className="sm:hidden">CAT</span>
            </th>
            <th className="px-2 py-2 text-center font-medium w-14">
              <span className="hidden sm:inline">{t('columnMechanic')}</span>
              <span className="sm:hidden">MCH</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {guesses.map((guess, index) => (
            <tr
              key={`${guess.gameId}-${index}`}
              className="animate-in fade-in slide-in-from-top-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Game Name & Thumbnail */}
              <td className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                    {guess.thumbnail ? (
                      <Image
                        src={guess.thumbnail}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        ?
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[180px]">
                    {guess.gameName}
                  </span>
                </div>
              </td>

              {/* Year */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="numeric"
                  value={guess.feedback.year.value}
                  result={guess.feedback.year.result}
                />
              </td>

              {/* Players */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="numeric"
                  value={guess.feedback.players.value}
                  result={guess.feedback.players.result}
                />
              </td>

              {/* Weight */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="weight"
                  value={guess.feedback.weight.value}
                  result={guess.feedback.weight.result}
                />
              </td>

              {/* Play Time */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="numeric"
                  value={guess.feedback.playTime.value}
                  result={guess.feedback.playTime.result}
                  suffix="m"
                />
              </td>

              {/* Categories */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="set"
                  result={guess.feedback.categories.result}
                  matched={guess.feedback.categories.matched}
                  total={guess.feedback.categories.value}
                />
              </td>

              {/* Mechanics */}
              <td className="px-1 py-2">
                <FeedbackCell
                  type="set"
                  result={guess.feedback.mechanics.result}
                  matched={guess.feedback.mechanics.matched}
                  total={guess.feedback.mechanics.value}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
