'use client';

import { formatDateTime } from '@/lib/date-utils';
import type { OrderTimestamps } from '@/lib/types/order-detail';

interface OrderTimelineProps {
  timestamps: OrderTimestamps;
  title?: string;
}

interface TimelineEntry {
  label: string;
  date: string;
  variant?: 'default' | 'negative';
}

export function OrderTimeline({
  timestamps,
  title = 'Timeline',
}: OrderTimelineProps) {
  const entries: TimelineEntry[] = [];

  entries.push({ label: 'Created', date: timestamps.created_at });

  if (timestamps.paid_at) {
    entries.push({ label: 'Paid', date: timestamps.paid_at });
  }
  if (timestamps.seller_responded_at) {
    entries.push({
      label: 'Seller responded',
      date: timestamps.seller_responded_at,
    });
  }
  if (timestamps.label_generated_at) {
    entries.push({
      label: 'Label generated',
      date: timestamps.label_generated_at,
    });
  }
  if (timestamps.completed_at) {
    entries.push({ label: 'Completed', date: timestamps.completed_at });
  }
  if (timestamps.cancelled_at) {
    entries.push({
      label: 'Cancelled',
      date: timestamps.cancelled_at,
      variant: 'negative',
    });
  }
  if (timestamps.refunded_at) {
    entries.push({
      label: 'Refunded',
      date: timestamps.refunded_at,
      variant: 'negative',
    });
  }
  if (timestamps.disputed_at) {
    entries.push({
      label: 'Disputed',
      date: timestamps.disputed_at,
      variant: 'negative',
    });
  }

  return (
    <div className="bg-snow-white border border-border rounded-xl p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-polar-night mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        {entries.map((entry) => (
          <div key={entry.label} className="flex justify-between">
            <span className="text-text-secondary">{entry.label}</span>
            <span
              className={
                entry.variant === 'negative'
                  ? 'text-aurora-red'
                  : 'text-polar-night'
              }
            >
              {formatDateTime(entry.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
