'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { NumericFeedbackResult, SetFeedbackResult } from '@/lib/play/types';

interface NumericFeedbackCellProps {
  type: 'numeric';
  value: string | number;
  result: NumericFeedbackResult;
  suffix?: string;
}

interface WeightFeedbackCellProps {
  type: 'weight';
  value: number;
  result: NumericFeedbackResult;
}

interface SetFeedbackCellProps {
  type: 'set';
  result: SetFeedbackResult;
  matched: string[];
  total: string[];
}

type FeedbackCellProps = NumericFeedbackCellProps | WeightFeedbackCellProps | SetFeedbackCellProps;

const RESULT_STYLES = {
  correct: 'bg-teal-500 text-white',
  close: 'bg-amber-400 text-gray-900',
  partial: 'bg-amber-400 text-gray-900',
  higher: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
  lower: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
  none: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
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
 * BGG Scale: 1 = Light, 5 = Heavy
 */
function getWeightLabel(weight: number): string {
  if (weight < 1.5) return 'Light';
  if (weight < 2.5) return 'Medium-Light';
  if (weight < 3.5) return 'Medium';
  if (weight < 4.5) return 'Heavy';
  return 'Very Heavy';
}

/**
 * Get short weight label for compact display
 */
function getWeightLabelShort(weight: number): string {
  if (weight < 1.5) return 'Lt';
  if (weight < 2.5) return 'M-Lt';
  if (weight < 3.5) return 'Med';
  if (weight < 4.5) return 'Hvy';
  return 'V.Hvy';
}

export function FeedbackCell(props: FeedbackCellProps) {
  const t = useTranslations('Play');
  const [showTooltip, setShowTooltip] = useState(false);

  // Numeric cell (year, players, time)
  if (props.type === 'numeric') {
    const { value, result, suffix = '' } = props;

    return (
      <div
        className={`relative flex items-center justify-center min-w-[48px] h-10 rounded-md text-xs font-medium ${RESULT_STYLES[result]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="flex items-center gap-0.5">
          {result === 'higher' && <span className="text-[10px]">↑</span>}
          {result === 'lower' && <span className="text-[10px]">↓</span>}
          <span>
            {value}
            {suffix}
          </span>
        </span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
            {result === 'correct' && t('feedbackCorrect')}
            {result === 'close' && t('feedbackClose')}
            {result === 'higher' && t('feedbackHigher')}
            {result === 'lower' && t('feedbackLower')}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  // Weight cell with human-readable label
  if (props.type === 'weight') {
    const { value, result } = props;
    const label = getWeightLabel(value);
    const shortLabel = getWeightLabelShort(value);

    return (
      <div
        className={`relative flex items-center justify-center min-w-[56px] h-10 rounded-md text-xs font-medium ${RESULT_STYLES[result]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="flex items-center gap-0.5">
          {result === 'higher' && <span className="text-[10px]">↑</span>}
          {result === 'lower' && <span className="text-[10px]">↓</span>}
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </span>

        {/* Tooltip with numeric value */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
            <div>{label} ({value.toFixed(1)}/5)</div>
            <div className="text-gray-400 text-[10px] mt-0.5">
              {result === 'correct' && t('feedbackCorrect')}
              {result === 'close' && t('feedbackClose')}
              {result === 'higher' && t('feedbackHigher')}
              {result === 'lower' && t('feedbackLower')}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  // Set type (categories/mechanics) - show matched items directly
  const { result, matched, total } = props;

  // Show first matched item or count
  const displayText =
    matched.length > 0
      ? matched.length === 1
        ? matched[0].slice(0, 12) + (matched[0].length > 12 ? '…' : '')
        : `${matched[0].slice(0, 8)}… +${matched.length - 1}`
      : `0/${total.length}`;

  return (
    <div
      className={`relative flex items-center justify-center min-w-[70px] h-10 px-1 rounded-md text-xs font-medium ${RESULT_STYLES[result]}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="flex items-center gap-0.5 truncate">
        <span className="text-[10px] flex-shrink-0">{RESULT_ICONS[result]}</span>
        <span className="truncate">{displayText}</span>
      </span>

      {/* Tooltip showing all items */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded z-10 min-w-[180px] max-w-[280px]">
          {result === 'correct' && (
            <p className="text-teal-400 font-medium mb-1">{t('feedbackCorrect')}</p>
          )}
          {result === 'partial' && (
            <p className="text-amber-400 font-medium mb-1">{t('feedbackPartial')}</p>
          )}
          {result === 'none' && (
            <p className="text-gray-400 font-medium mb-1">{t('feedbackNone')}</p>
          )}

          {matched.length > 0 && (
            <div className="mb-2">
              <span className="text-gray-400">{t('matched')}: </span>
              <span className="text-teal-300">{matched.join(', ')}</span>
            </div>
          )}

          <div className="text-gray-400 text-[10px] border-t border-gray-700 pt-1 mt-1">
            <span className="text-gray-500">{t('guessed')}: </span>
            {total.join(', ')}
          </div>

          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
