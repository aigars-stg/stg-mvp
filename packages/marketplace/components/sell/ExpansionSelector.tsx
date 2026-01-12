'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, Modal, Input, Button } from '@second-turn/design-system';
import { Package, RefreshCw, Search, Close, LinkExternal as ExternalLink, TextFont as Type, ChevronDown, ChevronUp } from 'griddy-icons';
import type { VersionSelection } from '@/lib/bgg-types';
import type { BGGExpansionInfo } from '@/lib/bgg-api';
import { LanguageVersionSelector } from './LanguageVersionSelector';
import { findBestDisplayName, findMatchedAlternateName as findMatchedAltName } from '@/lib/utils/language-utils';
import { useTranslations } from 'next-intl';

// Constants
const COLLAPSED_SELECTED_LIMIT = 2; // Show first 2 selected in collapsed view

// Selected expansion with version info
export interface SelectedExpansion {
  bgg_id: number;
  name: string; // Primary BGG name (for reference)
  displayName: string; // Name to display/save (localized or primary)
  year: number | null;
  thumbnail: string | null;
  image: string | null;
  selectedVersion: VersionSelection;
}

interface ExpansionSelectorProps {
  expansions: BGGExpansionInfo[];
  baseGameVersion: VersionSelection | null;
  selectedExpansions: SelectedExpansion[];
  onExpansionsChange: (expansions: SelectedExpansion[]) => void;
  isLoading?: boolean;
}

// Threshold for showing search bar
const SEARCH_THRESHOLD = 4;

/**
 * Wrapper for findMatchedAlternateName to match original signature
 */
function findMatchedAlternateName(
  expansion: BGGExpansionInfo,
  query: string
): string | null {
  return findMatchedAltName(expansion.alternateNames, query);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [versionModalExpansion, setVersionModalExpansion] = useState<BGGExpansionInfo | null>(null);
  const [nameModalExpansionId, setNameModalExpansionId] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query (150ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Auto-expand when user starts searching
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsExpanded(true);
    }
  }, [debouncedQuery]);

  // Filter expansions by search query (searches name AND alternateNames)
  const filteredExpansions = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return expansions;
    }
    const query = debouncedQuery.toLowerCase();
    return expansions.filter((exp) => {
      // Search primary name
      if (exp.name.toLowerCase().includes(query)) return true;
      // Search alternate names
      if (exp.alternateNames?.some(alt => alt.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [expansions, debouncedQuery]);

  // Sort: selected first, then by year (newest first)
  const sortedExpansions = useMemo(() => {
    return [...filteredExpansions].sort((a, b) => {
      const aSelected = selectedExpansions.some((e) => e.bgg_id === a.bgg_id);
      const bSelected = selectedExpansions.some((e) => e.bgg_id === b.bgg_id);

      // Selected items first
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // Then by year (newest first)
      return (b.year || 0) - (a.year || 0);
    });
  }, [filteredExpansions, selectedExpansions]);

  // Find best matching version for an expansion based on base game language
  const findMatchingVersion = useCallback((expansion: BGGExpansionInfo): VersionSelection | null => {
    if (!expansion.versions || expansion.versions.length === 0) {
      return null;
    }

    // If only one version, return it
    if (expansion.versions.length === 1) {
      return expansion.versions[0];
    }

    // Try to match base game language
    const baseLanguage = baseGameVersion?.language ||
      (baseGameVersion?.languages && baseGameVersion.languages[0]);

    if (baseLanguage) {
      const matchingVersion = expansion.versions.find((v) => {
        const versionLanguages = v.languages || (v.language ? [v.language] : []);
        return versionLanguages.includes(baseLanguage);
      });
      if (matchingVersion) {
        return matchingVersion;
      }
    }

    // Fallback to first version
    return expansion.versions[0];
  }, [baseGameVersion]);

  // Check if expansion is selected
  const isSelected = (expansionId: number) =>
    selectedExpansions.some((e) => e.bgg_id === expansionId);

  // Get selected expansion data
  const getSelectedExpansion = (expansionId: number) =>
    selectedExpansions.find((e) => e.bgg_id === expansionId);

  // Toggle expansion selection
  const handleToggleExpansion = useCallback((expansion: BGGExpansionInfo) => {
    const isCurrentlySelected = isSelected(expansion.bgg_id);

    if (isCurrentlySelected) {
      // Remove from selection
      onExpansionsChange(selectedExpansions.filter((e) => e.bgg_id !== expansion.bgg_id));
    } else {
      // Add to selection with auto-matched version
      const matchedVersion = findMatchingVersion(expansion);

      if (!matchedVersion) {
        // No versions available - show modal
        setVersionModalExpansion(expansion);
        return;
      }

      // Check if we need to show version picker (multiple versions, no match)
      const hasMultipleVersions = expansion.versions && expansion.versions.length > 1;
      const baseLanguage = baseGameVersion?.language ||
        (baseGameVersion?.languages && baseGameVersion.languages[0]);

      const hasExactMatch = baseLanguage && expansion.versions?.some((v) => {
        const versionLanguages = v.languages || (v.language ? [v.language] : []);
        return versionLanguages.includes(baseLanguage);
      });

      if (hasMultipleVersions && !hasExactMatch) {
        // Multiple versions but no exact match - show picker
        setVersionModalExpansion(expansion);
        return;
      }

      // Check if search query matches an alternate name - use that as displayName
      const matchedAlternateName = findMatchedAlternateName(expansion, debouncedQuery);

      let displayName: string;
      if (matchedAlternateName) {
        // User searched by localized name - use it automatically
        displayName = matchedAlternateName;
        console.log(`📝 [ExpansionSelector] Using matched alternate name: "${matchedAlternateName}"`);
      } else {
        // Fall back to language-based matching
        const versionLanguage = matchedVersion.language || matchedVersion.languages?.[0];
        const result = findBestDisplayName(
          expansion.name,
          expansion.alternateNames,
          versionLanguage
        );
        displayName = result.displayName;
      }

      const newExpansion: SelectedExpansion = {
        bgg_id: expansion.bgg_id,
        name: expansion.name, // Always store primary name
        displayName,
        year: expansion.year,
        thumbnail: matchedVersion.thumbnail || expansion.thumbnail,
        image: matchedVersion.image || expansion.image,
        selectedVersion: matchedVersion,
      };

      onExpansionsChange([...selectedExpansions, newExpansion]);

      // Clear search input after selection (keep panel expanded for multi-select)
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [selectedExpansions, onExpansionsChange, findMatchingVersion, baseGameVersion, debouncedQuery]);

  // Handle version selection from modal
  const handleVersionSelect = useCallback((version: VersionSelection) => {
    if (!versionModalExpansion) return;

    // Find best display name based on selected version's language
    const versionLanguage = version.language || version.languages?.[0];
    const { displayName } = findBestDisplayName(
      versionModalExpansion.name,
      versionModalExpansion.alternateNames,
      versionLanguage
    );

    const newExpansion: SelectedExpansion = {
      bgg_id: versionModalExpansion.bgg_id,
      name: versionModalExpansion.name, // Always store primary name
      displayName,
      year: versionModalExpansion.year,
      thumbnail: version.thumbnail || versionModalExpansion.thumbnail,
      image: version.image || versionModalExpansion.image,
      selectedVersion: version,
    };

    // Check if already selected (updating version)
    const existingIndex = selectedExpansions.findIndex((e) => e.bgg_id === versionModalExpansion.bgg_id);

    if (existingIndex >= 0) {
      const updated = [...selectedExpansions];
      updated[existingIndex] = newExpansion;
      onExpansionsChange(updated);
    } else {
      onExpansionsChange([...selectedExpansions, newExpansion]);
    }

    setVersionModalExpansion(null);
  }, [versionModalExpansion, selectedExpansions, onExpansionsChange]);

  // Open version picker for change
  const handleChangeVersion = useCallback((expansion: BGGExpansionInfo) => {
    setVersionModalExpansion(expansion);
  }, []);

  // Open name picker for change
  const handleChangeName = useCallback((expansionId: number) => {
    setNameModalExpansionId(expansionId);
  }, []);

  // Handle name selection from modal
  const handleNameSelect = useCallback((newDisplayName: string) => {
    if (!nameModalExpansionId) return;

    const updated = selectedExpansions.map((exp) => {
      if (exp.bgg_id === nameModalExpansionId) {
        return { ...exp, displayName: newDisplayName };
      }
      return exp;
    });

    onExpansionsChange(updated);
    setNameModalExpansionId(null);
  }, [nameModalExpansionId, selectedExpansions, onExpansionsChange]);

  // Get expansion info by ID (for accessing alternateNames)
  const getExpansionInfo = useCallback((expansionId: number) => {
    return expansions.find((e) => e.bgg_id === expansionId);
  }, [expansions]);

  // Format version display
  const formatVersionDisplay = (version: VersionSelection) => {
    const language = version.languages?.join(', ') || version.language || 'Unknown';
    const publisher = version.publishers?.join(', ') || version.publisher;
    return publisher ? `${language} · ${publisher}` : language;
  };

  // Check if expansion has single version
  const hasSingleVersion = (expansion: BGGExpansionInfo) =>
    expansion.versions && expansion.versions.length === 1;

  const showSearch = expansions.length > SEARCH_THRESHOLD;

  // Determine if we should show collapsed or expanded view
  const isSearching = debouncedQuery.trim().length > 0;
  const showCollapsedView = !isExpanded && !isSearching && showSearch;

  // For collapsed view: get selected expansions to show (first N)
  const selectedForCollapsedView = useMemo(() => {
    if (!showCollapsedView) return [];
    return selectedExpansions.slice(0, COLLAPSED_SELECTED_LIMIT);
  }, [showCollapsedView, selectedExpansions]);

  // Get expansion info for selected items (for collapsed view rendering)
  const getExpansionForSelected = useCallback((selected: SelectedExpansion) => {
    return expansions.find(e => e.bgg_id === selected.bgg_id);
  }, [expansions]);

  // Count of unselected expansions
  const unselectedCount = expansions.length - selectedExpansions.length;
  const hiddenSelectedCount = selectedExpansions.length - COLLAPSED_SELECTED_LIMIT;

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
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center">
                        <Package className="w-5 h-5 text-text-muted" />
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
                          <Type className="w-3 h-3" />
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
            const matchedAltName = debouncedQuery.trim()
              ? findMatchedAlternateName(expansion, debouncedQuery)
              : null;

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
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-bg-secondary flex items-center justify-center">
                        <Package className="w-5 h-5 text-text-muted" />
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
                            <Type className="w-3 h-3" />
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
