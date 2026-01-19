'use client';

import { LinkExternal as ExternalLink } from 'griddy-icons';
import type { TrackingData } from './types';

interface TrackingNumberCardProps {
  tracking: TrackingData;
  title?: string;
  compact?: boolean;
  className?: string;
}

export function TrackingNumberCard({
  tracking,
  title = 'Tracking Number',
  compact = false,
  className = '',
}: TrackingNumberCardProps) {
  if (!tracking.barcode) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-text-secondary">{title}:</span>
        <span className="font-mono text-sm font-bold text-frost-ice">
          {tracking.barcode}
        </span>
        {tracking.tracking_url && (
          <a
            href={tracking.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-frost-ice hover:underline"
            title="Track Package"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-frost-ice/10 border border-frost-ice/20 rounded-lg ${className}`}
    >
      <p className="text-sm font-medium text-polar-night dark:text-snow-white mb-2">
        {title}
      </p>
      <p className="font-mono text-lg font-bold text-frost-ice">
        {tracking.barcode}
      </p>
      {tracking.tracking_url && (
        <a
          href={tracking.tracking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-frost-ice hover:underline mt-2"
        >
          Track Package
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
