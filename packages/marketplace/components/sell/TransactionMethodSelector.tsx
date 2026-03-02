'use client';

import { Chat as MessageSquare, CreditCard, Phone, InfoCircle as Info } from '@/lib/icons';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Tabs, TabsList, TabsTrigger } from '@second-turn/design-system';
import { PhoneInput } from '@/components/common/PhoneInput';
import type { CountryCode } from '@/lib/country-utils';
import type { TransactionMethod } from '@/lib/types/listing';

interface TransactionMethodSelectorProps {
  value: TransactionMethod;
  onChange: (method: TransactionMethod) => void;
  canUseInstantBuy: boolean;
  sellerCountry?: string | null;
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
  sellerCountry,
  hasPhone = true,
  phoneValue = '',
  onPhoneChange,
  defaultCountry = 'LV',
}: TransactionMethodSelectorProps) {
  const t = useTranslations('Sell.transactionMethod');

  // Instant buy is only available in Latvia (or if country is unknown/not set)
  const isInstantBuyCountry = sellerCountry === 'LV' || !sellerCountry;
  const showInstantBuy = canUseInstantBuy && isInstantBuyCountry;

  if (showInstantBuy) {
    // LV sellers: toggle between instant buy (default) and contact seller
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-polar-night">
          {t('title')}
        </p>
        <Tabs
          variant="toggle"
          size="sm"
          value={value}
          onValueChange={(v) => onChange(v as TransactionMethod)}
        >
          <TabsList>
            <TabsTrigger
              value="instant_buy"
              activeColor="green"
              icon={<CreditCard className="w-4 h-4" />}
            >
              {t('instantBuy.label')}
            </TabsTrigger>
            <TabsTrigger
              value="contact_seller"
              icon={<MessageSquare className="w-4 h-4" />}
            >
              {t('contactSeller.label')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Description line — changes based on active method */}
        <div className="flex items-start gap-3">
          {value === 'instant_buy' ? (
            <>
              <CreditCard className="w-4 h-4 text-aurora-green flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">
                {t('instantBuyBanner')}
              </p>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary">
                {t('contactSeller.description')}
              </p>
            </>
          )}
        </div>

        {/* Phone input — only when instant_buy selected and seller has no phone */}
        {value === 'instant_buy' && !hasPhone && onPhoneChange && (
          <div className="p-3 rounded-lg border border-aurora-orange/30 bg-aurora-orange/5">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
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
    );
  }

  // EE/LT sellers: only contact seller, full width
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-polar-night mb-1">
          {t('title')}
        </h3>
        <p className="text-sm text-text-secondary mb-2">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start text-left p-3 rounded-lg border-2 border-frost-ice bg-frost-ice/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-frost-ice text-white">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-polar-night">
                {t('contactSeller.label')}
              </span>
              <p className="text-xs text-text-secondary mt-1">
                {t('contactSeller.description')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-frost-ice/5 rounded-lg border border-frost-ice/20">
          <p className="text-xs text-text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
            <span>{t('countryUnavailable')}</span>
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link href="/help/listing-types" className="text-xs text-frost-ice hover:underline">
          {t('helpLink')}
        </Link>
      </div>
    </div>
  );
}
