'use client';

import { Input } from '@second-turn/design-system';
import { Package, MapPin } from 'lucide-react';

interface PricingShippingProps {
  price: string;
  shippingOptions: {
    localPickup: boolean;
    parcelLocker: boolean;
  };
  pickupLocation: string;
  parcelLockerPaidBy: 'seller' | 'buyer' | null;
  onChange: (field: string, value: any) => void;
}

export function PricingShipping({
  price,
  shippingOptions,
  pickupLocation,
  parcelLockerPaidBy,
  onChange,
}: PricingShippingProps) {
  const handlePriceBlur = () => {
    if (price && !isNaN(parseFloat(price))) {
      // Format to 2 decimal places
      const formatted = parseFloat(price).toFixed(2);
      onChange('price', formatted);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Section */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
          Asking Price *
        </h3>
        <Input
          label="Price (€)"
          type="number"
          value={price || ''}
          onChange={(e) => onChange('price', e.target.value)}
          onBlur={handlePriceBlur}
          placeholder="25.00"
          min="1"
          step="0.01"
          required
          inputSize="lg"
        />
      </div>

      {/* Shipping Options */}
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

          {shippingOptions.localPickup && (
            <div className="ml-11 mt-3">
              <label className="text-sm font-medium text-polar-night mb-2 block">
                Pickup location details
              </label>
              <textarea
                value={pickupLocation || ''}
                onChange={(e) => onChange('pickupLocation', e.target.value)}
                placeholder="e.g., Riga, Old Town area or near Central Market"
                className="w-full h-20 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice resize-none"
              />
            </div>
          )}

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

          {shippingOptions.parcelLocker && (
            <div className="ml-11 mt-3 space-y-3">
              <label className="text-sm font-medium text-polar-night mb-2 block">
                Who pays for shipping?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onChange('parcelLockerPaidBy', 'seller')}
                  className={`
                    p-3 border-2 rounded-lg text-left transition-all
                    ${
                      parcelLockerPaidBy === 'seller'
                        ? 'border-frost-ice bg-frost-ice/5'
                        : 'border-border hover:border-frost-ice/50'
                    }
                  `}
                >
                  <div className="font-semibold text-polar-night text-sm">I'll cover shipping</div>
                  <div className="text-xs text-text-secondary mt-0.5">Free shipping for buyer</div>
                </button>

                <button
                  type="button"
                  onClick={() => onChange('parcelLockerPaidBy', 'buyer')}
                  className={`
                    p-3 border-2 rounded-lg text-left transition-all
                    ${
                      parcelLockerPaidBy === 'buyer'
                        ? 'border-frost-ice bg-frost-ice/5'
                        : 'border-border hover:border-frost-ice/50'
                    }
                  `}
                >
                  <div className="font-semibold text-polar-night text-sm">Buyer pays</div>
                  <div className="text-xs text-text-secondary mt-0.5">Shipping cost added at checkout</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
