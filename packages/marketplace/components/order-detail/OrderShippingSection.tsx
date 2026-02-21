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
}

export function OrderShippingSection({
  order,
  trackingEvents,
  title = 'Shipping',
  trackingMaxHeight,
}: OrderShippingSectionProps) {
  return (
    <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
      <ShippingInfoCard destination={order.destination} title={title} />

      {order.tracking.barcode && (
        <div className="mt-4">
          <TrackingNumberCard
            tracking={order.tracking}
            title="Tracking number"
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
