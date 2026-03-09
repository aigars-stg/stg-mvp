'use client';

import Image from 'next/image';
import { AlertTriangle } from '@/lib/icons';

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
          <div className="flex flex-wrap gap-2 mt-2">
            {photoUrls.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow"
              >
                <Image
                  src={url}
                  alt={`Dispute evidence ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </a>
            ))}
          </div>
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
