'use client';

import { Card, Input } from '@second-turn/design-system';
import { Time as Clock, CurrencyEuro, InfoCircle as Info } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import type { AuctionDuration } from '@/lib/types/listing';

interface AuctionSettingsProps {
  startPrice: string;
  duration: AuctionDuration;
  onStartPriceChange: (price: string) => void;
  onDurationChange: (duration: AuctionDuration) => void;
}

const DURATION_OPTIONS: AuctionDuration[] = [1, 3, 5, 7];

export function AuctionSettings({
  startPrice,
  duration,
  onStartPriceChange,
  onDurationChange,
}: AuctionSettingsProps) {
  const t = useTranslations('Sell.auction');

  return (
    <div className="space-y-6">
      {/* Starting Price */}
      <div>
        <h3 className="text-base font-semibold text-polar-night mb-2 flex items-center gap-2">
          <CurrencyEuro className="w-5 h-5 text-aurora-purple" />
          {t('startingPrice.title')}
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          {t('startingPrice.description')}
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
            EUR
          </span>
          <Input
            type="number"
            value={startPrice}
            onChange={(e) => onStartPriceChange(e.target.value)}
            placeholder="5.00"
            min="1"
            step="0.01"
            required
            inputSize="lg"
            className="pl-14"
          />
        </div>
      </div>

      {/* Duration Selection */}
      <div>
        <h3 className="text-base font-semibold text-polar-night mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-aurora-purple" />
          {t('duration.title')}
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          {t('duration.description')}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onDurationChange(days)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                duration === days
                  ? 'border-aurora-purple bg-aurora-purple/5 text-aurora-purple font-semibold'
                  : 'border-border hover:border-aurora-purple/50 text-text-secondary bg-white'
              }`}
            >
              {days === 1 ? t('duration.oneDay') : t('duration.days', { count: days })}
            </button>
          ))}
        </div>
      </div>

      {/* Anti-snipe Info */}
      <Card padding="sm" className="bg-aurora-purple/10 border border-aurora-purple/30">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-aurora-purple flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-aurora-purple mb-1">
              {t('antiSnipe.title')}
            </p>
            <p className="text-xs text-text-secondary">
              {t('antiSnipe.description')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
