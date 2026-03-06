'use client';

import { Tag, Gavel, Time as Clock, InfoCircle as Info, RefreshCw } from '@/lib/icons';
import { Card, Tabs, TabsList, TabsTrigger } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import type { PricingFormat, AuctionDuration, AuctionEndStrategy, AuctionCooldownHours } from '@/lib/types/listing';

interface PricingFormatSelectorProps {
  value: PricingFormat;
  onChange: (format: PricingFormat) => void;
  auctionDuration: AuctionDuration;
  onAuctionDurationChange: (duration: AuctionDuration) => void;
  auctionEndStrategy: AuctionEndStrategy;
  onAuctionEndStrategyChange: (strategy: AuctionEndStrategy) => void;
  auctionCooldownHours: AuctionCooldownHours;
  onAuctionCooldownHoursChange: (hours: AuctionCooldownHours) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const DURATION_OPTIONS: AuctionDuration[] = [1, 3, 5, 7];

const COOLDOWN_OPTIONS: AuctionCooldownHours[] = [24, 48];

export function PricingFormatSelector({
  value,
  onChange,
  auctionDuration,
  onAuctionDurationChange,
  auctionEndStrategy,
  onAuctionEndStrategyChange,
  auctionCooldownHours,
  onAuctionCooldownHoursChange,
  disabled = false,
  disabledMessage,
}: PricingFormatSelectorProps) {
  const t = useTranslations('Sell.pricingFormat');
  const tAuction = useTranslations('Sell.auction');

  return (
    <div className="space-y-3">
      {disabled && disabledMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {disabledMessage}
        </div>
      )}
      <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <Tabs variant="toggle" size="sm" value={value} onValueChange={(v) => onChange(v as PricingFormat)}>
        <TabsList>
          <TabsTrigger value="fixed_price" icon={<Tag className="w-4 h-4" />}>
            {t('fixedPrice.label')}
          </TabsTrigger>
          <TabsTrigger value="auction" icon={<Gavel className="w-4 h-4" />} activeColor="orange">
            {t('auction.label')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Description — changes based on selected format */}
      <div className="flex items-start gap-2">
        {value === 'fixed_price' ? (
          <Tag className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
        ) : (
          <Gavel className="w-4 h-4 text-aurora-orange flex-shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-text-secondary">
          {value === 'fixed_price' ? t('fixedPrice.description') : t('auction.description')}
        </p>
      </div>

      {/* Auction settings - only shown when auction is selected */}
      {value === 'auction' && (
        <div className="space-y-3 pt-1">
          {/* Duration Selection */}
          <div>
            <h4 className="text-sm font-semibold text-polar-night mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-aurora-orange" />
              {auctionEndStrategy === 'cooldown'
                ? tAuction('duration.titleCooldown')
                : tAuction('duration.title')}
            </h4>
            {auctionEndStrategy === 'cooldown' && (
              <p className="text-xs text-text-secondary mb-2">
                {tAuction('duration.cooldownHelper')}
              </p>
            )}
            <Tabs variant="toggle" size="sm" value={String(auctionDuration)} onValueChange={(v) => onAuctionDurationChange(Number(v) as AuctionDuration)}>
              <TabsList>
                {DURATION_OPTIONS.map((days) => (
                  <TabsTrigger key={days} value={String(days)} activeColor="orange">
                    {days === 1 ? tAuction('duration.oneDay') : tAuction('duration.days', { count: days })}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* End Strategy Selection */}
          <div>
            <h4 className="text-sm font-semibold text-polar-night mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-aurora-orange" />
              {tAuction('endStrategy.title')}
            </h4>
            <Tabs variant="toggle" size="sm" value={auctionEndStrategy} onValueChange={(v) => onAuctionEndStrategyChange(v as AuctionEndStrategy)}>
              <TabsList>
                <TabsTrigger value="fixed">
                  {tAuction('endStrategy.fixed.label')}
                </TabsTrigger>
                <TabsTrigger value="cooldown" activeColor="orange">
                  {tAuction('endStrategy.cooldown.label')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-text-secondary mt-1.5">
              {auctionEndStrategy === 'cooldown'
                ? tAuction('endStrategy.cooldown.description')
                : tAuction('endStrategy.fixed.description')}
            </p>
          </div>

          {/* Cooldown Period Selection - only when cooldown strategy */}
          {auctionEndStrategy === 'cooldown' && (
            <div>
              <h4 className="text-sm font-semibold text-polar-night mb-2">
                {tAuction('cooldownPeriod.title')}
              </h4>
              <Tabs variant="toggle" size="sm" value={String(auctionCooldownHours)} onValueChange={(v) => onAuctionCooldownHoursChange(Number(v) as AuctionCooldownHours)}>
                <TabsList>
                  {COOLDOWN_OPTIONS.map((hours) => (
                    <TabsTrigger key={hours} value={String(hours)}>
                      {tAuction('cooldownPeriod.hours', { count: hours })}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Strategy Info Card */}
          <Card padding="sm" className="bg-aurora-orange/10 border border-aurora-orange/30">
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-aurora-orange flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-aurora-orange mb-1">
                  {auctionEndStrategy === 'cooldown'
                    ? tAuction('cooldownInfo.title')
                    : tAuction('antiSnipe.title')}
                </p>
                <p className="text-xs text-text-secondary">
                  {auctionEndStrategy === 'cooldown'
                    ? tAuction('cooldownInfo.description', { hours: auctionCooldownHours })
                    : tAuction('antiSnipe.description')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
