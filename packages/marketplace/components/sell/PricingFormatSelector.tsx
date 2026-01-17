'use client';

import { Tag, Tag as Gavel, CheckCircleAlt01 as CheckCircle2, Time as Clock, InfoCircle as Info } from 'griddy-icons';
import { Card } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import type { PricingFormat, AuctionDuration } from '@/lib/types/listing';

interface PricingFormatSelectorProps {
  value: PricingFormat;
  onChange: (format: PricingFormat) => void;
  auctionDuration: AuctionDuration;
  onAuctionDurationChange: (duration: AuctionDuration) => void;
}

const DURATION_OPTIONS: AuctionDuration[] = [1, 3, 5, 7];

export function PricingFormatSelector({
  value,
  onChange,
  auctionDuration,
  onAuctionDurationChange,
}: PricingFormatSelectorProps) {
  const t = useTranslations('Sell.pricingFormat');
  const tAuction = useTranslations('Sell.auction');

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Fixed Price Option */}
        <button
          type="button"
          onClick={() => onChange('fixed_price')}
          className={`h-full flex items-start text-left p-4 rounded-lg border-2 transition-all ${
            value === 'fixed_price'
              ? 'border-frost-ice bg-frost-ice/5'
              : 'border-border hover:border-frost-ice/50 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              value === 'fixed_price'
                ? 'bg-frost-ice text-white'
                : 'bg-frost-ice/10 text-frost-ice'
            }`}>
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-polar-night">
                  {t('fixedPrice.label')}
                </span>
                {value === 'fixed_price' && (
                  <CheckCircle2 className="w-4 h-4 text-frost-ice flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {t('fixedPrice.description')}
              </p>
            </div>
          </div>
        </button>

        {/* Auction Option */}
        <button
          type="button"
          onClick={() => onChange('auction')}
          className={`h-full flex items-start text-left p-4 rounded-lg border-2 transition-all ${
            value === 'auction'
              ? 'border-aurora-orange bg-aurora-orange/5'
              : 'border-border hover:border-aurora-orange/50 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              value === 'auction'
                ? 'bg-aurora-orange text-white'
                : 'bg-aurora-orange/10 text-aurora-orange'
            }`}>
              <Gavel className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-polar-night">
                  {t('auction.label')}
                </span>
                {value === 'auction' && (
                  <CheckCircle2 className="w-4 h-4 text-aurora-orange flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-text-secondary">
                {t('auction.description')}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Auction Duration Selection - only shown when auction is selected */}
      {value === 'auction' && (
        <div className="space-y-4 pt-2">
          {/* Duration Selection */}
          <div>
            <h4 className="text-sm font-medium text-polar-night mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-aurora-orange" />
              {tAuction('duration.title')}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onAuctionDurationChange(days)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    auctionDuration === days
                      ? 'border-aurora-orange bg-aurora-orange/5 text-aurora-orange font-semibold'
                      : 'border-border hover:border-aurora-orange/50 text-text-secondary bg-white'
                  }`}
                >
                  {days === 1 ? tAuction('duration.oneDay') : tAuction('duration.days', { count: days })}
                </button>
              ))}
            </div>
          </div>

          {/* Anti-snipe Info */}
          <Card padding="sm" className="bg-aurora-orange/10 border border-aurora-orange/30">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-aurora-orange flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-aurora-orange mb-1">
                  {tAuction('antiSnipe.title')}
                </p>
                <p className="text-xs text-text-secondary">
                  {tAuction('antiSnipe.description')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
