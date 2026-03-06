'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, PhotoCamera, CurrencyEuro as Euro, ClipboardCheck } from '@/lib/icons';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import { ResearchPhase } from '@/components/sell/phases/ResearchPhase';
import { MarketPhase } from '@/components/sell/phases/MarketPhase';
import { ActionPhase } from '@/components/sell/phases/ActionPhase';
import { ScorePhase } from '@/components/sell/phases/ScorePhase';
import type { ResearchPhaseProps } from '@/components/sell/phases/ResearchPhase';
import type { MarketPhaseProps } from '@/components/sell/phases/MarketPhase';
import type { ActionPhaseProps } from '@/components/sell/phases/ActionPhase';
import type { ScorePhaseProps } from '@/components/sell/phases/ScorePhase';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTIONS = {
  RESEARCH: 'research',
  CONDITION: 'condition',
  PRICING: 'pricing',
  REVIEW: 'review',
} as const;

type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS];

// Maps phase index (from ScorePhase edit links) to desktop section ID
const SECTION_BY_PHASE_INDEX: Record<number, SectionId> = {
  0: SECTIONS.RESEARCH,
  1: SECTIONS.CONDITION,
  2: SECTIONS.PRICING,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DesktopCreateLayoutProps {
  // Research phase (game selection)
  researchProps: Omit<ResearchPhaseProps, 'onAdvance' | 'isPhaseComplete'>;
  isResearchComplete: boolean;

  // Market phase (condition + photos)
  marketProps: Omit<MarketPhaseProps, 'onAdvance' | 'isPhaseComplete'>;
  isMarketComplete: boolean;

  // Action phase (pricing)
  actionProps: Omit<ActionPhaseProps, 'onAdvance' | 'isPhaseComplete'>;
  isActionComplete: boolean;

  // Score phase (review + publish)
  scoreProps: ScorePhaseProps;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DesktopCreateLayout({
  researchProps,
  isResearchComplete,
  marketProps,
  isMarketComplete,
  actionProps,
  isActionComplete,
  scoreProps,
}: DesktopCreateLayoutProps) {
  const tSections = useTranslations('Sell.sections');
  const tCommon = useTranslations('Common');

  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set([SECTIONS.RESEARCH]),
  );

  const toggleSection = (id: SectionId, enabled: boolean) => {
    if (!enabled) return;
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Auto-open condition section when research becomes complete
  useEffect(() => {
    if (isResearchComplete) {
      setOpenSections((prev) => {
        if (prev.has(SECTIONS.CONDITION)) return prev;
        return new Set([...prev, SECTIONS.CONDITION]);
      });
    }
  }, [isResearchComplete]);

  // In desktop mode, "edit" links in ScorePhase open the relevant section
  const handleGoToSection = (index: number) => {
    const sectionId = SECTION_BY_PHASE_INDEX[index];
    if (sectionId) {
      setOpenSections((prev) => new Set([...prev, sectionId]));
    }
  };

  return (
    <div className="space-y-4">
      {/* Research Section — always enabled */}
      <CollapsibleSection
        title={tSections('research.title')}
        icon={<Search className="w-5 h-5 text-frost-ice" />}
        isExpanded={openSections.has(SECTIONS.RESEARCH)}
        onToggle={() => toggleSection(SECTIONS.RESEARCH, true)}
        isComplete={isResearchComplete}
      >
        <ResearchPhase
          {...researchProps}
          isPhaseComplete={isResearchComplete}
        />
      </CollapsibleSection>

      {/* Condition & Photos Section — enabled after research */}
      <CollapsibleSection
        title={tSections('condition.title')}
        subtitle={!isResearchComplete ? tCommon('completeResearchFirst') : undefined}
        icon={<PhotoCamera className="w-5 h-5 text-frost-ice" />}
        isExpanded={openSections.has(SECTIONS.CONDITION)}
        onToggle={() => toggleSection(SECTIONS.CONDITION, isResearchComplete)}
        isComplete={isMarketComplete}
        disabled={!isResearchComplete}
      >
        <MarketPhase {...marketProps} />
      </CollapsibleSection>

      {/* Pricing Section — enabled after condition selected */}
      <CollapsibleSection
        title={tSections('pricing.title')}
        subtitle={!marketProps.formData.condition ? tCommon('selectConditionFirst') : undefined}
        icon={<Euro className="w-5 h-5 text-frost-ice" />}
        isExpanded={openSections.has(SECTIONS.PRICING)}
        onToggle={() =>
          toggleSection(SECTIONS.PRICING, !!marketProps.formData.condition)
        }
        isComplete={isActionComplete}
        disabled={!marketProps.formData.condition}
      >
        <ActionPhase {...actionProps} />
      </CollapsibleSection>

      {/* Review & List Section — enabled after pricing complete */}
      <CollapsibleSection
        title={tSections('review.title')}
        icon={<ClipboardCheck className="w-5 h-5 text-frost-ice" />}
        isExpanded={openSections.has(SECTIONS.REVIEW)}
        onToggle={() => toggleSection(SECTIONS.REVIEW, isActionComplete)}
        isComplete={false}
        disabled={!isActionComplete}
      >
        <ScorePhase {...scoreProps} goToPhase={handleGoToSection} />
      </CollapsibleSection>
    </div>
  );
}
