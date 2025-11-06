'use client';

import { Card, Badge } from '@second-turn/design-system';
import type { BGGGame, BGGVersion } from '@/lib/bgg-api';
import type { PhotoFile } from '@/components/sell/PhotoUpload';
import { MapPin, Package, CheckCircle2, AlertCircle, ImageOff, Info } from 'lucide-react';

interface ListingPreviewCardProps {
  selectedGame: BGGGame | null;
  selectedVersion: BGGVersion | null;
  photos: PhotoFile[];
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  price: string;
  shippingOptions: {
    localPickup: boolean;
    parcelLocker: boolean;
  };
}

const CONDITION_LABELS: Record<string, { label: string; variant: any }> = {
  likeNew: { label: 'Like New', variant: 'success' },
  veryGood: { label: 'Very Good', variant: 'success' },
  good: { label: 'Good', variant: 'warning' },
  acceptable: { label: 'Acceptable', variant: 'warning' },
};

export function ListingPreviewCard({
  selectedGame,
  selectedVersion,
  photos,
  condition,
  price,
  shippingOptions,
}: ListingPreviewCardProps) {
  const imageUrl = selectedVersion?.image || selectedVersion?.thumbnail || selectedGame?.image || selectedGame?.thumbnail;
  const hasShipping = shippingOptions.localPickup || shippingOptions.parcelLocker;

  // Check if listing is complete
  const isComplete =
    !!selectedGame &&
    !!selectedVersion &&
    !!condition &&
    !!price &&
    parseFloat(price) > 0 &&
    hasShipping;

  return (
    <div>
      {/* Preview Card */}
      <Card padding="none" className="overflow-hidden border-2 border-frost-ice/30">
        {/* Preview Badge */}
        <div className="bg-frost-ice text-snow-white px-4 py-2 text-center">
          <span className="text-sm font-semibold">Live Preview</span>
        </div>

        {/* Game Image */}
        <div className="relative h-64 bg-bg-secondary flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={selectedGame?.name || 'Game'}
              className="max-w-full max-h-full object-contain p-4"
            />
          ) : (
            <div className="text-center text-text-muted p-8">
              <ImageOff className="w-16 h-16 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a game to see preview</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          {selectedGame ? (
            <div>
              <h3 className="font-bold text-lg text-polar-night line-clamp-2">
                {selectedGame.name}
                {(selectedVersion?.yearPublished || selectedGame.yearPublished) && (
                  <span className="text-text-muted font-normal"> ({selectedVersion?.yearPublished || selectedGame.yearPublished})</span>
                )}
              </h3>
              {selectedVersion && (
                <p className="text-sm text-text-secondary mt-1">
                  {selectedVersion.languages && selectedVersion.languages.length > 0
                    ? selectedVersion.languages.join(' / ')
                    : selectedVersion.language || 'Version selected'}
                  {selectedVersion.publishers && selectedVersion.publishers.length > 0
                    ? ` • ${selectedVersion.publishers.join(' / ')}`
                    : selectedVersion.publisher
                    ? ` • ${selectedVersion.publisher}`
                    : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="text-text-muted">
              <p className="text-sm">No game selected</p>
            </div>
          )}

          {/* Condition & Price */}
          <div className="flex items-center gap-2 flex-wrap">
            {condition ? (
              <Badge variant={CONDITION_LABELS[condition].variant}>
                {CONDITION_LABELS[condition].label}
              </Badge>
            ) : (
              <Badge variant="outline">Condition not set</Badge>
            )}
            {price && parseFloat(price) > 0 ? (
              <div className="text-2xl font-bold text-polar-night">
                €{parseFloat(price).toFixed(2)}
              </div>
            ) : (
              <div className="text-lg text-text-muted">€--</div>
            )}
          </div>

          {/* Photos */}
          {photos.length > 0 ? (
            <div>
              <p className="text-xs text-text-secondary mb-2">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {photos.slice(0, 4).map((photo, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-bg-secondary rounded overflow-hidden border border-border"
                  >
                    <img
                      src={photo.preview}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-text-muted text-sm">
              <span>No photos</span>
            </div>
          )}

          {/* Shipping Options */}
          {hasShipping ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Shipping</p>
              <div className="flex flex-wrap gap-2">
                {shippingOptions.localPickup && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                    <MapPin className="w-3 h-3" />
                    <span>Local Pickup</span>
                  </div>
                )}
                {shippingOptions.parcelLocker && (
                  <div className="flex items-center gap-1 text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                    <Package className="w-3 h-3" />
                    <span>Parcel Locker</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>No shipping options selected</span>
            </div>
          )}

          {/* Completion Status */}
          <div className="pt-3 border-t border-border-subtle">
            {isComplete ? (
              <div className="flex items-center gap-2 text-sm text-frost-ice">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Ready to publish!</span>
              </div>
            ) : (
              <div className="text-xs text-text-muted">
                Complete all required sections to publish
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tips */}
      <Card padding="sm" className="bg-frost-ice/5 border border-frost-ice/20">
        <div className="flex gap-2">
          <div className="text-frost-ice flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs text-text-secondary">
            <p className="font-medium text-polar-night mb-1">Preview Tip</p>
            <p>This is how buyers will see your listing. Make it appealing!</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
