'use client';

import { useLocale } from 'next-intl';
import { User, Time as Clock } from '@/lib/icons';
import { formatDateTime } from '@/lib/date-utils';

interface DisputeSellerResponseProps {
  response: string | null | undefined;
  respondedAt: string | null | undefined;
  deadline: string | null | undefined;
}

export function DisputeSellerResponse({ response, respondedAt, deadline }: DisputeSellerResponseProps) {
  const locale = useLocale();
  return (
    <div className="bg-snow-white border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
        <User className="w-4 h-4 text-frost-ice" />
        Seller&apos;s Response
      </h3>
      {response ? (
        <>
          <p className="text-sm text-text-secondary whitespace-pre-wrap mb-2">
            {response}
          </p>
          {respondedAt && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Responded {formatDateTime(respondedAt, locale)}
            </p>
          )}
        </>
      ) : (
        <div className="text-sm text-text-muted italic">
          {deadline ? (
            <p>
              Awaiting seller response. Deadline: {formatDateTime(deadline, locale)}
            </p>
          ) : (
            <p>No response from seller yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
