'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@second-turn/design-system';
import { Search, PhotoCamera, CurrencyEuro as Euro } from '@/lib/icons';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import { ResearchPhase } from '@/components/sell/phases/ResearchPhase';
import { MarketPhase } from '@/components/sell/phases/MarketPhase';
import { ActionPhase } from '@/components/sell/phases/ActionPhase';
import { ListingPreviewSidebar } from '@/components/sell/ListingPreviewSidebar';
import type { ResearchPhaseProps } from '@/components/sell/phases/ResearchPhase';
import type { MarketPhaseProps } from '@/components/sell/phases/MarketPhase';
import type { ActionPhaseProps } from '@/components/sell/phases/ActionPhase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/auth/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTIONS = {
  RESEARCH: 'research',
  CONDITION: 'condition',
  PRICING: 'pricing',
} as const;

type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS];

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

  // Live preview sidebar
  user: User | null;
  profile: UserProfile | null;

  // Bottom bar
  onPublish: () => void;
  isPublishing: boolean;
  canSubmit: boolean;
  onSaveDraft: () => void;
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
  user,
  profile,
  onPublish,
  isPublishing,
  canSubmit,
  onSaveDraft,
}: DesktopCreateLayoutProps) {
  const tSections = useTranslations('Sell.sections');
  const tCommon = useTranslations('Common');
  const tTerms = useTranslations('Sell.terms');
  const tActions = useTranslations('Sell.actions');
  const tPhases = useTranslations('Phases.listing');

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

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Left column: sections + bottom bar */}
      <div className="lg:col-span-8 space-y-4">
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

        {/* Bottom bar: terms + publish */}
        <div className="border border-border rounded-xl bg-snow-white p-4 sm:p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketProps.formData.termsAccepted}
              onChange={(e) =>
                marketProps.setFormData((prev) => ({
                  ...prev,
                  termsAccepted: e.target.checked,
                }))
              }
              className="mt-1 w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice shrink-0"
            />
            <div className="flex-1 text-sm text-text-secondary">
              {tTerms('prefix')}{' '}
              <a href="/legal/terms" className="text-frost-ice hover:underline">
                {tTerms('termsLink')}
              </a>{' '}
              {tTerms('middle')}
            </div>
          </label>

          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onPublish}
              disabled={isPublishing || !canSubmit}
              className="flex-1"
            >
              {isPublishing ? tActions('publishing') : tPhases('score.publishButton')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onSaveDraft}
              disabled={isPublishing}
            >
              {tActions('saveDraft')}
            </Button>
          </div>
        </div>
      </div>

      {/* Right column: live preview sidebar */}
      <div className="lg:col-span-4">
        <div className="sticky top-8">
          <ListingPreviewSidebar
            formData={marketProps.formData}
            user={user}
            profile={profile}
            existingPhotoUrls={marketProps.existingPhotoUrls}
          />
        </div>
      </div>
    </div>
  );
}
