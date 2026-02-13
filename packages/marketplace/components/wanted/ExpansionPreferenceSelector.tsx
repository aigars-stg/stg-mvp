'use client';

import { Card } from '@second-turn/design-system';
import { PuzzlePiece as Puzzle, Check } from '@/lib/icons';
import { useTranslations } from 'next-intl';

export type ExpansionPreference = 'base_only' | 'expansions_welcome';

interface ExpansionPreferenceSelectorProps {
  value: ExpansionPreference;
  onChange: (value: ExpansionPreference) => void;
}

/**
 * ExpansionPreferenceSelector - V1 Simple two-option selector
 *
 * Options:
 * 1. Base game only (default) - "I just want the base game"
 * 2. Expansions welcome - "I'm open to bundles with expansions"
 *
 * V2 (future): Add "Looking for specific expansions" with expansion picker UI
 */
export function ExpansionPreferenceSelector({
  value,
  onChange,
}: ExpansionPreferenceSelectorProps) {
  const t = useTranslations('Wanted.ExpansionPreferenceSelector');

  type TranslationKey = 'baseOnly' | 'baseOnlyDesc' | 'expansionsWelcome' | 'expansionsWelcomeDesc';
  const options: { value: ExpansionPreference; labelKey: TranslationKey; descKey: TranslationKey }[] = [
    { value: 'base_only', labelKey: 'baseOnly', descKey: 'baseOnlyDesc' },
    { value: 'expansions_welcome', labelKey: 'expansionsWelcome', descKey: 'expansionsWelcomeDesc' },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <Card
            key={option.value}
            padding="md"
            className={`cursor-pointer transition-all ${
              isSelected
                ? 'border-2 border-aurora-orange bg-aurora-orange/5 ring-2 ring-aurora-orange/20'
                : 'border border-border hover:border-aurora-orange/50 hover:bg-aurora-orange/5'
            }`}
            onClick={() => onChange(option.value)}
          >
            <div className="flex items-start gap-3">
              {/* Radio indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isSelected
                    ? 'border-aurora-orange bg-aurora-orange'
                    : 'border-border bg-surface-0'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Puzzle className={`w-4 h-4 ${isSelected ? 'text-aurora-orange' : 'text-text-muted'}`} />
                  <span className={`font-medium ${isSelected ? 'text-polar-night' : 'text-text'}`}>
                    {t(option.labelKey)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1 ml-6">
                  {t(option.descKey)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
