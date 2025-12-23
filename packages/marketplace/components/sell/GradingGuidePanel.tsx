'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SlidePanel, Card } from '@second-turn/design-system';
import {
  Star,
  Sparkles,
  CircleCheck,
  Wrench,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import {
  CONDITION_GRADES,
  SPECIAL_CONSIDERATIONS,
  GRADING_PHILOSOPHY,
} from '../../lib/grading-guide-content';
import type { ListingCondition } from '../../lib/types/listing';

// Grade icons mapping
const GRADE_ICONS = {
  likeNew: Star,
  veryGood: Sparkles,
  good: CircleCheck,
  acceptable: Wrench,
} as const;

// Grade colors for visual distinction
const GRADE_COLORS = {
  likeNew: 'border-northern-lights-green bg-northern-lights-green/5',
  veryGood: 'border-frost-ice bg-frost-ice/5',
  good: 'border-aurora-orange bg-aurora-orange/5',
  acceptable: 'border-aurora-red/60 bg-aurora-red/5',
} as const;

const GRADE_ICON_COLORS = {
  likeNew: 'text-northern-lights-green',
  veryGood: 'text-frost-ice',
  good: 'text-aurora-orange',
  acceptable: 'text-aurora-red/80',
} as const;

interface GradingGuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedCondition?: ListingCondition | null;
}

function GradeItem({
  gradeKey,
  isHighlighted,
}: {
  gradeKey: ListingCondition;
  isHighlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(isHighlighted);
  const grade = CONDITION_GRADES[gradeKey];
  const Icon = GRADE_ICONS[gradeKey];

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all ${
        GRADE_COLORS[gradeKey]
      } ${isHighlighted ? 'ring-2 ring-frost-ice ring-offset-2' : ''}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${GRADE_ICON_COLORS[gradeKey]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-polar-night">
                  {grade.label}
                  {isHighlighted && (
                    <span className="ml-2 text-xs font-normal text-frost-ice">
                      (selected)
                    </span>
                  )}
                </h3>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {grade.valueGuidance}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                {grade.shortDescription}
              </p>
            </div>
            <div className="flex-shrink-0 text-text-muted">
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 border-t border-border/30">
          <p className="text-xs text-text-muted mt-3 mb-3">{grade.fullDescription}</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Box Criteria */}
            <div>
              <h4 className="text-xs font-semibold text-polar-night mb-2">Box</h4>
              <ul className="space-y-1">
                {grade.boxCriteria.slice(0, 3).map((criterion, index) => (
                  <li key={index} className="text-xs text-text-muted flex items-start gap-1">
                    <span className="text-frost-ice/60">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Component Criteria */}
            <div>
              <h4 className="text-xs font-semibold text-polar-night mb-2">Components</h4>
              <ul className="space-y-1">
                {grade.componentCriteria.slice(0, 3).map((criterion, index) => (
                  <li key={index} className="text-xs text-text-muted flex items-start gap-1">
                    <span className="text-frost-ice/60">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {grade.proTip && (
            <div className="mt-3 p-2 bg-frost-ice/10 rounded text-xs text-text-secondary flex gap-2 items-start">
              <Lightbulb className="w-3 h-3 text-frost-ice flex-shrink-0 mt-0.5" />
              <span>{grade.proTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GradingGuidePanel({
  isOpen,
  onClose,
  highlightedCondition,
}: GradingGuidePanelProps) {
  const [activeTab, setActiveTab] = useState<'grades' | 'tips'>('grades');

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title="Condition grading guide"
      size="md"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'grades'
                ? 'bg-frost-ice text-snow-white'
                : 'text-text-secondary hover:text-polar-night'
            }`}
          >
            Grades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tips')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'tips'
                ? 'bg-frost-ice text-snow-white'
                : 'text-text-secondary hover:text-polar-night'
            }`}
          >
            Tips
          </button>
        </div>

        {activeTab === 'grades' && (
          <>
            {/* Grade Cards */}
            <div className="space-y-3">
              {(['likeNew', 'veryGood', 'good', 'acceptable'] as ListingCondition[]).map(
                (gradeKey) => (
                  <GradeItem
                    key={gradeKey}
                    gradeKey={gradeKey}
                    isHighlighted={highlightedCondition === gradeKey}
                  />
                )
              )}
            </div>

            {/* Philosophy */}
            <Card padding="sm" className="bg-frost-ice/5 border border-frost-ice/20">
              <h3 className="font-semibold text-polar-night text-sm mb-1">
                {GRADING_PHILOSOPHY.title}
              </h3>
              <p className="text-xs text-text-secondary">{GRADING_PHILOSOPHY.content}</p>
            </Card>
          </>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-4">
            {/* Special Considerations */}
            <div>
              <h3 className="font-semibold text-polar-night mb-3">
                Special Considerations
              </h3>
              <div className="space-y-3">
                {Object.entries(SPECIAL_CONSIDERATIONS).map(([key, consideration]) => (
                  <Card key={key} padding="sm" className="border border-border/50">
                    <h4 className="font-medium text-polar-night text-sm mb-1">
                      {consideration.title}
                    </h4>
                    <p className="text-xs text-text-muted mb-2">
                      {consideration.description}
                    </p>
                    <ul className="space-y-1">
                      {consideration.details.slice(0, 3).map((detail, index) => (
                        <li
                          key={index}
                          className="text-xs text-text-muted flex items-start gap-1"
                        >
                          <span className="text-frost-ice/60">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <Card padding="sm" className="bg-aurora-orange/5 border border-aurora-orange/20">
              <h4 className="font-medium text-polar-night text-sm mb-2">Quick tips</h4>
              <ul className="space-y-1.5 text-xs text-text-secondary">
                <li className="flex items-start gap-1">
                  <span className="text-aurora-orange">•</span>
                  When in doubt, grade down - buyers love positive surprises
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-aurora-orange">•</span>
                  Use natural daylight for photos
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-aurora-orange">•</span>
                  Mention sleeved cards as a positive
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-aurora-orange">•</span>
                  Be specific about any damage
                </li>
              </ul>
            </Card>
          </div>
        )}

        {/* Link to full guide */}
        <div className="pt-4 border-t border-border">
          <Link
            href="/help/grading-guide"
            target="_blank"
            className="flex items-center justify-center gap-2 text-frost-ice hover:text-aurora-blue text-sm font-medium transition-colors"
          >
            View full grading guide
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </SlidePanel>
  );
}
