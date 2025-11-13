'use client';

import { Info } from 'lucide-react';
import type { ListingCondition } from '@/lib/types/listing';

interface MinimumConditionSelectorProps {
  value: ListingCondition | null;
  onChange: (condition: ListingCondition) => void;
}

const conditions: { value: ListingCondition; label: string; description: string }[] = [
  {
    value: 'likeNew',
    label: 'Like New',
    description: 'Appears unplayed or played once. Components pristine.',
  },
  {
    value: 'veryGood',
    label: 'Very Good',
    description: 'Minimal wear. All components present and in great shape.',
  },
  {
    value: 'good',
    label: 'Good',
    description: 'Shows play wear but fully functional. All components present.',
  },
  {
    value: 'acceptable',
    label: 'Acceptable',
    description: 'Significant wear but playable. May have minor damage.',
  },
];

export function MinimumConditionSelector({ value, onChange }: MinimumConditionSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {conditions.map((condition) => {
          const isSelected = value === condition.value;

          return (
            <button
              key={condition.value}
              type="button"
              onClick={() => onChange(condition.value)}
              className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-aurora-orange bg-aurora-orange/10'
                  : 'border-border hover:border-border-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-aurora-orange'
                    : 'border-border'
                }`}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-aurora-orange" />
                  )}
                </div>

                {/* Condition info */}
                <div className="flex-1">
                  <span className="font-medium text-text block">
                    {condition.label}
                  </span>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {condition.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 p-3 bg-aurora-orange/5 border border-aurora-orange/20 rounded-lg">
        <Info className="w-4 h-4 text-aurora-orange mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text-secondary">
          Sellers with games in <strong>better condition</strong> than your minimum can also respond.
          For example, if you select "Good", sellers with "Very Good" or "Like New" can offer.
        </p>
      </div>
    </div>
  );
}
