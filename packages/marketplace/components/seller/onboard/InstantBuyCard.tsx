'use client';

import { Button } from '@second-turn/design-system';
import { CheckCircleAlt01 as CheckCircle2, ArrowRight, CreditCard } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import { ListingTypeHelpLink } from './ListingTypeHelpLink';

interface InstantBuyCardProps {
  stripeAvailable: boolean;
  onSelect: () => void;
  loading?: boolean;
}

export function InstantBuyCard({ stripeAvailable, onSelect, loading }: InstantBuyCardProps) {
  const t = useTranslations('SellerOnboard.step2.instantBuy');

  if (stripeAvailable) {
    return (
      <div className="ring-2 ring-frost-ice border border-transparent rounded-lg p-4 sm:p-6 transition-colors">
        <span className="inline-block bg-aurora-green/10 text-aurora-green text-xs font-medium px-2 py-0.5 rounded mb-3">
          {t('badge')}
        </span>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-aurora-green/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-aurora-green" />
          </div>
          <h3 className="font-semibold text-polar-night">{t('title')}</h3>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          {t('description')}
        </p>
        <ul className="text-xs text-text-secondary space-y-1.5 mb-4">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-aurora-green flex-shrink-0 mt-0.5" />
            <span>{t('benefit1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-aurora-green flex-shrink-0 mt-0.5" />
            <span>{t('benefit2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-aurora-green flex-shrink-0 mt-0.5" />
            <span>{t('benefit3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-aurora-green flex-shrink-0 mt-0.5" />
            <span>{t('benefit4')}</span>
          </li>
        </ul>
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onSelect}
          loading={loading}
          disabled={loading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {t('button')} — {t('buttonTime')}
        </Button>
        <div className="mt-3 text-center">
          <ListingTypeHelpLink />
        </div>
      </div>
    );
  }

  // Coming soon state for non-LV countries
  return (
    <div className="border border-border bg-snow-stormLight rounded-lg p-4 sm:p-6 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-text-muted/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-text-muted" />
        </div>
        <h3 className="font-semibold text-text-secondary">{t('title')}</h3>
      </div>
      <p className="text-sm text-text-muted mb-4">
        {t('description')}
      </p>
      <ul className="text-xs text-text-muted space-y-1.5 mb-4">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0 mt-0.5" />
          <span>{t('benefit1')}</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0 mt-0.5" />
          <span>{t('benefit2')}</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0 mt-0.5" />
          <span>{t('benefit3')}</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0 mt-0.5" />
          <span>{t('benefit4')}</span>
        </li>
      </ul>
      <div className="text-center">
        <p className="text-xs text-text-muted mb-2">
          {t('comingSoon')}
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled
        >
          {t('comingSoonButton')}
        </Button>
      </div>
    </div>
  );
}
