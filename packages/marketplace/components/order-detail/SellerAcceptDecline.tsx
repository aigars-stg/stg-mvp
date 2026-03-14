'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Badge } from '@second-turn/design-system';
import {
  Time as Clock,
  CheckCircleAlt01 as CheckCircle2,
  CloseCircle as XCircle,
  RefreshCw as Loader2,
  AlertTriangle,
} from '@/lib/icons';

function useCountdown(deadline: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() => {
    if (!deadline) return null;
    return Math.max(0, new Date(deadline).getTime() - Date.now());
  });

  useEffect(() => {
    if (!deadline) {
      setRemainingMs(null);
      return;
    }

    const calc = () => Math.max(0, new Date(deadline).getTime() - Date.now());
    setRemainingMs(calc());

    // Update every second when < 1 hour, every minute otherwise
    const getInterval = () => (calc() < 3600000 ? 1000 : 60000);
    let intervalId: ReturnType<typeof setInterval>;

    const start = () => {
      intervalId = setInterval(() => {
        const ms = calc();
        setRemainingMs(ms);
        if (ms <= 0) clearInterval(intervalId);
      }, getInterval());
    };

    start();

    // Switch to per-second updates when crossing the 1-hour threshold
    const switchTimeout = setTimeout(() => {
      clearInterval(intervalId);
      start();
    }, Math.max(0, calc() - 3600000));

    return () => {
      clearInterval(intervalId);
      clearTimeout(switchTimeout);
    };
  }, [deadline]);

  return remainingMs;
}

interface SellerAcceptDeclineProps {
  timeRemaining: string | null;
  sellerResponseDeadline?: string | null;
  showDeclineModal: boolean;
  setShowDeclineModal: (show: boolean) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;
  actionLoading: boolean;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  handleAcceptOrder: () => Promise<void>;
  handleDeclineOrder: () => Promise<void>;
}

export function SellerAcceptDecline({
  timeRemaining,
  sellerResponseDeadline,
  showDeclineModal,
  setShowDeclineModal,
  declineReason,
  setDeclineReason,
  actionLoading,
  actionError,
  setActionError,
  handleAcceptOrder,
  handleDeclineOrder,
}: SellerAcceptDeclineProps) {
  const t = useTranslations('SellerOrderDetail');

  const countdownMs = useCountdown(sellerResponseDeadline ?? null);
  const isExpired = countdownMs !== null ? countdownMs <= 0 : timeRemaining === 'Expired';

  // Determine urgency: < 4 hours = urgent (red), otherwise warning (orange/yellow)
  const isUrgent = countdownMs !== null && countdownMs > 0 && countdownMs < 4 * 3600000;

  // Format countdown display
  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return '';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Use red styling when expired or urgent (< 4 hours), yellow otherwise
  const useRedStyle = isExpired || isUrgent;
  const borderColor = useRedStyle ? 'border-aurora-red/30' : 'border-aurora-yellow/30';
  const bgColor = useRedStyle ? 'bg-aurora-red/10' : 'bg-aurora-yellow/10';
  const iconBgColor = useRedStyle ? 'bg-aurora-red/20' : 'bg-aurora-yellow/20';
  const iconColor = useRedStyle ? 'text-aurora-red' : 'text-aurora-yellow';

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-xl p-6`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
          {isExpired ? (
            <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
          ) : (
            <Clock className={`w-6 h-6 ${iconColor}`} />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-polar-night">
              {t('actionRequired.title')}
            </h3>
            {isExpired && (
              <Badge variant="error">
                {t('actionRequired.expired')}
              </Badge>
            )}
          </div>

          {/* Live countdown timer */}
          {countdownMs !== null && countdownMs > 0 && (
            <div
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 mb-3 ${
                isUrgent
                  ? 'bg-aurora-red/15 text-aurora-red'
                  : 'bg-aurora-orange/10 text-aurora-orange'
              }`}
              role="timer"
              aria-live="polite"
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                {t('actionRequired.respondWithin')}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold">
                {formatCountdown(countdownMs)}
              </span>
            </div>
          )}
          {/* Fallback when deadline not available but timeRemaining string is */}
          {countdownMs === null && timeRemaining && !isExpired && (
            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 mb-3 bg-aurora-orange/10 text-aurora-orange">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{timeRemaining}</span>
            </div>
          )}
          <p className="text-sm text-text-secondary mb-4">
            {isExpired
              ? t('actionRequired.expiredDescription')
              : t('actionRequired.description')}
          </p>

          {actionError && (
            <div className="mb-4 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
              <p className="text-sm text-aurora-red">{actionError}</p>
            </div>
          )}

          {!showDeclineModal && !isExpired && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setActionError(null);
                  handleAcceptOrder();
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {actionLoading ? t('acceptModal.processing') : t('actionRequired.acceptOrder')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeclineModal(true);
                  setActionError(null);
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t('actionRequired.declineOrder')}
              </Button>
            </div>
          )}

          {/* Decline form */}
          {showDeclineModal && !isExpired && (
            <div className="p-4 bg-snow-white border border-border rounded-lg">
              <h4 className="font-semibold text-polar-night mb-3">
                {t('declineModal.title')}
              </h4>
              <p className="text-sm text-text-secondary mb-4">
                {t('declineModal.description')}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('declineModal.reasonLabel')}
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={t('declineModal.reasonPlaceholder')}
                  className="w-full p-3 border border-border rounded-lg text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeclineOrder}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('declineModal.processing')}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('declineModal.declineAndRefund')}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDeclineModal(false);
                    setActionError(null);
                    setDeclineReason('');
                  }}
                  disabled={actionLoading}
                >
                  {t('declineModal.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
