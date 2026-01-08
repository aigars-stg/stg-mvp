'use client';

import { useState, useEffect } from 'react';
import { Time as Clock, AlertTriangle } from 'griddy-icons';

interface ReservationTimerProps {
  expiresAt: string | Date;
  onExpire?: () => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ReservationTimer({
  expiresAt,
  onExpire,
  showLabel = true,
  size = 'md',
}: ReservationTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(expiresAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, expiry - now);
      return Math.floor(diff / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpire?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire, isExpired]);

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

  const colorClasses = {
    normal: 'text-aurora-green bg-aurora-green/10',
    warning: 'text-aurora-yellow bg-aurora-yellow/10',
    critical: 'text-aurora-red bg-aurora-red/10 animate-pulse',
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
        <span>Expired</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${colorClasses[urgency]} ${sizeClasses[size]}`}
      role="timer"
      aria-live="polite"
      aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
    >
      <Clock className={iconSizes[size]} />
      {showLabel && <span>Reserved:</span>}
      <span className="font-mono tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
