'use client';

import { useTranslations } from 'next-intl';
import { Time as Clock, CheckCircleAlt01 as CheckCircle2 } from '@/lib/icons';
import { statusSteps, getStepStatus } from './ShippingStatusConfig';

interface StatusTimelineProps {
  currentStatus: string;
  timeRemainingMs?: number | null;
  /** Pre-formatted, translated "X remaining" string. Replaces inline formatting. */
  timeRemainingLabel?: string;
  title?: string;
  variant?: 'vertical' | 'horizontal';
  className?: string;
}

export function StatusTimeline({
  currentStatus,
  timeRemainingMs,
  timeRemainingLabel,
  title = 'Order Progress',
  variant = 'vertical',
  className = '',
}: StatusTimelineProps) {
  const t = useTranslations('Orders.detail');

  if (variant === 'horizontal') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-sm font-semibold text-polar-night mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center justify-between">
          {statusSteps.map((step, index) => {
            const status = getStepStatus(step, currentStatus);
            const isActive = status === 'completed';

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? 'bg-frost-ice text-snow-white'
                        : 'bg-bg-secondary text-text-muted'
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 text-center max-w-[60px] ${
                      isActive ? 'text-frost-ice' : 'text-text-muted'
                    }`}
                  >
                    {t(`steps.${step.key}`)}
                  </span>
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      isActive ? 'bg-frost-ice' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical variant
  return (
    <div className={className}>
      {title && (
        <h2 className="text-lg font-semibold text-polar-night mb-6">
          {title}
        </h2>
      )}
      <div className="space-y-4">
        {statusSteps.map((step, index) => {
          const status = getStepStatus(step, currentStatus);
          const isActive = status === 'completed';
          const isCurrent =
            index ===
            statusSteps.findIndex((s) => getStepStatus(s, currentStatus) === 'pending');

          return (
            <div key={step.key} className="flex gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-frost-ice text-snow-white'
                      : isCurrent
                        ? 'bg-aurora-yellow/20 text-aurora-yellow border-2 border-aurora-yellow'
                        : 'bg-bg-secondary text-text-muted'
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-text-muted" />
                  )}
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${
                      isActive ? 'bg-frost-ice' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex-grow pb-8">
                <p
                  className={`font-medium ${
                    isActive || isCurrent
                      ? 'text-polar-night'
                      : 'text-text-muted'
                  }`}
                >
                  {t(`steps.${step.key}`)}
                </p>
                {isCurrent &&
                  currentStatus === 'pending_seller' &&
                  timeRemainingLabel && (
                    <p className="text-sm text-aurora-yellow mt-1">
                      {timeRemainingLabel}
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
