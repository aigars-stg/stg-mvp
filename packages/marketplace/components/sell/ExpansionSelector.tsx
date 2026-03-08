/* eslint-disable @next/next/no-img-element -- expansion images are external BGG URLs */
'use client';

import { Card, Modal, Input, Button } from '@second-turn/design-system';
import { Package, RefreshCw, Search, Close, LinkExternal as ExternalLink, ChevronDown, ChevronUp } from '@/lib/icons';
import type { VersionSelection } from '@/lib/bgg-types';
import type { BGGExpansionInfo } from '@/lib/bgg-api';
import { LanguageVersionSelector } from './LanguageVersionSelector';
import { useTranslations } from 'next-intl';
import { useExpansionSelector, type SelectedExpansion } from '@/lib/hooks/useExpansionSelector';

// Re-export the type for external use
export type { SelectedExpansion };

interface ExpansionSelectorProps {
  expansions: BGGExpansionInfo[];
  baseGameVersion: VersionSelection | null;
  selectedExpansions: SelectedExpansion[];
  onExpansionsChange: (expansions: SelectedExpansion[]) => void;
  isLoading?: boolean;
}

export function ExpansionSelector({
  expansions,
  baseGameVersion,
  selectedExpansions,
  onExpansionsChange,
  isLoading = false,
}: ExpansionSelectorProps) {
  const t = useTranslations('Sell.ExpansionSelector');
  const tNameModal = useTranslations('Sell.ExpansionSelector.nameModal');

  const {
    searchQuery,
    setSearchQuery,
    isExpanded,
    setIsExpanded,
    versionModalExpansion,
    setVersionModalExpansion,
    nameModalExpansionId,
    setNameModalExpansionId,
    filteredExpansions,
    sortedExpansions,
    showSearch,
    isSearching,
    showCollapsedView,
    selectedForCollapsedView,
    unselectedCount,
    hiddenSelectedCount,
    isSelected,
    getSelectedExpansion,
    findMatchingVersion,
    hasSingleVersion,
    getExpansionForSelected,
    getExpansionInfo,
    formatVersionDisplay,
    findMatchedAltNameForExpansion,
    handleToggleExpansion,
    handleVersionSelect,
    handleChangeVersion,
    handleChangeName,
    handleNameSelect,
  } = useExpansionSelector(expansions, baseGameVersion, selectedExpansions, onExpansionsChange);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
        <p className="mt-4 text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (!expansions || expansions.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('noExpansions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar - only show if more than threshold */}
      {showSearch && (
        <div className="relative">
          <Input
            placeholder={t('searchPlaceholder', { count: expansions.length })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            inputSize="sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-polar-night/5 rounded-full transition-colors"
              aria-label={t('clearSearch')}
            >
              <Close className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
      )}

      {/* Results count when searching */}
      {showSearch && searchQuery && (
        <p className="text-xs text-text-muted">
          {t('resultsCount', { filtered: filteredExpansions.length, total: expansions.length })}
          {selectedExpansions.length > 0 && ` · ${t('selectedCount', { count: selectedExpansions.length })}`}
        </p>
      )}

      {/* Collapsed view: show selected expansions summary + expand button */}
      {showCollapsedView && (
        <div className="space-y-2">
          {/* Show first N selected expansions */}
          {selectedForCollapsedView.map((selected) => {
            const expansion = getExpansionForSelected(selected);
            if (!expansion) return null;
            const singleVersion = hasSingleVersion(expansion);

            return (
              <Card
                key={selected.bgg_id}
                padding="sm"
                className="border-frost-ice bg-frost-ice/5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleToggleExpansion(expansion)}
                      className="w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice cursor-pointer"
                    />
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {selected.thumbnail ? (
                      <img
                        src={selected.thumbnail}
                        alt={selected.displayName}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-bg-secondary flex items-center justify-center">
                        <Package className="w-6 h-6 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-polar-night text-sm truncate" title={selected.displayName}>
                        {selected.displayName}
                      </p>
                      {selected.selectedVersion.yearPublished && (
                        <span className="text-xs text-text-muted flex-shrink-0">
                          ({selected.selectedVersion.yearPublished})
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs min-w-0 flex-wrap">
                      <span className="text-text-secondary truncate">
                        {formatVersionDisplay(selected.selectedVersion)}
                      </span>
                      {!singleVersion && (
                        <button
                          onClick={() => handleChangeVersion(expansion)}
                          className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 flex-shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {t('changeVersion')}
                        </button>
                      )}
                      {expansion.alternateNames && expansion.alternateNames.length > 0 && (
                        <button
                          onClick={() => handleChangeName(expansion.bgg_id)}
                          className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 flex-shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {t('changeName')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* "+ N more selected" summary */}
          {hiddenSelectedCount > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-frost-ice/50 hover:bg-frost-ice/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-frost-ice font-medium">
                  {t('moreSelected', { count: hiddenSelectedCount })}
                </span>
                <ChevronDown className="w-4 h-4 text-text-muted" />
              </div>
            </button>
          )}

          {/* "X expansions available" expand button */}
          {unselectedCount > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-left p-3 rounded-lg border border-dashed border-border hover:border-frost-ice/50 hover:bg-frost-ice/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-secondary">
                    {t('expansionsAvailable', { count: unselectedCount })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-frost-ice text-sm">
                  {t('show')}
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Expanded view: full expansion list */}
      {!showCollapsedView && (
        <>
          {/* Collapse button when expanded */}
          {isExpanded && !isSearching && showSearch && (
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 text-sm text-frost-ice hover:text-aurora-blue transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              {t('collapse')}
            </button>
          )}

          {/* Expansion list - scrollable container */}
          <div className={`space-y-2 ${showSearch ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
            {sortedExpansions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-text-secondary">
                  {t('noMatch', { query: searchQuery })}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('searchTip')}
                </p>
              </div>
            ) : (
          sortedExpansions.map((expansion) => {
            const selected = isSelected(expansion.bgg_id);
            const selectedData = getSelectedExpansion(expansion.bgg_id);
            const singleVersion = hasSingleVersion(expansion);

            // Check if this expansion was matched via alternate name in search
            const matchedAltName = findMatchedAltNameForExpansion(expansion);

            // Find matching version for year display (even when not selected)
            const matchingVersion = findMatchingVersion(expansion);

            // Determine what name to display as primary
            let primaryDisplayName: string;
            let subtitleName: string | null = null;

            if (selected && selectedData) {
              // Already selected - show the chosen display name
              primaryDisplayName = selectedData.displayName;
              // Show English name as subtitle if different
              if (selectedData.displayName !== expansion.name) {
                subtitleName = expansion.name;
              }
            } else if (matchedAltName) {
              // Matched via alternate name - show matched name first
              primaryDisplayName = matchedAltName;
              subtitleName = expansion.name; // English name as subtitle
            } else {
              // Default - show primary name
              primaryDisplayName = expansion.name;
            }

            return (
              <Card
                key={expansion.bgg_id}
                padding="sm"
                className={`cursor-pointer transition-all ${
                  selected
                    ? 'border-frost-ice bg-frost-ice/5'
                    : 'border-border hover:border-frost-ice/50'
                }`}
                onClick={() => handleToggleExpansion(expansion)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}} // Handled by card click
                      className="w-4 h-4 rounded border-border text-frost-ice focus:ring-frost-ice"
                    />
                  </div>

                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {expansion.thumbnail ? (
                      <img
                        src={expansion.thumbnail}
                        alt={expansion.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-bg-secondary flex items-center justify-center">
                        <Package className="w-6 h-6 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Content - with overflow handling */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-polar-night text-sm truncate" title={primaryDisplayName}>
                        {primaryDisplayName}
                      </p>
                      {/* Show version year when selected, or matching version year, or base expansion year */}
                      {(() => {
                        const displayYear = selected && selectedData?.selectedVersion.yearPublished
                          ? selectedData.selectedVersion.yearPublished
                          : matchingVersion?.yearPublished || expansion.year;
                        return displayYear ? (
                          <span className="text-xs text-text-muted flex-shrink-0">({displayYear})</span>
                        ) : null;
                      })()}
                      <a
                        href={`https://boardgamegeek.com/boardgameexpansion/${expansion.bgg_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-text-muted hover:text-frost-ice transition-colors flex-shrink-0"
                        title="View on BoardGameGeek"
                        aria-label="View on BoardGameGeek"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Subtitle: Show original English name when displaying localized name */}
                    {subtitleName && !selected && (
                      <p className="text-xs text-text-muted truncate" title={subtitleName}>
                        {subtitleName}
                      </p>
                    )}

                    {/* Selected version info */}
                    {selected && selectedData && (
                      <div className="mt-1 flex items-center gap-2 text-xs min-w-0 flex-wrap">
                        <span className="text-text-secondary truncate">
                          {formatVersionDisplay(selectedData.selectedVersion)}
                        </span>
                        {singleVersion ? (
                          <span className="text-text-muted flex-shrink-0">({t('onlyEdition')})</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeVersion(expansion);
                            }}
                            className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 flex-shrink-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {t('changeVersion')}
                          </button>
                        )}
                        {/* Change name button - show when alternateNames exist */}
                        {expansion.alternateNames && expansion.alternateNames.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeName(expansion.bgg_id);
                            }}
                            className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 flex-shrink-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {t('changeName')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
          </div>
        </>
      )}

      {/* Selected count - sticky at bottom */}
      {selectedExpansions.length > 0 && (
        <div className="pt-2 border-t border-border-subtle">
          <p className="text-sm text-frost-ice font-medium">
            {t('expansionsIncluded', { count: selectedExpansions.length })}
          </p>
        </div>
      )}

      {/* Version selection modal */}
      <Modal
        open={!!versionModalExpansion}
        onClose={() => setVersionModalExpansion(null)}
        title={t('selectEdition')}
        size="lg"
      >
        {versionModalExpansion && (
          <div className="p-4">
            <p className="text-sm text-text-secondary mb-4 truncate" title={versionModalExpansion.name}>
              {versionModalExpansion.name}
            </p>
            <LanguageVersionSelector
              game={{
                id: versionModalExpansion.bgg_id,
                name: versionModalExpansion.name,
                yearPublished: versionModalExpansion.year || undefined,
                thumbnail: versionModalExpansion.thumbnail || undefined,
                image: versionModalExpansion.image || undefined,
              }}
              selectedVersion={getSelectedExpansion(versionModalExpansion.bgg_id)?.selectedVersion || null}
              onSelect={handleVersionSelect}
            />
          </div>
        )}
      </Modal>

      {/* Name selection modal */}
      <Modal
        open={!!nameModalExpansionId}
        onClose={() => setNameModalExpansionId(null)}
        title={tNameModal('title')}
        size="md"
      >
        {nameModalExpansionId && (() => {
          const expansionInfo = getExpansionInfo(nameModalExpansionId);
          const selectedData = getSelectedExpansion(nameModalExpansionId);
          if (!expansionInfo || !selectedData) return null;

          // Build list of name options: primary name + alternates
          const nameOptions = [
            expansionInfo.name, // Primary name first
            ...(expansionInfo.alternateNames || []),
          ];

          return (
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                {tNameModal('instruction')}
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {nameOptions.map((name, index) => {
                  const isSelected = name === selectedData.displayName;
                  const isPrimary = index === 0;
                  return (
                    <button
                      key={name}
                      onClick={() => handleNameSelect(name)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-frost-ice bg-frost-ice/10'
                          : 'border-border hover:border-frost-ice/50 hover:bg-frost-ice/5'
                      }`}
                    >
                      <span className="font-medium text-polar-night">{name}</span>
                      {isPrimary && (
                        <span className="ml-2 text-xs text-text-muted">({tNameModal('primary')})</span>
                      )}
                      {isSelected && (
                        <span className="ml-2 text-xs text-frost-ice">({tNameModal('current')})</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <Button
                  variant="secondary"
                  onClick={() => setNameModalExpansionId(null)}
                  fullWidth
                >
                  {tNameModal('cancel')}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
