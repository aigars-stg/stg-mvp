'use client';

import { useState, useEffect } from 'react';
import { CalendarTime } from 'griddy-icons';
import { useTranslations } from 'next-intl';
import {
  getAuctionTimeRemaining,
  formatCompactTimeRemaining,
  getAuctionUrgencyTier,
} from '@/lib/types/listing';

interface AuctionCountdownProps {
  endsAt: string | null;
  /** Show "Auction ended" for games with only ended auctions */
  showEnded?: boolean;
  className?: string;
}

export function AuctionCountdown({ endsAt, showEnded = false, className = '' }: AuctionCountdownProps) {
  const t = useTranslations('Listings.card');
  const [, setTick] = useState(0);

  const urgency = getAuctionUrgencyTier(endsAt);
  const time = endsAt ? getAuctionTimeRemaining(endsAt) : null;

  // Live-tick for hot (every 30s) and critical (every 1s) tiers
  useEffect(() => {
    if (!urgency.tickInterval) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, urgency.tickInterval);

    return () => clearInterval(interval);
  }, [urgency.tickInterval]);

  // Nothing to show
  if (urgency.tier === 'ended') {
    if (!showEnded) return null;
    return (
      <div className={`flex items-center gap-1 mt-1.5 text-xs ${urgency.textColorClass} ${className}`}>
        <CalendarTime className="w-3.5 h-3.5" />
        <span>{t('auctionEnded')}</span>
      </div>
    );
  }

  if (!time || time.isEnded) return null;

  return (
    <div
      className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${urgency.textColorClass} ${className}`}
      role="timer"
      aria-live="polite"
    >
      <CalendarTime className="w-3.5 h-3.5" />
      <span>{t('auctionEndsIn')} {formatCompactTimeRemaining(time)}</span>
    </div>
  );
}
