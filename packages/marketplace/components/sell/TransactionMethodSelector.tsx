'use client';

import { Chat as MessageSquare, CreditCard, CheckCircleAlt01 as CheckCircle2, ArrowRight, Phone } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PhoneInput } from '@/components/common/PhoneInput';
import type { CountryCode } from '@/lib/country-utils';
import type { TransactionMethod } from '@/lib/types/listing';

interface TransactionMethodSelectorProps {
  value: TransactionMethod;
  onChange: (method: TransactionMethod) => void;
  canUseInstantBuy: boolean;
  onUpgradeClick?: () => void;
  hasPhone?: boolean;
  phoneValue?: string;
  onPhoneChange?: (phone: string) => void;
  defaultCountry?: CountryCode;
}

export function TransactionMethodSelector({
  value,
  onChange,
  canUseInstantBuy,
  onUpgradeClick,
  hasPhone = true,
  phoneValue = '',
  onPhoneChange,
  defaultCountry = 'LV',
}: TransactionMethodSelectorProps) {
  const t = useTranslations('Sell.transactionMethod');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-1">
          {t('title')}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {t('subtitle')}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Contact Seller Option */}
        <button
          type="button"
          onClick={() => onChange('contact_seller')}
          className={`h-full flex items-start text-left p-4 rounded-lg border-2 transition-all ${
            value === 'contact_seller'
              ? 'border-frost-ice bg-frost-ice/5'
              : 'border-border hover:border-frost-ice/50 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              value === 'contact_seller'
                ? 'bg-frost-ice text-white'
                : 'bg-frost-ice/10 text-frost-ice'
            }`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-polar-night">
                  {t('contactSeller.label')}
                </span>
                {value === 'contact_seller' && (
                  <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {t('contactSeller.description')}
              </p>
            </div>
          </div>
        </button>

        {/* Instant Buy Option */}
        <button
          type="button"
          onClick={() => canUseInstantBuy && onChange('instant_buy')}
          disabled={!canUseInstantBuy}
          className={`h-full flex items-start text-left p-4 rounded-lg border-2 transition-all ${
            value === 'instant_buy'
              ? 'border-aurora-green bg-aurora-green/5'
              : canUseInstantBuy
                ? 'border-border hover:border-aurora-green/50 bg-white'
                : 'border-border bg-snow-stormLight cursor-not-allowed opacity-75'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              value === 'instant_buy'
                ? 'bg-aurora-green text-white'
                : canUseInstantBuy
                  ? 'bg-aurora-green/10 text-aurora-green'
                  : 'bg-snow-storm text-text-secondary'
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-semibold ${canUseInstantBuy ? 'text-polar-night' : 'text-text-secondary'}`}>
                  {t('instantBuy.label')}
                </span>
                {value === 'instant_buy' && (
                  <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {canUseInstantBuy
                  ? t('instantBuy.description')
                  : t('instantBuy.unavailable')}
              </p>
              {!canUseInstantBuy && onUpgradeClick && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgradeClick();
                  }}
                  className="mt-2 text-xs text-frost-ice hover:underline flex items-center gap-1"
                >
                  {t('instantBuy.upgrade')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </button>

        {/* Inline phone input - shown when instant_buy is selected but seller has no phone */}
        {value === 'instant_buy' && !hasPhone && onPhoneChange && (
          <div className="sm:col-span-2 p-4 rounded-lg border border-aurora-orange/30 bg-aurora-orange/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-aurora-orange" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-sm font-medium text-polar-night">
                    {t('instantBuy.phoneRequired.label')}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {t('instantBuy.phoneRequired.description')}
                  </p>
                </div>
                <PhoneInput
                  value={phoneValue}
                  onChange={onPhoneChange}
                  compact
                  defaultCountry={defaultCountry}
                  id="seller-phone-inline"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/help/listing-types" className="text-xs text-frost-ice hover:underline">
          {t('helpLink')}
        </Link>
      </div>
    </div>
  );
}
