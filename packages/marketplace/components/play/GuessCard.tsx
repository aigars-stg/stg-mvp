'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { GuessResult, NumericFeedbackResult, SetFeedbackResult } from '@/lib/play/types';
import { Users, Time as Clock, Scale, Calendar, Tag, PuzzlePiece as Puzzle } from 'griddy-icons';

interface GuessCardProps {
  guess: GuessResult;
  index: number;
}

const RESULT_STYLES = {
  correct: 'bg-teal-500 text-white',
  close: 'bg-amber-400 text-gray-900',
  partial: 'bg-amber-400 text-gray-900',
  higher: 'bg-gray-200 text-gray-700',
  lower: 'bg-gray-200 text-gray-700',
  none: 'bg-gray-200 text-gray-700',
};

const RESULT_ICONS: Record<NumericFeedbackResult | SetFeedbackResult, string> = {
  correct: '✓',
  close: '~',
  partial: '~',
  higher: '↑',
  lower: '↓',
  none: '✗',
};

/**
 * Convert BGG weight (1-5) to human-readable label
 */
function getWeightLabel(weight: number): string {
  if (weight < 1.5) return 'Light';
  if (weight < 2.5) return 'Medium-Light';
  if (weight < 3.5) return 'Medium';
  if (weight < 4.5) return 'Heavy';
  return 'Very Heavy';
}

interface AttributeRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  result: NumericFeedbackResult | SetFeedbackResult;
  suffix?: string;
}

function AttributeRow({ icon, label, value, result, suffix = '' }: AttributeRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          {value}{suffix}
        </span>
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${RESULT_STYLES[result]}`}
        >
          {RESULT_ICONS[result]}
        </span>
      </div>
    </div>
  );
}

interface SetAttributeRowProps {
  icon: React.ReactNode;
  label: string;
  items: string[];
  matched: string[];
  result: SetFeedbackResult;
}

function SetAttributeRow({ icon, label, items, matched, result }: SetAttributeRowProps) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={`inline-flex items-center justify-center px-2 h-6 rounded text-xs font-bold ${RESULT_STYLES[result]}`}
        >
          {RESULT_ICONS[result]} {matched.length}/{items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => {
          const isMatched = matched.includes(item);
          return (
            <span
              key={item}
              className={`text-xs px-2 py-0.5 rounded-full ${
                isMatched
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function GuessCard({ guess, index }: GuessCardProps) {
  const t = useTranslations('Play');
  const { feedback } = guess;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header with game info */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
          {guess.thumbnail ? (
            <Image
              src={guess.thumbnail}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
              🎲
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {guess.gameName}
          </h3>
          <p className="text-sm text-gray-500">
            {t('guessNumber', { number: index + 1 })}
          </p>
        </div>
      </div>

      {/* Attributes */}
      <div className="p-4">
        <AttributeRow
          icon={<Calendar className="w-4 h-4" />}
          label={t('columnYear')}
          value={feedback.year.value}
          result={feedback.year.result}
        />
        <AttributeRow
          icon={<Users className="w-4 h-4" />}
          label={t('columnPlayers')}
          value={feedback.players.value}
          result={feedback.players.result}
        />
        <AttributeRow
          icon={<Scale className="w-4 h-4" />}
          label={t('columnWeight')}
          value={`${getWeightLabel(feedback.weight.value)} (${feedback.weight.value.toFixed(1)})`}
          result={feedback.weight.result}
        />
        <AttributeRow
          icon={<Clock className="w-4 h-4" />}
          label={t('columnTime')}
          value={feedback.playTime.value}
          result={feedback.playTime.result}
          suffix=" min"
        />
        <SetAttributeRow
          icon={<Tag className="w-4 h-4" />}
          label={t('columnCategory')}
          items={feedback.categories.value}
          matched={feedback.categories.matched}
          result={feedback.categories.result}
        />
        <SetAttributeRow
          icon={<Puzzle className="w-4 h-4" />}
          label={t('columnMechanic')}
          items={feedback.mechanics.value}
          matched={feedback.mechanics.matched}
          result={feedback.mechanics.result}
        />
      </div>
    </div>
  );
}
