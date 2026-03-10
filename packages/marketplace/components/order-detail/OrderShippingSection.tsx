'use client';

import {
  ShippingInfoCard,
  TrackingNumberCard,
  TrackingEventsTimeline,
} from '@/components/shipping';
import type { OrderDetailOrder, TrackingEvent } from '@/lib/types/order-detail';

interface OrderShippingSectionProps {
  order: OrderDetailOrder;
  trackingEvents: TrackingEvent[];
  /** Section title */
  title?: string;
  /** Constrain tracking events height (e.g. "max-h-40" for sidebar) */
  trackingMaxHeight?: string;
  /** When false, shows only the tracking link — no barcode number (buyer view) */
  showBarcode?: boolean;
  /** When false, hides receiver phone number (seller view) */
  showPhone?: boolean;
}

export function OrderShippingSection({
  order,
  trackingEvents,
  title = 'Shipping',
  trackingMaxHeight,
  showBarcode = true,
  showPhone = true,
}: OrderShippingSectionProps) {
  return (
    <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4">
      <ShippingInfoCard destination={order.destination} title={title} showPhone={showPhone} />

      {order.tracking.barcode && (
        <div className="mt-4">
          <TrackingNumberCard
            tracking={order.tracking}
            title="Tracking number"
            showBarcode={showBarcode}
          />
        </div>
      )}

      {trackingEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <TrackingEventsTimeline
            events={trackingEvents}
            title="Tracking history"
            maxHeight={trackingMaxHeight}
          />
        </div>
      )}
    </div>
  );
}
