'use client';

import { InfoCircle as Info } from '@/lib/icons';
import type { ListingCondition } from '@/lib/types/listing';
import { useTranslations } from 'next-intl';

interface MinimumConditionSelectorProps {
  value: ListingCondition | null;
  onChange: (condition: ListingCondition) => void;
}

const conditionValues: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];

export function MinimumConditionSelector({ value, onChange }: MinimumConditionSelectorProps) {
  const t = useTranslations('Wanted.MinimumConditionSelector');
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {conditionValues.map((conditionValue) => {
          const isSelected = value === conditionValue;

          return (
            <button
              key={conditionValue}
              type="button"
              onClick={() => onChange(conditionValue)}
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
                    {t(`conditions.${conditionValue}.label`)}
                  </span>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {t(`conditions.${conditionValue}.description`)}
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
        <p className="text-sm text-text-secondary" dangerouslySetInnerHTML={{ __html: t.raw('helpText') }} />
      </div>
    </div>
  );
}
