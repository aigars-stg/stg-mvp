'use client';

import { useLocale, useTranslations } from 'next-intl';
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
  title,
}: OrderTimelineProps) {
  const t = useTranslations('Orders.detail.timeline');
  const locale = useLocale();

  const entries: TimelineEntry[] = [];

  if (timestamps.paid_at) {
    entries.push({ label: t('paid'), date: timestamps.paid_at });
  }
  if (timestamps.completed_at) {
    entries.push({ label: t('completed'), date: timestamps.completed_at });
  }
  if (timestamps.cancelled_at) {
    entries.push({ label: t('cancelled'), date: timestamps.cancelled_at, variant: 'negative' });
  }
  if (timestamps.refunded_at) {
    entries.push({ label: t('refunded'), date: timestamps.refunded_at, variant: 'negative' });
  }
  if (timestamps.disputed_at) {
    entries.push({ label: t('disputed'), date: timestamps.disputed_at, variant: 'negative' });
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-snow-white border border-border rounded-xl p-3 sm:p-4">
      <h3 className="text-sm font-semibold text-polar-night mb-3">
        {title ?? t('title')}
      </h3>
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
              {formatDateTime(entry.date, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
