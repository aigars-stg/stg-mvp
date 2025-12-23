'use client';

import { useState } from 'react';
import { Card } from '@second-turn/design-system';
import { Star, Sparkles, CircleCheck, Wrench, ShieldCheck, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { GradingGuidePanel } from './GradingGuidePanel';

const CONDITION_OPTIONS = [
  {
    value: 'likeNew',
    label: 'Like New',
    icon: Star,
    description: 'Almost no visible wear',
  },
  {
    value: 'veryGood',
    label: 'Very Good',
    icon: Sparkles,
    description: 'Minor wear, excellent condition',
  },
  {
    value: 'good',
    label: 'Good',
    icon: CircleCheck,
    description: 'Moderate wear, fully functional',
  },
  {
    value: 'acceptable',
    label: 'Acceptable',
    icon: Wrench,
    description: 'Heavy wear, still playable',
  },
] as const;

interface ConditionSelectorProps {
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  onChange: (field: string, value: any) => void;
}

export function ConditionSelector({
  condition,
  conditionNotes,
  allComponentsPresent,
  missingComponents,
  onChange,
}: ConditionSelectorProps) {
  const [showCompletenessOptions, setShowCompletenessOptions] = useState(true);
  const [showConditionOptions, setShowConditionOptions] = useState(true);
  const [showGradingGuide, setShowGradingGuide] = useState(false);

  const handleConditionSelect = (value: typeof condition) => {
    onChange('condition', value);
    setShowConditionOptions(false);
  };

  // Hide info card once user makes any selection
  const hasAnySelection = allComponentsPresent !== null || condition !== null;

  // Get selected condition details
  const selectedCondition = CONDITION_OPTIONS.find(opt => opt.value === condition);

  return (
    <div className="space-y-6">
      {/* Trust Signal - Show at start, hide after any selection */}
      {!hasAnySelection && (
        <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
          <div className="flex gap-3">
            <div className="text-frost-ice flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-polar-night mb-1">
                Honest descriptions build trust
              </div>
              <div className="text-text-secondary">
                Accurate condition information helps buyers make confident decisions.
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Component Completeness */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
          Are all original components included? *
        </h3>

        {showCompletenessOptions || allComponentsPresent === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                onChange('allComponentsPresent', true);
                setShowCompletenessOptions(false);
              }}
              className={`
                p-3 sm:p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3
                ${
                  allComponentsPresent
                    ? 'border-frost-ice bg-frost-ice/5'
                    : 'border-border hover:border-frost-ice/50'
                }
              `}
            >
              <CheckCircle2 className="w-5 h-5 text-frost-ice flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-polar-night">Yes, complete</div>
                <div className="text-xs sm:text-sm text-text-secondary">All pieces included</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange('allComponentsPresent', false);
                setShowCompletenessOptions(false);
              }}
              className={`
                p-3 sm:p-4 border-2 rounded-lg text-left transition-all flex items-center gap-3
                ${
                  allComponentsPresent === false
                    ? 'border-frost-ice bg-frost-ice/5'
                    : 'border-border hover:border-frost-ice/50'
                }
              `}
            >
              <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-polar-night">No, incomplete</div>
                <div className="text-xs sm:text-sm text-text-secondary">Some pieces missing</div>
              </div>
            </button>
          </div>
        ) : allComponentsPresent === false ? (
          /* Compact view for "No, incomplete" - show selected option with Change button */
          <div className="p-3 border-2 border-frost-ice bg-frost-ice/5 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-polar-night text-sm">No, incomplete</div>
                  <div className="text-xs text-text-secondary">Some pieces missing</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletenessOptions(true)}
                className="text-sm text-frost-ice hover:text-frost-ice/80 font-medium whitespace-nowrap"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          /* Compact view when selected */
          <div className="p-3 border-2 border-border rounded-lg bg-bg-secondary/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {allComponentsPresent ? (
                  <CheckCircle2 className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-polar-night text-sm">
                    {allComponentsPresent ? 'Yes, complete' : 'No, incomplete'}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {allComponentsPresent
                      ? 'All pieces included'
                      : missingComponents
                        ? `Missing: ${missingComponents.substring(0, 50)}${missingComponents.length > 50 ? '...' : ''}`
                        : 'Some pieces missing'
                    }
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletenessOptions(true)}
                className="text-sm text-frost-ice hover:text-frost-ice/80 font-medium whitespace-nowrap"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {allComponentsPresent === false && (
          <div className="mt-3">
            <label className="text-sm font-medium text-polar-night mb-2 block">
              What's missing? *
            </label>
            <textarea
              value={missingComponents || ''}
              onChange={(e) => onChange('missingComponents', e.target.value)}
              placeholder="e.g., Missing 2 red cubes and 1 action card"
              className="w-full h-24 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice resize-none"
            />
          </div>
        )}
      </div>

      {/* Condition Selection */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3 flex items-center gap-2">
          Overall Condition *
          <button
            type="button"
            onClick={() => setShowGradingGuide(true)}
            className="text-frost-ice hover:text-aurora-blue transition-colors"
            aria-label="Open grading guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </h3>

        {showConditionOptions || condition === null ? (
          <div className="grid grid-cols-1 gap-3">
            {CONDITION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleConditionSelect(option.value)}
                  className={`
                    p-4 border-2 rounded-lg text-left transition-all min-h-[60px] flex items-center gap-3
                    ${
                      condition === option.value
                        ? 'border-frost-ice bg-frost-ice/5'
                        : 'border-border hover:border-frost-ice/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 text-frost-ice flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-polar-night mb-1">{option.label}</div>
                    <div className="text-sm text-text-secondary">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : selectedCondition ? (
          /* Compact view when selected */
          <div className="p-3 border-2 border-border rounded-lg bg-bg-secondary/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {(() => {
                  const Icon = selectedCondition.icon;
                  return <Icon className="w-5 h-5 text-frost-ice flex-shrink-0" />;
                })()}
                <div className="flex-1">
                  <div className="font-semibold text-polar-night text-sm">
                    {selectedCondition.label}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {selectedCondition.description}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConditionOptions(true)}
                className="text-sm text-frost-ice hover:text-frost-ice/80 font-medium whitespace-nowrap"
              >
                Change
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Additional Details */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-polar-night mb-3">
          Additional Details {condition === 'acceptable' ? '*' : '(Optional)'}
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          {condition === 'acceptable'
            ? 'Please describe in more detail'
            : 'Describe any extras, or other important details'}
        </p>
        <textarea
          value={conditionNotes || ''}
          onChange={(e) => onChange('conditionNotes', e.target.value)}
          placeholder={
            condition === 'acceptable'
              ? 'e.g., Box has water damage on one corner, manual has torn pages, all components present and functional'
              : 'e.g., Cards are sleeved. Custom insert included.'
          }
          className="w-full h-32 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 resize-none"
          maxLength={500}
        />
        <p className="text-xs text-text-muted mt-1">
          {(conditionNotes || '').length}/500 characters
        </p>
      </div>

      {/* Grading Guide Panel */}
      <GradingGuidePanel
        isOpen={showGradingGuide}
        onClose={() => setShowGradingGuide(false)}
        highlightedCondition={condition}
      />
    </div>
  );
}
