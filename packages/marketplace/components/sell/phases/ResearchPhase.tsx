/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@second-turn/design-system';
import { GameSearch } from '@/components/sell/GameSearch';
import { GameNameSelector } from '@/components/sell/GameNameSelector';
import { LanguageVersionSelector } from '@/components/sell/LanguageVersionSelector';
import { ExpansionSelector, type SelectedExpansion } from '@/components/sell/ExpansionSelector';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import {
  AlertCircle,
  PuzzlePiece as Puzzle,
} from '@/lib/icons';
import type { BGGGame } from '@/lib/bgg-api';
import type { BGGExpansionInfo } from '@/lib/bgg-api';
import type { BGGVersion, VersionSelection } from '@/lib/bgg-types';
import type { ListingFormData } from '@/lib/hooks/useListingForm';
import { formatDate } from '@/lib/date-utils';
import { formatPrice } from '@/lib/services/pricing';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ResearchPhaseProps {
  // Core form state
  formData: ListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<ListingFormData>>;
  onAdvance: () => void;
  isPhaseComplete: boolean;

  // Game selection handlers
  handleGameSelect: (game: BGGGame | null) => Promise<void>;
  handleVersionSelect: (version: VersionSelection) => void;
  handleChangeVersion: () => void;
  handleChangeName: () => void;
  handleExpansionsChange: (expansions: SelectedExpansion[]) => void;
  handleEnableExpansions: () => Promise<void>;
  handleDisableExpansions: () => void;

  // Loading state
  isLoadingGameDetails: boolean;

  // Fallback
  fallbackMode: boolean;
  fallbackReason: string | undefined;

  // Versions
  versionCount: number;
  prefetchedVersions: BGGVersion[] | null;

  // Expansions
  expansionCount: number;
  availableExpansions: BGGExpansionInfo[];
  isLoadingExpansions: boolean;
  showExpansionSection: boolean;

  // Existing active listings warning
  existingActiveListings: Array<{
    id: string;
    bgg_game_id: number;
    price: number;
    created_at: string;
  }>;

  // Search pre-fill
  initialSearchQuery?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResearchPhase({
  formData,
  setFormData,
  onAdvance,
  isPhaseComplete,
  handleGameSelect,
  handleVersionSelect,
  handleChangeVersion,
  handleChangeName,
  handleExpansionsChange,
  handleEnableExpansions,
  handleDisableExpansions,
  isLoadingGameDetails,
  fallbackMode,
  fallbackReason,
  versionCount,
  prefetchedVersions,
  expansionCount,
  availableExpansions,
  isLoadingExpansions,
  showExpansionSection,
  existingActiveListings,
  initialSearchQuery,
}: ResearchPhaseProps) {
  const tSections = useTranslations('Sell.sections');
  const tExisting = useTranslations('Sell.existingListings');
  const t = useTranslations('Sell.page');
  const tPhases = useTranslations('Phases.listing');

  const setFormField = useCallback(
    <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [setFormData],
  );

  // Compute change link visibility for GameSearch inline display
  const showChangeVersion = formData.selectedGame && formData.selectedVersion
    && !isLoadingGameDetails && versionCount > 1;

  const showChangeName = formData.selectedGame && formData.selectedVersion
    && !isLoadingGameDetails
    && (formData.selectedGame.alternateNames?.length ?? 0) > 0
    && !(formData.selectedVersion?.languages?.includes('English')
         || formData.selectedVersion?.language === 'English')
    && !!formData.selectedGameDisplayName;

  return (
    <div className="space-y-4">
      {/* Game Selection Section */}
      <Card padding="md">
        <div className="space-y-4">
          <GameSearch
            selectedGame={formData.selectedGame}
            selectedVersion={formData.selectedVersion}
            selectedDisplayName={formData.selectedGameDisplayName}
            onSelect={handleGameSelect}
            onChangeVersion={showChangeVersion ? handleChangeVersion : undefined}
            onChangeName={showChangeName ? handleChangeName : undefined}
            initialQuery={initialSearchQuery}
          />

          {/* Only show version selector when game is selected but version is not */}
          {formData.selectedGame && !formData.selectedVersion && (
            <>
              {isLoadingGameDetails ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
                  <p className="mt-4 text-text-secondary">
                    {t('loadingGameDetails')}
                  </p>
                </div>
              ) : (
                <LanguageVersionSelector
                  game={formData.selectedGame}
                  selectedVersion={formData.selectedVersion}
                  onSelect={handleVersionSelect}
                  fallbackMode={fallbackMode}
                  fallbackReason={fallbackReason}
                  onVersionCountChange={() => {}}
                  initialVersions={prefetchedVersions ?? undefined}
                />
              )}
            </>
          )}

          {/* Show game name selector AFTER version is selected */}
          {formData.selectedGame &&
            formData.selectedVersion &&
            !isLoadingGameDetails && (
              <GameNameSelector
                primaryName={formData.selectedGame.name}
                alternateNames={formData.selectedGame.alternateNames || null}
                selectedName={formData.selectedGameDisplayName || ''}
                selectedVersion={formData.selectedVersion}
                onChange={(name) => setFormField('selectedGameDisplayName', name)}
                onAutoComplete={() => {}}
                onChangeName={handleChangeName}
                hideChangeNameButton={true}
                matchedAlternateName={
                  formData.selectedGame.matchedAlternateName
                }
              />
            )}

        </div>
      </Card>

      {/* Warning: User already has active listing(s) for this game */}
      {existingActiveListings.length > 0 && (
        <div className="bg-polar-night/5 border-l-4 border-polar-night/30 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-polar-night/60 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-polar-night mb-1">
                {tExisting(
                  existingActiveListings.length === 1
                    ? 'warningTitle_one'
                    : 'warningTitle_other',
                  { count: existingActiveListings.length },
                )}
              </p>
              <p className="text-sm text-text-secondary mb-3">
                {tExisting(
                  existingActiveListings.length === 1
                    ? 'warningSubtitle_one'
                    : 'warningSubtitle_other',
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {existingActiveListings.map((listing) => (
                  <a
                    key={listing.id}
                    href={`/game/${listing.bgg_game_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-snow-white border border-border rounded-lg text-sm text-frost-ice hover:text-aurora-blue hover:border-frost-ice transition-colors"
                  >
                    {formatPrice(listing.price)} &bull;{' '}
                    {formatDate(listing.created_at)}
                    <span className="text-xs">&nearr;</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expansion Section */}
      {formData.selectedGame &&
        formData.selectedVersion &&
        !formData.selectedGame.isExpansion &&
        expansionCount > 0 && (
          <>
            {!showExpansionSection ? (
              <Card
                padding="md"
                className="border-dashed border-2 border-border hover:border-frost-ice/50 transition-colors"
              >
                <button
                  onClick={handleEnableExpansions}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-frost-ice/10 flex items-center justify-center">
                      <Puzzle className="w-5 h-5 text-frost-ice" />
                    </div>
                    <div>
                      <p className="font-medium text-polar-night">
                        {tSections('expansions.toggleTitle')}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {tSections('expansions.toggleSubtitle')}
                      </p>
                    </div>
                  </div>
                  <div className="text-frost-ice font-medium text-sm">
                    {tSections('expansions.addButton')}
                  </div>
                </button>
              </Card>
            ) : (
              <CollapsibleSection
                title={tSections('expansions.title')}
                icon={<Puzzle className="w-6 h-6 text-frost-ice" />}
                isExpanded={true}
                onToggle={() => {}}
                subtitle={
                  formData.selectedExpansions.length > 0
                    ? tSections(
                        formData.selectedExpansions.length === 1
                          ? 'expansions.subtitle'
                          : 'expansions.subtitle_other',
                        { count: formData.selectedExpansions.length },
                      )
                    : tSections('expansions.toggleSubtitle')
                }
              >
                <div className="space-y-4">
                  <ExpansionSelector
                    expansions={availableExpansions}
                    baseGameVersion={formData.selectedVersion}
                    selectedExpansions={formData.selectedExpansions}
                    onExpansionsChange={handleExpansionsChange}
                    isLoading={isLoadingExpansions}
                  />

                  {formData.selectedExpansions.length === 0 &&
                    !isLoadingExpansions && (
                      <button
                        onClick={handleDisableExpansions}
                        className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                      >
                        {tSections('expansions.cancelButton')}
                      </button>
                    )}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}

      {/* Continue button */}
      <div className="pt-4">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onAdvance}
          disabled={!isPhaseComplete}
        >
          {tPhases('research.continueButton')}
        </Button>
      </div>
    </div>
  );
}
