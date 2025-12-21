'use client';

import { Input } from '@second-turn/design-system';
import { Package, MapPin } from 'lucide-react';

interface PricingShippingSimpleProps {
  price: string;
  shippingOptions: {
    localPickup: boolean;
    parcelLocker: boolean;
  };
  shippingNotes: string;
  onChange: (field: string, value: any) => void;
  /** Show only the price input */
  priceOnly?: boolean;
  /** Show only the shipping options */
  shippingOnly?: boolean;
}

export function PricingShippingSimple({
  price,
  shippingOptions,
  shippingNotes,
  onChange,
  priceOnly = false,
  shippingOnly = false,
}: PricingShippingSimpleProps) {
  const handlePriceBlur = () => {
    if (price && !isNaN(parseFloat(price))) {
      // Format to 2 decimal places
      const formatted = parseFloat(price).toFixed(2);
      onChange('price', formatted);
    }
  };

  const showPrice = !shippingOnly;
  const showShipping = !priceOnly;

  return (
    <div className="space-y-6">
      {/* Pricing Section */}
      {showPrice && (
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
            Asking Price (€)*
          </h3>
          <Input
            type="number"
            value={price || ''}
            onChange={(e) => onChange('price', e.target.value)}
            onBlur={handlePriceBlur}
            placeholder="25.00"
            min="0.01"
            step="0.01"
            required
            inputSize="lg"
          />
        </div>
      )}

      {/* Shipping Options */}
      {showShipping && (
        <>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
              Shipping Options *
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Select at least one option
            </p>

            <div className="space-y-3">
              {/* Local Pickup */}
              <button
                type="button"
                onClick={() => onChange('shippingOptions', { ...shippingOptions, localPickup: !shippingOptions.localPickup })}
                className={`
                  w-full p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3
                  ${
                    shippingOptions.localPickup
                      ? 'border-frost-ice bg-frost-ice/5'
                      : 'border-border hover:border-frost-ice/50'
                  }
                `}
              >
                <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-polar-night">Local pickup</div>
                  <div className="text-xs sm:text-sm text-text-secondary">Meet at a local area</div>
                </div>
              </button>

              {/* Parcel Lockers */}
              <button
                type="button"
                onClick={() => onChange('shippingOptions', { ...shippingOptions, parcelLocker: !shippingOptions.parcelLocker })}
                className={`
                  w-full p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3
                  ${
                    shippingOptions.parcelLocker
                      ? 'border-frost-ice bg-frost-ice/5'
                      : 'border-border hover:border-frost-ice/50'
                  }
                `}
              >
                <Package className="w-5 h-5 text-frost-ice flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-polar-night">Parcel lockers</div>
                  <div className="text-xs sm:text-sm text-text-secondary">Omniva, DPD, or similar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Additional Shipping Notes */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
              Additional Shipping Notes (Optional)
            </h3>
            <textarea
              value={shippingNotes || ''}
              onChange={(e) => onChange('shippingNotes', e.target.value)}
              placeholder="e.g., Can combine shipping if buying multiple games from me"
              className="w-full h-24 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice resize-none"
              maxLength={300}
            />
            <p className="text-xs text-text-muted mt-1">
              {(shippingNotes || '').length}/300 characters
            </p>
          </div>
        </>
      )}
    </div>
  );
}
