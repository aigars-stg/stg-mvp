'use client';

import { useTranslations } from 'next-intl';
import { X } from 'griddy-icons';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const t = useTranslations('Play.help');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Introduction */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">{t('description')}</p>

        {/* Rules */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('howToPlay')}</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>{t('rule1')}</li>
            <li>{t('rule2')}</li>
            <li>{t('rule3')}</li>
          </ul>
        </div>

        {/* Feedback Legend */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('feedbackLegend')}</h3>

          {/* Correct */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-teal-500 flex items-center justify-center text-white font-medium">
              ✓
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('legendCorrect')}</p>
          </div>

          {/* Close/Partial */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-400 flex items-center justify-center text-gray-900 font-medium">
              ~
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('legendClose')}</p>
          </div>

          {/* Higher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-medium">
              ↑
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('legendHigher')}</p>
          </div>

          {/* Lower */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-medium">
              ↓
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('legendLower')}</p>
          </div>

          {/* None */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-medium">
              ✗
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('legendNone')}</p>
          </div>
        </div>

        {/* Attributes Explained */}
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('attributesTitle')}</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrYear')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrYearDesc')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrPlayers')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrPlayersDesc')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrWeight')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrWeightDesc')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrTime')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrTimeDesc')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrCategory')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrCategoryDesc')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-800 dark:text-gray-200">{t('attrMechanic')}</dt>
              <dd className="text-gray-600 dark:text-gray-400">{t('attrMechanicDesc')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
