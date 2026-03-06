'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@second-turn/design-system';
import { PricingFormatSelector } from '@/components/sell/PricingFormatSelector';
import { PricingAssistant } from '@/components/sell/PricingAssistant';
import { CurrencyEuro as Euro } from '@/lib/icons';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatPrice } from '@/lib/services/pricing';
import type { ListingFormData } from '@/lib/hooks/useListingForm';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActionPhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onAdvance?: () => void;
  isPhaseComplete?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionPhase({
  formData,
  setFormData,
  onAdvance,
  isPhaseComplete,
}: ActionPhaseProps) {
  const tSections = useTranslations('Sell.sections');
  const tPrice = useTranslations('Sell.price');
  const tPhases = useTranslations('Phases.listing');

  const handleFormatChange = (format: ListingFormData['pricingFormat']) => {
    setFormData((prev) => {
      // EC-7: clear price if it doesn't meet the new format's minimum
      const currentPrice = parseFloat(prev.price);
      const auctionMin = 1.0;
      const fixedMin = 0.01;
      let newPrice = prev.price;
      if (format === 'auction' && (!prev.price || currentPrice < auctionMin)) newPrice = '';
      if (format === 'fixed_price' && (!prev.price || currentPrice < fixedMin)) newPrice = '';
      return { ...prev, pricingFormat: format, price: newPrice };
    });
  };

  return (
    <div className="space-y-4">
      {/* Pricing Section */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Euro className="w-4 h-4 text-frost-ice" />
          <h3 className="text-sm font-semibold text-polar-night">
            {tSections('pricing.title')} <span className="text-aurora-red">*</span>
          </h3>
        </div>
        <div className="space-y-3">
          {/* Pricing Format Selector — disabled when auction has bids (EC-4/B2) */}
          <PricingFormatSelector
            value={formData.pricingFormat}
            onChange={handleFormatChange}
            auctionDuration={formData.auctionDurationDays}
            onAuctionDurationChange={(duration) =>
              setFormData((prev) => ({ ...prev, auctionDurationDays: duration }))
            }
            auctionEndStrategy={formData.auctionEndStrategy}
            onAuctionEndStrategyChange={(strategy) =>
              setFormData((prev) => ({ ...prev, auctionEndStrategy: strategy }))
            }
            auctionCooldownHours={formData.auctionCooldownHours}
            onAuctionCooldownHoursChange={(hours) =>
              setFormData((prev) => ({ ...prev, auctionCooldownHours: hours }))
            }
            disabled={(formData.auctionBidCount ?? 0) > 0}
            disabledMessage={tPrice('bidLockMessage')}
          />

          {/* Pricing Assistant */}
          {formData.selectedGame && (
            <PricingAssistant
              bggGameId={formData.selectedGame.id}
              condition={formData.condition}
              onFillPrice={(price) =>
                setFormData((prev) => ({ ...prev, price: price.toFixed(2) }))
              }
              expansionIds={formData.selectedExpansions.map((e) => e.bgg_id)}
              pricingFormat={formData.pricingFormat}
            />
          )}

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-polar-night mb-2">
              {formData.pricingFormat === 'auction'
                ? tPrice('labelAuction')
                : tPrice('label')}{' '}
              *
            </label>
            {formData.pricingFormat === 'auction' && (
              <p className="text-xs text-text-secondary mb-2">
                {tPrice('helperAuction')}
              </p>
            )}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                EUR
              </span>
              <Input
                type="number"
                value={formData.price || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                onBlur={() => {
                  if (formData.price && !isNaN(parseFloat(formData.price))) {
                    setFormData((prev) => ({
                      ...prev,
                      price: parseFloat(formData.price).toFixed(2),
                    }));
                  }
                }}
                placeholder={formData.pricingFormat === 'auction' ? 'e.g. 5' : 'e.g. 25'}
                min={formData.pricingFormat === 'auction' ? '1' : '0.01'}
                max="500"
                step="1"
                required
                inputSize="lg"
                className="pl-14"
              />
            </div>

            {/* Commission Note */}
            <div className="mt-3 p-3 bg-bg-secondary rounded-lg">
              <p className="text-xs text-text-secondary">
                {formData.pricingFormat === 'auction'
                  ? tPrice('commission.auctionNote')
                  : tPrice('commission.fixedNote')}
              </p>
              {formData.price &&
                parseFloat(formData.price) > 0 &&
                !isNaN(parseFloat(formData.price)) && (
                  <div className="mt-2 pt-2 border-t border-border-subtle">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">
                        {tPrice('commission.platformFee')}
                      </span>
                      <span className="text-text-secondary">
                        -{formatPrice(parseFloat(formData.price) * SELLER_COMMISSION_RATE)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="font-medium text-polar-night">
                        {tPrice('commission.youReceive')}
                      </span>
                      <span className="font-semibold text-aurora-green">
                        {formatPrice(
                          parseFloat(formData.price) * (1 - SELLER_COMMISSION_RATE),
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </Card>

      {/* Continue button — sticky at bottom; omitted on desktop */}
      {onAdvance && (
        <div className="pt-4 sticky bottom-4 z-10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onAdvance}
            disabled={!isPhaseComplete}
          >
            {tPhases('action.continueButton')}
          </Button>
        </div>
      )}
    </div>
  );
}
