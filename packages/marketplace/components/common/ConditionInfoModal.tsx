'use client';

import Link from 'next/link';
import { Modal, Button } from '@second-turn/design-system';
import { Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench, LinkExternal as ExternalLink } from 'griddy-icons';
import type { ListingCondition } from '../../lib/types/listing';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Common.ConditionInfoModal');
  const tGrades = useTranslations('Sell.GradingGuidePanel.grades');
  const Icon = GRADE_ICONS[condition];

  // Get translated grade content
  const label = tGrades(`${condition}.label`);
  const shortDescription = tGrades(`${condition}.shortDescription`);
  const fullDescription = tGrades(`${condition}.fullDescription`);
  const valueGuidance = tGrades(`${condition}.valueGuidance`);
  const boxCriteria = tGrades.raw(`${condition}.boxCriteria`) as string[];
  const componentCriteria = tGrades.raw(`${condition}.componentCriteria`) as string[];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link
            href="/help/grading-guide"
            target="_blank"
            className="text-frost-ice hover:text-aurora-blue text-sm flex items-center gap-1 transition-colors"
          >
            {t('fullGradingGuide')}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
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
            <h3 className="font-bold text-lg text-polar-night">{label}</h3>
            <p className="text-sm text-text-secondary">{shortDescription}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm">{fullDescription}</p>

        {/* What to Expect */}
        <div>
          <h4 className="font-semibold text-polar-night text-sm mb-2">
            {t('whatToExpect')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-1.5">{t('box')}</h5>
              <ul className="space-y-1">
                {boxCriteria.slice(0, 3).map((criterion: string, index: number) => (
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
              <h5 className="text-xs font-medium text-text-muted mb-1.5">{t('components')}</h5>
              <ul className="space-y-1">
                {componentCriteria.slice(0, 3).map((criterion: string, index: number) => (
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
            {t('typicalValue')} <span className="font-medium">{valueGuidance}</span> {t('ofRetailPrice')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
