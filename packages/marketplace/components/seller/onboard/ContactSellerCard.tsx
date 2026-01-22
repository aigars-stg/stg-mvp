'use client';

import { Button } from '@second-turn/design-system';
import { Chat as MessageSquare } from 'griddy-icons';
import { useTranslations } from 'next-intl';

interface ContactSellerCardProps {
  onSelect: () => void;
  loading?: boolean;
  isPrimaryOption?: boolean;
}

export function ContactSellerCard({ onSelect, loading, isPrimaryOption }: ContactSellerCardProps) {
  const t = useTranslations('SellerOnboard.step2.contactSeller');

  return (
    <div className={`border rounded-lg p-4 sm:p-6 transition-colors ${
      isPrimaryOption
        ? 'border-frost-ice/50 hover:border-frost-ice'
        : 'border-border hover:border-text-secondary/30'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isPrimaryOption ? 'bg-frost-ice/10' : 'bg-text-secondary/10'
        }`}>
          <MessageSquare className={`w-5 h-5 ${isPrimaryOption ? 'text-frost-ice' : 'text-text-secondary'}`} />
        </div>
        <h3 className="font-semibold text-polar-night">{t('title')}</h3>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        {t('description')}
      </p>
      <ul className="text-xs text-text-secondary space-y-1.5 mb-4">
        <li className="flex items-start gap-2">
          <span className="text-text-secondary/60 mt-0.5 flex-shrink-0">•</span>
          <span>{t('benefit1')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-text-secondary/60 mt-0.5 flex-shrink-0">•</span>
          <span>{t('benefit2')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-text-secondary/60 mt-0.5 flex-shrink-0">•</span>
          <span>{t('benefit3')}</span>
        </li>
      </ul>
      <Button
        variant={isPrimaryOption ? 'primary' : 'secondary'}
        size="md"
        fullWidth
        onClick={onSelect}
        loading={loading}
        disabled={loading}
      >
        {t('button')}
      </Button>
    </div>
  );
}
