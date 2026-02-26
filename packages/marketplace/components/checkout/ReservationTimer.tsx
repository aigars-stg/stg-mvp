'use client';

import { useState, useEffect } from 'react';
import { Time as Clock, AlertTriangle, RefreshCw as Loader2 } from '@/lib/icons';
import { useTranslations } from 'next-intl';

interface ReservationTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
  onExtend?: () => Promise<void>;
  canExtend?: boolean;
  isExtending?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ReservationTimer({
  expiresAt,
  onExpire,
  onExtend,
  canExtend = false,
  isExtending = false,
  showLabel = true,
  size = 'md',
}: ReservationTimerProps) {
  const t = useTranslations('Checkout.ReservationTimer');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, expiry - now);
      return Math.floor(diff / 1000);
    };

    const remaining = calculateTimeLeft();
    setTimeLeft(remaining);

    // Reset expired state if we received a new future expiry time
    // (e.g., after first item in basket expires and timer recalculates to next item)
    if (remaining > 0 && isExpired) {
      setIsExpired(false);
      return; // Let the next effect cycle start a clean timer
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && !isExpired) {
        // Suppress expiry while extend API call is in flight
        if (extending || isExtending) return;
        setIsExpired(true);
        onExpire?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire, isExpired, extending, isExtending]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Determine urgency level for styling
  const getUrgencyLevel = () => {
    if (timeLeft <= 0) return 'expired';
    if (timeLeft <= 300) return 'critical'; // < 5 minutes
    if (timeLeft <= 600) return 'warning'; // < 10 minutes
    return 'normal';
  };

  const urgency = getUrgencyLevel();
  const showExtendButton = canExtend && onExtend && urgency === 'critical' && !isExpired;

  const handleExtend = async () => {
    if (!onExtend || extending) return;
    setExtending(true);
    try {
      await onExtend();
    } finally {
      setExtending(false);
    }
  };

  const colorClasses = {
    normal: 'text-aurora-green bg-aurora-green/10',
    warning: 'text-aurora-yellow bg-aurora-yellow/10',
    critical: 'text-aurora-red bg-aurora-red/10 motion-safe:animate-pulse',
    expired: 'text-text-muted bg-bg-secondary',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (isExpired) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-md font-medium ${colorClasses.expired} ${sizeClasses[size]}`}
      >
        <AlertTriangle className={iconSizes[size]} />
        <span>{t('expired')}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 rounded-md font-medium ${colorClasses[urgency]} ${sizeClasses[size]}`}
        role="timer"
        aria-live="polite"
        aria-label={t('ariaLabel', { minutes, seconds })}
      >
        <Clock className={iconSizes[size]} />
        {showLabel && <span>{t('reserved')}</span>}
        <span className="font-mono tabular-nums">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      {showExtendButton && (
        <button
          type="button"
          onClick={handleExtend}
          disabled={extending}
          className="inline-flex items-center gap-1 text-xs font-medium text-aurora-red hover:text-aurora-red/80 bg-aurora-red/10 hover:bg-aurora-red/20 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
        >
          {extending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span>{t('extendButton')}</span>
          )}
        </button>
      )}
    </div>
  );
}
