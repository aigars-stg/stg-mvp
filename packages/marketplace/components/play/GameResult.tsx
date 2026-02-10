'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { shareResults } from '@/lib/play/share';
import type { PuzzleState } from '@/lib/play/types';
import { ArrowUpRight as ShareIcon, Check, X } from 'griddy-icons';

interface GameResultProps {
  puzzleNumber: number;
  puzzle: PuzzleState;
}

export function GameResult({ puzzleNumber, puzzle }: GameResultProps) {
  const t = useTranslations('Play');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'failed'>('idle');

  // Handle share
  const handleShare = async () => {
    const result = await shareResults(puzzleNumber, puzzle);

    if (result.success) {
      setShareStatus(result.method === 'native' ? 'shared' : 'copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } else {
      setShareStatus('failed');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {/* Come back tomorrow - Prominent */}
      <p className="text-lg font-medium text-gray-900 text-center">
        {t('comeBackTomorrow')}
      </p>

      {/* Share Icon Button */}
      <button
        onClick={handleShare}
        disabled={shareStatus !== 'idle'}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title={t('shareResults')}
      >
        {shareStatus === 'idle' && (
          <>
            <ShareIcon size={18} />
            <span>{t('shareResults')}</span>
          </>
        )}
        {shareStatus === 'copied' && (
          <>
            <Check size={18} className="text-teal-500" />
            <span>{t('copiedToClipboard')}</span>
          </>
        )}
        {shareStatus === 'shared' && (
          <>
            <Check size={18} className="text-teal-500" />
            <span>{t('shared')}</span>
          </>
        )}
        {shareStatus === 'failed' && (
          <>
            <X size={18} className="text-red-500" />
            <span>{t('shareFailed')}</span>
          </>
        )}
      </button>
    </div>
  );
}
