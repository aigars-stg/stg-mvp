'use client';

import Link from 'next/link';
import { Modal, Button } from '@second-turn/design-system';
import { Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench, LinkExternal as ExternalLink } from 'griddy-icons';
import { CONDITION_GRADES } from '../../lib/grading-guide-content';
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
  likeNew: 'bg-northern-lights-green/10 text-northern-lights-green border-northern-lights-green/20',
  veryGood: 'bg-frost-ice/10 text-frost-ice border-frost-ice/20',
  good: 'bg-aurora-orange/10 text-aurora-orange border-aurora-orange/20',
  acceptable: 'bg-aurora-red/10 text-aurora-red/80 border-aurora-red/20',
} as const;

interface ConditionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  condition: ListingCondition;
}

export function ConditionInfoModal({
  isOpen,
  onClose,
  condition,
}: ConditionInfoModalProps) {
  const grade = CONDITION_GRADES[condition];
  const Icon = GRADE_ICONS[condition];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Condition grade"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link
            href="/help/grading-guide"
            target="_blank"
            className="text-frost-ice hover:text-aurora-blue text-sm flex items-center gap-1 transition-colors"
          >
            Full grading guide
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Grade Header */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${GRADE_COLORS[condition]}`}
        >
          <Icon className="w-8 h-8" />
          <div>
            <h3 className="font-bold text-lg text-polar-night">{grade.label}</h3>
            <p className="text-sm text-text-secondary">{grade.shortDescription}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm">{grade.fullDescription}</p>

        {/* What to Expect */}
        <div>
          <h4 className="font-semibold text-polar-night text-sm mb-2">
            What to expect
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-1.5">Box</h5>
              <ul className="space-y-1">
                {grade.boxCriteria.slice(0, 3).map((criterion, index) => (
                  <li
                    key={index}
                    className="text-xs text-text-secondary flex items-start gap-1"
                  >
                    <span className="text-frost-ice/60">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-1.5">Components</h5>
              <ul className="space-y-1">
                {grade.componentCriteria.slice(0, 3).map((criterion, index) => (
                  <li
                    key={index}
                    className="text-xs text-text-secondary flex items-start gap-1"
                  >
                    <span className="text-frost-ice/60">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Value Guidance */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-text-muted">
            Typical value: <span className="font-medium">{grade.valueGuidance}</span> of
            retail price
          </p>
        </div>
      </div>
    </Modal>
  );
}
