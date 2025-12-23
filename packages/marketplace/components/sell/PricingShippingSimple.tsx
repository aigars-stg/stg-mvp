'use client';

import { Input } from '@second-turn/design-system';

interface PricingShippingSimpleProps {
  price: string;
  onChange: (field: string, value: any) => void;
  /** @deprecated No longer used - shipping is always T2T */
  shippingOptions?: {
    localPickup: boolean;
    parcelLocker: boolean;
  };
  /** @deprecated No longer used - shipping notes removed */
  shippingNotes?: string;
  /** @deprecated No longer used - only price input is shown */
  priceOnly?: boolean;
  /** @deprecated No longer used - shipping section removed */
  shippingOnly?: boolean;
}

export function PricingShippingSimple({
  price,
  onChange,
}: PricingShippingSimpleProps) {
  const handlePriceBlur = () => {
    if (price && !isNaN(parseFloat(price))) {
      // Format to 2 decimal places
      const formatted = parseFloat(price).toFixed(2);
      onChange('price', formatted);
    }
  };

  return (
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
  );
}
