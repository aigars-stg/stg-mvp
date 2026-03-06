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

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['research']),
  );

  const toggleSection = (id: string, enabled: boolean) => {
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
        if (prev.has('condition')) return prev;
        return new Set([...prev, 'condition']);
      });
    }
  }, [isResearchComplete]);

  // In desktop mode, "edit" links in ScorePhase open the relevant section
  const SECTION_BY_PHASE_INDEX: Record<number, string> = {
    0: 'research',
    1: 'condition',
    2: 'pricing',
  };
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
        isExpanded={openSections.has('research')}
        onToggle={() => toggleSection('research', true)}
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
        isExpanded={openSections.has('condition')}
        onToggle={() => toggleSection('condition', isResearchComplete)}
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
        isExpanded={openSections.has('pricing')}
        onToggle={() =>
          toggleSection('pricing', !!marketProps.formData.condition)
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
        isExpanded={openSections.has('review')}
        onToggle={() => toggleSection('review', isActionComplete)}
        isComplete={false}
        disabled={!isActionComplete}
      >
        <ScorePhase {...scoreProps} goToPhase={handleGoToSection} />
      </CollapsibleSection>
    </div>
  );
}
