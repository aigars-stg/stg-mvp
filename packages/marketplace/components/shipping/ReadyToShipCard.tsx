'use client';

import { Button } from '@second-turn/design-system';
import { Truck, LinkExternal as ExternalLink } from '@/lib/icons';
import type { TrackingData } from './types';

interface ReadyToShipCardProps {
  parcelId?: number | string;
  tracking?: TrackingData;
  className?: string;
}

export function ReadyToShipCard({
  parcelId,
  tracking,
  className = '',
}: ReadyToShipCardProps) {
  // Get parcel ID from various sources
  const displayParcelId =
    parcelId ||
    tracking?.parcel_id ||
    (tracking?.label_url?.startsWith('unisend://terminal/')
      ? tracking.label_url.replace('unisend://terminal/', '')
      : null);

  if (!displayParcelId) {
    return null;
  }

  return (
    <div
      className={`bg-frost-ice/10 border-2 border-frost-ice/30 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
          <Truck className="w-6 h-6 text-frost-ice" />
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-polar-night mb-1">
            Ready to Ship
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            Your parcel has been registered with Unisend. Follow these steps to
            ship:
          </p>

          {/* Parcel ID - Main focus */}
          <div className="mb-4 p-4 bg-snow-white rounded-lg border-2 border-frost-ice">
            <p className="text-xs text-text-secondary mb-1">Your Parcel ID</p>
            <p className="font-mono text-2xl font-bold text-frost-ice">
              {displayParcelId}
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                1
              </div>
              <p className="text-sm text-text-secondary">
                Go to your nearest{' '}
                <strong className="text-polar-night">
                  Unisend terminal
                </strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                2
              </div>
              <p className="text-sm text-text-secondary">
                Enter the{' '}
                <strong className="text-polar-night">
                  Parcel ID
                </strong>{' '}
                above at the terminal screen
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                3
              </div>
              <p className="text-sm text-text-secondary">
                <strong className="text-polar-night">
                  Print the label
                </strong>{' '}
                at the terminal and attach it to your parcel
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-frost-ice">
                4
              </div>
              <p className="text-sm text-text-secondary">
                <strong className="text-polar-night">
                  Place the parcel
                </strong>{' '}
                in the locker opened by the terminal
              </p>
            </div>
          </div>

          {/* Only show tracking button when barcode is assigned (after printing at terminal) */}
          {tracking?.barcode && tracking?.tracking_url && (
            <a
              href={tracking.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <ExternalLink className="w-4 h-4 mr-2" />
                Track Package
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
