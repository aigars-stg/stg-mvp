'use client';

import { AlertTriangle } from '@/lib/icons';
import { EvidencePhotoGrid } from './EvidencePhotoGrid';

interface DisputeClaimCardProps {
  reason: string | null | undefined;
  description: string | null | undefined;
  photoUrls: string[] | null | undefined;
}

export function DisputeClaimCard({ reason, description, photoUrls }: DisputeClaimCardProps) {
  return (
    <div className="bg-snow-white border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-polar-night mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-aurora-red" />
        Buyer&apos;s Claim
      </h3>
      {reason && (
        <div className="mb-3">
          <span className="text-xs text-text-muted">Reason</span>
          <p className="font-medium text-polar-night capitalize">
            {reason.replace(/_/g, ' ')}
          </p>
        </div>
      )}
      {description && (
        <div className="mb-3">
          <span className="text-xs text-text-muted">Description</span>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}
      {photoUrls && photoUrls.length > 0 && (
        <div>
          <span className="text-xs text-text-muted">
            Photos ({photoUrls.length})
          </span>
          <EvidencePhotoGrid urls={photoUrls} altPrefix="Dispute evidence" />
        </div>
      )}
      {!reason && !description && (
        <p className="text-sm text-text-muted italic">
          No dispute details provided.
        </p>
      )}
    </div>
  );
}
