'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, Input } from '@second-turn/design-system';
import { ConditionSelector } from '@/components/sell/ConditionSelector';
import { PhoneInput } from '@/components/common/PhoneInput';
import { PricingFormatSelector } from '@/components/sell/PricingFormatSelector';
import { PricingAssistant } from '@/components/sell/PricingAssistant';
import { ClipboardCheck, CurrencyEuro as Euro, Phone } from '@/lib/icons';
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

  // Phone state
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
      {/* Phone prompt — required for shipping labels */}
      {!hasPhone && onPhoneChange && (
        <div className="bg-snow-white border border-border rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone className="w-4 h-4 text-aurora-orange" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-sm font-medium text-polar-night">
                  {tSections('phone.label')}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {tSections('phone.description')}
                </p>
              </div>
              <PhoneInput
                value={sellerPhone || ''}
                onChange={onPhoneChange}
                compact
                defaultCountry={defaultCountry}
                id="seller-phone-inline"
              />
            </div>
          </div>
        </div>
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
