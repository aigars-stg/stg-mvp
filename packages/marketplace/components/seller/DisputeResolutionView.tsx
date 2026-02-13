'use client';

import {
  CheckCircleAlt01 as CheckCircle2,
  Close as XCircle,
  InfoCircle as Info,
} from '@/lib/icons';

interface DisputeResolutionViewProps {
  resolution: string;
  resolutionNote: string;
  resolvedAt: string;
  /** 'buyer' or 'seller' — whose perspective we're showing */
  viewerRole: 'buyer' | 'seller';
}

const RESOLUTION_LABELS: Record<string, string> = {
  buyer_full_refund: 'Full refund to buyer',
  buyer_partial_refund: 'Partial refund to buyer',
  seller_favor: 'Resolved in seller\'s favour',
  mutual_agreement: 'Mutual agreement',
};

export function DisputeResolutionView({
  resolution,
  resolutionNote,
  resolvedAt,
  viewerRole,
}: DisputeResolutionViewProps) {
  const isFavorable =
    (viewerRole === 'seller' && resolution === 'seller_favor') ||
    (viewerRole === 'buyer' &&
      (resolution === 'buyer_full_refund' ||
        resolution === 'buyer_partial_refund'));

  const resolvedDate = new Date(resolvedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      className={`border-2 rounded-xl p-5 ${
        isFavorable
          ? 'bg-aurora-green/5 border-aurora-green/20'
          : 'bg-bg-elevated border-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {isFavorable ? (
          <CheckCircle2 className="w-5 h-5 text-aurora-green" />
        ) : (
          <XCircle className="w-5 h-5 text-text-muted" />
        )}
        <h3 className="font-semibold text-polar-night">Dispute Resolved</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Outcome</span>
          <span className="font-medium text-polar-night">
            {RESOLUTION_LABELS[resolution] || resolution}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-text-muted">Resolved on</span>
          <span className="text-polar-night">{resolvedDate}</span>
        </div>

        {resolutionNote && (
          <div className="pt-3 border-t border-border">
            <p className="text-text-secondary">{resolutionNote}</p>
          </div>
        )}

        <div className="flex items-start gap-2 pt-3 border-t border-border">
          <Info className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted">
            If you believe this decision was made in error, contact
            support@secondturn.games within 7 days.
          </p>
        </div>
      </div>
    </div>
  );
}
