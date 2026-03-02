'use client';

import { useState } from 'react';
import { Card, Tabs, TabsList, TabsTrigger } from '@second-turn/design-system';
import {  Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench, ShieldCheck, CheckCircleAlt01 as CheckCircle2, AlertCircle, HelpCircle  } from '@/lib/icons';
import { GradingGuidePanel } from './GradingGuidePanel';
import { useTranslations } from 'next-intl';

const CONDITION_OPTIONS = [
  { value: 'likeNew', icon: Star },
  { value: 'veryGood', icon: Sparkles },
  { value: 'good', icon: CircleCheck },
  { value: 'acceptable', icon: Wrench },
] as const;

interface ConditionSelectorProps {
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | null;
  conditionNotes: string;
  allComponentsPresent: boolean;
  missingComponents: string;
  onChange: (field: string, value: string | boolean | null) => void;
}

export function ConditionSelector({
  condition,
  conditionNotes,
  allComponentsPresent,
  missingComponents,
  onChange,
}: ConditionSelectorProps) {
  const tTrust = useTranslations('Sell.ConditionSelector.trustSignal');
  const tComplete = useTranslations('Sell.ConditionSelector.completeness');
  const tCond = useTranslations('Sell.ConditionSelector.condition');
  const tDetails = useTranslations('Sell.ConditionSelector.additionalDetails');

  const [showConditionOptions, setShowConditionOptions] = useState(true);
  const [showGradingGuide, setShowGradingGuide] = useState(false);

  const handleConditionSelect = (value: typeof condition) => {
    onChange('condition', value);
    setShowConditionOptions(false);
  };

  // Helper to get condition label and description
  const getConditionLabel = (value: string) => tCond(value);
  const getConditionDescription = (value: string) => tCond(`${value}Description`);

  // Hide info card once user makes any selection
  const hasAnySelection = allComponentsPresent !== null || condition !== null;

  // Get selected condition details
  const selectedCondition = CONDITION_OPTIONS.find(opt => opt.value === condition);

  return (
    <div className="space-y-3">
      {/* Trust Signal - Show at start, hide after any selection */}
      {!hasAnySelection && (
        <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
          <div className="flex gap-3">
            <div className="text-frost-ice flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-semibold text-polar-night mb-1">
                {tTrust('title')}
              </div>
              <div className="text-text-secondary">
                {tTrust('description')}
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Component Completeness */}
      <div>
        <h3 className="text-sm font-semibold text-polar-night mb-2">
          {tComplete('question')}
        </h3>

        <Tabs
          variant="toggle"
          size="sm"
          value={allComponentsPresent === null ? '' : allComponentsPresent ? 'yes' : 'no'}
          onValueChange={(v) => onChange('allComponentsPresent', v === 'yes')}
        >
          <TabsList>
            <TabsTrigger value="yes" icon={<CheckCircle2 className="w-4 h-4" />} activeColor="green">
              {tComplete('yesComplete')}
            </TabsTrigger>
            <TabsTrigger value="no" icon={<AlertCircle className="w-4 h-4" />} activeColor="orange">
              {tComplete('noIncomplete')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {allComponentsPresent === false && (
          <div className="mt-2">
            <label className="text-sm font-medium text-polar-night mb-2 block">
              {tComplete('whatsMissing')}
            </label>
            <textarea
              value={missingComponents || ''}
              onChange={(e) => onChange('missingComponents', e.target.value)}
              placeholder={tComplete('placeholder')}
              className="w-full h-24 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice resize-none"
            />
          </div>
        )}
      </div>

      {/* Condition Selection */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-polar-night mb-2 flex items-center gap-2">
          {tCond('title')}
          <button
            type="button"
            onClick={() => setShowGradingGuide(true)}
            className="text-frost-ice hover:text-aurora-blue transition-colors"
            aria-label={tCond('openGuide')}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </h3>

        {showConditionOptions || condition === null ? (
          <div className="grid grid-cols-1 gap-2">
            {CONDITION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleConditionSelect(option.value)}
                  className={`
                    p-3 border-2 rounded-lg text-left transition-all flex items-center gap-3
                    ${
                      condition === option.value
                        ? 'border-frost-ice bg-frost-ice/5'
                        : 'border-border hover:border-frost-ice/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 text-frost-ice flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-polar-night mb-1">{getConditionLabel(option.value)}</div>
                    <div className="text-sm text-text-secondary">{getConditionDescription(option.value)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : selectedCondition ? (
          /* Compact view when selected */
          <div className="p-2.5 border border-border rounded-lg bg-bg-secondary/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {(() => {
                  const Icon = selectedCondition.icon;
                  return <Icon className="w-5 h-5 text-frost-ice flex-shrink-0" />;
                })()}
                <div className="flex-1">
                  <div className="font-semibold text-polar-night text-sm">
                    {getConditionLabel(selectedCondition.value)}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {getConditionDescription(selectedCondition.value)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConditionOptions(true)}
                className="text-xs text-frost-ice hover:text-frost-ice/80 font-medium whitespace-nowrap"
              >
                {tComplete('change')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Additional Details */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-polar-night mb-2">
          {tDetails('title')} {condition === 'acceptable' ? tDetails('required') : tDetails('optional')}
        </h3>
        <p className="text-sm text-text-secondary mb-2">
          {condition === 'acceptable'
            ? tDetails('descriptionRequired')
            : tDetails('descriptionOptional')}
        </p>
        <textarea
          value={conditionNotes || ''}
          onChange={(e) => onChange('conditionNotes', e.target.value)}
          placeholder={
            condition === 'acceptable'
              ? tDetails('placeholderAcceptable')
              : tDetails('placeholderOptional')
          }
          className="w-full h-24 px-3 py-2 rounded-lg border-2 border-border focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 resize-none"
          maxLength={500}
        />
        <p className="text-xs text-text-muted mt-1">
          {tDetails('characterCount', { count: (conditionNotes || '').length })}
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
