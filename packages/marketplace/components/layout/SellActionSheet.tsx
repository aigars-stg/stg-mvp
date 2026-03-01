'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@second-turn/design-system';
import { useRouter } from '@/i18n/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { Package, Search, Close } from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from 'next-intl';

interface SellActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SellActionSheet({ isOpen, onClose }: SellActionSheetProps) {
  const router = useRouter();
  const loader = useTopLoader();
  const { user } = useAuth();
  const t = useTranslations('Navigation.sellActionSheet');
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, sheetRef, onClose);

  const handleSellGame = () => {
    onClose();
    loader.start();
    router.push(!user ? '/auth/signin?redirect=/sell' : '/sell');
  };

  const handlePostWanted = () => {
    onClose();
    loader.start();
    router.push(!user ? '/auth/signin?redirect=/wanted/new' : '/wanted/new');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-snow-white rounded-t-2xl shadow-xl animate-in slide-in-from-bottom-full duration-300"
        style={{
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-polar-night">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
            aria-label="Close"
          >
            <Close className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Action Options */}
        <div className="p-4 space-y-3">
          {/* Sell a Game */}
          <button
            onClick={handleSellGame}
            className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-frost-ice hover:bg-frost-ice/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-frost-ice/10 group-hover:bg-frost-ice/20 flex items-center justify-center flex-shrink-0 transition-colors">
              <Package className="w-6 h-6 text-frost-ice" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-polar-night group-hover:text-frost-ice transition-colors">
                {t('sellGame')}
              </div>
              <div className="text-sm text-text-secondary">
                {t('sellGameDescription')}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-text-muted group-hover:text-frost-ice transition-colors"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Post Wanted Game */}
          <button
            onClick={handlePostWanted}
            className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-border hover:border-aurora-orange hover:bg-aurora-orange/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-aurora-orange/10 group-hover:bg-aurora-orange/20 flex items-center justify-center flex-shrink-0 transition-colors">
              <Search className="w-6 h-6 text-aurora-orange" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-polar-night group-hover:text-aurora-orange transition-colors">
                {t('postWantedGame')}
              </div>
              <div className="text-sm text-text-secondary">
                {t('postWantedGameDescription')}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-text-muted group-hover:text-aurora-orange transition-colors"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
