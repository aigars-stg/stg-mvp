'use client';

import { Button, Badge } from '@second-turn/design-system';
import { Close } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
  activeFiltersCount: number;
  children: React.ReactNode;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  onClearAll,
  activeFiltersCount,
  children,
}: MobileFilterDrawerProps) {
  const t = useTranslations('Browse');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 bg-snow-white rounded-t-2xl shadow-xl z-50 max-h-[85vh] flex flex-col lg:hidden animate-in slide-in-from-bottom-full duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-polar-night">{t('filters.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <Close className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Filter Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>

        {/* Footer - Action Buttons */}
        <div className="border-t border-border-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-bg-elevated">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClearAll}
              className="flex-1"
              disabled={activeFiltersCount === 0}
            >
              {t('filters.clearAll')}
            </Button>
            <Button
              variant="primary"
              onClick={onClose}
              className="flex-1"
            >
              {t('filters.applyFilters')}
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-2 bg-snow-white text-frost-ice">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
