'use client';

import { AlertTriangle, Time as Clock } from 'griddy-icons';
import { Link } from '@/i18n/navigation';
import { Button } from '@second-turn/design-system';

interface DisputeAlertProps {
  orderId: string;
  orderNumber: string;
  gameName: string;
  reason: string;
  deadline: string;
}

export function DisputeAlert({
  orderId,
  orderNumber,
  gameName,
  reason,
  deadline,
}: DisputeAlertProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursLeft = Math.max(
    0,
    Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
  );
  const isUrgent = hoursLeft < 12;

  return (
    <div
      className={`border-2 rounded-xl p-4 ${
        isUrgent
          ? 'bg-aurora-red/5 border-aurora-red/30'
          : 'bg-aurora-yellow/5 border-aurora-yellow/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUrgent ? 'bg-aurora-red/10' : 'bg-aurora-yellow/10'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 ${
              isUrgent ? 'text-aurora-red' : 'text-aurora-yellow'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-polar-night">
            Dispute on Order #{orderNumber}
          </h4>
          <p className="text-sm text-text-secondary mt-1 truncate">
            {gameName} — {reason}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <Clock
              className={`w-3.5 h-3.5 ${
                isUrgent ? 'text-aurora-red' : 'text-text-muted'
              }`}
            />
            <span
              className={isUrgent ? 'text-aurora-red font-medium' : 'text-text-muted'}
            >
              {hoursLeft > 0
                ? `${hoursLeft}h left to respond`
                : 'Deadline passed'}
            </span>
          </div>
        </div>
        <Link href={`/seller/orders/${orderId}/dispute`}>
          <Button variant="primary" size="sm">
            Respond
          </Button>
        </Link>
      </div>
    </div>
  );
}
