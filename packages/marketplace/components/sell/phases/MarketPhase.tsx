'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@second-turn/design-system';
import { TransactionMethodSelector } from '@/components/sell/TransactionMethodSelector';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PricingFormatSelector } from '@/components/sell/PricingFormatSelector';
import { PricingAssistant } from '@/components/sell/PricingAssistant';
import { ClipboardCheck, CurrencyEuro as Euro } from '@/lib/icons';
import { SELLER_COMMISSION_RATE } from '@/lib/pricing/constants';
import { formatPrice } from '@/lib/services/pricing';
import type { ListingFormData } from '@/lib/hooks/useListingForm';
import type { CountryCode } from '@/lib/country-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarketPhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onAdvance: () => void;
  isPhaseComplete: boolean;

  // Transaction method / seller capabilities
  sellerCapabilities: {
    canCreateContactSeller: boolean;
    canCreateInstantBuy: boolean;
    isLoading: boolean;
  };
  sellerCountry: string | null | undefined;
  onUpgradeClick: () => void;

  // Phone state (for instant buy)
  hasPhone: boolean;
  sellerPhone: string | null;
  onPhoneChange: (phone: string) => void;
  defaultCountry: CountryCode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketPhase({
  formData,
  setFormData,
  onAdvance,
  isPhaseComplete,
  sellerCapabilities,
  sellerCountry,
  onUpgradeClick,
  hasPhone,
  sellerPhone,
  onPhoneChange,
  defaultCountry,
}: MarketPhaseProps) {
  const tSections = useTranslations('Sell.sections');
  const tPrice = useTranslations('Sell.price');
  const tPhases = useTranslations('Phases.listing');

  return (
    <div className="space-y-4">
      {/* Transaction Method Selection */}
      {!sellerCapabilities.isLoading && (
        <Card padding="md">
          <TransactionMethodSelector
            value={formData.transactionMethod}
            onChange={(method) =>
              setFormData((prev) => ({ ...prev, transactionMethod: method }))
            }
            canUseInstantBuy={sellerCapabilities.canCreateInstantBuy}
            sellerCountry={sellerCountry}
            onUpgradeClick={onUpgradeClick}
            hasPhone={hasPhone}
            phoneValue={sellerPhone || ''}
            onPhoneChange={onPhoneChange}
            defaultCountry={defaultCountry}
          />
        </Card>
      )}

      {/* Condition Section */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="w-4 h-4 text-frost-ice" />
          <h3 className="text-sm font-semibold text-polar-night">
            {tSections('condition.title')} <span className="text-aurora-red">*</span>
          </h3>
        </div>
        <ConditionSelector
          condition={formData.condition}
          conditionNotes={formData.conditionNotes}
          allComponentsPresent={formData.allComponentsPresent}
          missingComponents={formData.missingComponents}
          onChange={(field, value) =>
            setFormData((prev) => ({ ...prev, [field]: value }))
          }
        />
      </Card>

      {/* Pricing Section */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Euro className="w-4 h-4 text-frost-ice" />
          <h3 className="text-sm font-semibold text-polar-night">
            {tSections('pricing.title')} <span className="text-aurora-red">*</span>
          </h3>
        </div>
        <div className="space-y-3">
          {/* Pricing Format Selector */}
          <PricingFormatSelector
            value={formData.pricingFormat}
            onChange={(format) =>
              setFormData((prev) => ({ ...prev, pricingFormat: format }))
            }
            auctionDuration={formData.auctionDurationDays}
            onAuctionDurationChange={(duration) =>
              setFormData((prev) => ({
                ...prev,
                auctionDurationDays: duration,
              }))
            }
            auctionEndStrategy={formData.auctionEndStrategy}
            onAuctionEndStrategyChange={(strategy) =>
              setFormData((prev) => ({
                ...prev,
                auctionEndStrategy: strategy,
              }))
            }
            auctionCooldownHours={formData.auctionCooldownHours}
            onAuctionCooldownHoursChange={(hours) =>
              setFormData((prev) => ({
                ...prev,
                auctionCooldownHours: hours,
              }))
            }
          />

          {/* Pricing Assistant */}
          {formData.selectedGame && (
            <PricingAssistant
              bggGameId={formData.selectedGame.id}
              condition={formData.condition}
              onFillPrice={(price) =>
                setFormData((prev) => ({
                  ...prev,
                  price: price.toFixed(2),
                }))
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
                  if (
                    formData.price &&
                    !isNaN(parseFloat(formData.price))
                  ) {
                    setFormData((prev) => ({
                      ...prev,
                      price: parseFloat(formData.price).toFixed(2),
                    }));
                  }
                }}
                placeholder={
                  formData.pricingFormat === 'auction' ? 'e.g. 5' : 'e.g. 25'
                }
                min={formData.pricingFormat === 'auction' ? '1' : '0.01'}
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
                        -
                        {formatPrice(
                          parseFloat(formData.price) * SELLER_COMMISSION_RATE,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="font-medium text-polar-night">
                        {tPrice('commission.youReceive')}
                      </span>
                      <span className="font-semibold text-aurora-green">
                        {formatPrice(
                          parseFloat(formData.price) *
                            (1 - SELLER_COMMISSION_RATE),
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </Card>

      {/* Continue button */}
      <div className="pt-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onAdvance}
          disabled={!isPhaseComplete}
        >
          {tPhases('market.continueButton')}
        </Button>
      </div>
    </div>
  );
}
