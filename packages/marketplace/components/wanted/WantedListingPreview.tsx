'use client';

import { Package, MapPin } from 'lucide-react';
import { Card, Badge } from '@second-turn/design-system';
import type { ListingCondition } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import type { BGGGame } from '@/lib/bgg-types';

interface WantedListingPreviewProps {
  selectedGame: BGGGame | null;
  maxPrice: string;
  minimumCondition: ListingCondition | null;
  location: string;
  notes: string;
}

// Helper to get acceptable conditions array from minimum condition
function getAcceptableConditions(minimum: ListingCondition): ListingCondition[] {
  const conditionHierarchy: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];
  const minIndex = conditionHierarchy.indexOf(minimum);
  return conditionHierarchy.slice(0, minIndex + 1);
}

export function WantedListingPreview({
  selectedGame,
  maxPrice,
  minimumCondition,
  location,
  notes,
}: WantedListingPreviewProps) {
  const isComplete = selectedGame && maxPrice && parseFloat(maxPrice) > 0 && minimumCondition;

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="bg-surface-0 rounded-lg border border-border-subtle p-4 space-y-4">
        {/* Game Image & Info */}
        <div className="relative">
          {selectedGame?.thumbnail ? (
            <div className="relative aspect-square flex items-center justify-center bg-surface-1 rounded-lg overflow-hidden">
              <img
                src={selectedGame.thumbnail}
                alt={selectedGame.name}
                className="max-w-full max-h-full object-contain"
              />
              {/* WANTED Badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-aurora-orange backdrop-blur-sm rounded text-xs text-snow-white font-bold uppercase tracking-wide">
                Wanted
              </div>
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center bg-surface-1 rounded-lg">
              <Package className="w-16 h-16 text-text-muted" />
            </div>
          )}
        </div>

        {/* Game Name */}
        <div>
          {selectedGame ? (
            <>
              <h4 className="font-semibold text-text">
                {selectedGame.name}
              </h4>
              {selectedGame.yearPublished && (
                <p className="text-sm text-text-secondary">
                  ({selectedGame.yearPublished})
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Select a game to see preview</p>
          )}
        </div>

        {/* Budget */}
        {maxPrice && parseFloat(maxPrice) > 0 && (
          <div>
            <p className="text-xs text-text-secondary mb-1">Buyer's Budget</p>
            <p className="text-2xl font-bold text-aurora-orange">
              Up to €{parseFloat(maxPrice).toFixed(2)}
            </p>
          </div>
        )}

        {/* Acceptable Conditions */}
        {minimumCondition && (
          <div>
            <p className="text-xs text-text-secondary mb-2">Acceptable Conditions</p>
            <div className="flex flex-wrap gap-2">
              {getAcceptableConditions(minimumCondition).map((condition) => (
                <Badge key={condition} variant={condition as any}>
                  {getConditionLabel(condition)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        )}

        {/* Notes Preview */}
        {notes && (
          <div>
            <p className="text-xs text-text-secondary mb-1">Additional Details</p>
            <p className="text-sm text-text line-clamp-3">
              {notes}
            </p>
          </div>
        )}
      </div>

      {/* Completion Badge */}
      {isComplete && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-5 h-5 rounded-full bg-aurora-green/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-aurora-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-medium text-aurora-green">Ready to post</span>
        </div>
      )}
    </div>
  );
}
