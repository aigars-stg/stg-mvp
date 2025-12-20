'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, Modal, Input } from '@second-turn/design-system';
import { Package, RefreshCw, Search, X } from 'lucide-react';
import type { VersionSelection } from '@/lib/bgg-types';
import type { BGGExpansionInfo } from '@/lib/bgg-api';
import { LanguageVersionSelector } from './LanguageVersionSelector';

// Selected expansion with version info
export interface SelectedExpansion {
  bgg_id: number;
  name: string;
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

export function ExpansionSelector({
  expansions,
  baseGameVersion,
  selectedExpansions,
  onExpansionsChange,
  isLoading = false,
}: ExpansionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [versionModalExpansion, setVersionModalExpansion] = useState<BGGExpansionInfo | null>(null);

  // Filter expansions by search query
  const filteredExpansions = useMemo(() => {
    if (!searchQuery.trim()) {
      return expansions;
    }
    const query = searchQuery.toLowerCase();
    return expansions.filter((exp) =>
      exp.name.toLowerCase().includes(query)
    );
  }, [expansions, searchQuery]);

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

      // Add with auto-matched version
      const newExpansion: SelectedExpansion = {
        bgg_id: expansion.bgg_id,
        name: expansion.name,
        year: expansion.year,
        thumbnail: matchedVersion.thumbnail || expansion.thumbnail,
        image: matchedVersion.image || expansion.image,
        selectedVersion: matchedVersion,
      };

      onExpansionsChange([...selectedExpansions, newExpansion]);
    }
  }, [selectedExpansions, onExpansionsChange, findMatchingVersion, baseGameVersion]);

  // Handle version selection from modal
  const handleVersionSelect = useCallback((version: VersionSelection) => {
    if (!versionModalExpansion) return;

    const newExpansion: SelectedExpansion = {
      bgg_id: versionModalExpansion.bgg_id,
      name: versionModalExpansion.name,
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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
        <p className="mt-4 text-text-secondary">Loading expansions...</p>
      </div>
    );
  }

  if (!expansions || expansions.length === 0) {
    return (
      <div className="text-center py-6 text-text-muted">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No expansions found for this game</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar - only show if more than threshold */}
      {showSearch && (
        <div className="relative">
          <Input
            placeholder={`Search ${expansions.length} expansions...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            inputSize="sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-polar-night/5 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
      )}

      {/* Results count when searching */}
      {showSearch && searchQuery && (
        <p className="text-xs text-text-muted">
          {filteredExpansions.length} of {expansions.length} expansions
          {selectedExpansions.length > 0 && ` · ${selectedExpansions.length} selected`}
        </p>
      )}

      {/* Expansion list - scrollable container */}
      <div className={`space-y-2 ${showSearch ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
        {sortedExpansions.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            No expansions match "{searchQuery}"
          </p>
        ) : (
          sortedExpansions.map((expansion) => {
            const selected = isSelected(expansion.bgg_id);
            const selectedData = getSelectedExpansion(expansion.bgg_id);
            const singleVersion = hasSingleVersion(expansion);

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
                    <div className="flex items-baseline gap-2 min-w-0">
                      <p className="font-medium text-polar-night text-sm truncate" title={expansion.name}>
                        {expansion.name}
                      </p>
                      {expansion.year && (
                        <span className="text-xs text-text-muted flex-shrink-0">({expansion.year})</span>
                      )}
                    </div>

                    {/* Selected version info */}
                    {selected && selectedData && (
                      <div className="mt-1 flex items-center gap-2 text-xs min-w-0">
                        <span className="text-text-secondary truncate">
                          {formatVersionDisplay(selectedData.selectedVersion)}
                        </span>
                        {singleVersion ? (
                          <span className="text-text-muted flex-shrink-0">(only edition)</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeVersion(expansion);
                            }}
                            className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 flex-shrink-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Change
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

      {/* Selected count - sticky at bottom */}
      {selectedExpansions.length > 0 && (
        <div className="pt-2 border-t border-border-subtle">
          <p className="text-sm text-frost-ice font-medium">
            {selectedExpansions.length} expansion{selectedExpansions.length !== 1 ? 's' : ''} included
          </p>
        </div>
      )}

      {/* Version selection modal */}
      <Modal
        open={!!versionModalExpansion}
        onClose={() => setVersionModalExpansion(null)}
        title={`Select Edition`}
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
    </div>
  );
}
