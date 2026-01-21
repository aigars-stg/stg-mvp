'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { VersionSelection } from '@/lib/bgg-types';
import type { BGGExpansionInfo } from '@/lib/bgg-api';
import { findBestDisplayName, findMatchedAlternateName as findMatchedAltName } from '@/lib/utils/language-utils';

// Constants
const COLLAPSED_SELECTED_LIMIT = 2; // Show first 2 selected in collapsed view
const SEARCH_THRESHOLD = 4; // Threshold for showing search bar

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

/**
 * Wrapper for findMatchedAlternateName to match original signature
 */
function findMatchedAlternateName(
  expansion: BGGExpansionInfo,
  query: string
): string | null {
  return findMatchedAltName(expansion.alternateNames, query);
}

export interface UseExpansionSelectorReturn {
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedQuery: string;

  // UI state
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;

  // Modal state
  versionModalExpansion: BGGExpansionInfo | null;
  setVersionModalExpansion: (expansion: BGGExpansionInfo | null) => void;
  nameModalExpansionId: number | null;
  setNameModalExpansionId: (id: number | null) => void;

  // Computed values
  filteredExpansions: BGGExpansionInfo[];
  sortedExpansions: BGGExpansionInfo[];
  showSearch: boolean;
  isSearching: boolean;
  showCollapsedView: boolean;
  selectedForCollapsedView: SelectedExpansion[];
  unselectedCount: number;
  hiddenSelectedCount: number;

  // Helper functions
  isSelected: (expansionId: number) => boolean;
  getSelectedExpansion: (expansionId: number) => SelectedExpansion | undefined;
  findMatchingVersion: (expansion: BGGExpansionInfo) => VersionSelection | null;
  hasSingleVersion: (expansion: BGGExpansionInfo) => boolean;
  getExpansionForSelected: (selected: SelectedExpansion) => BGGExpansionInfo | undefined;
  getExpansionInfo: (expansionId: number) => BGGExpansionInfo | undefined;
  formatVersionDisplay: (version: VersionSelection) => string;
  findMatchedAltNameForExpansion: (expansion: BGGExpansionInfo) => string | null;

  // Actions
  handleToggleExpansion: (expansion: BGGExpansionInfo) => void;
  handleVersionSelect: (version: VersionSelection) => void;
  handleChangeVersion: (expansion: BGGExpansionInfo) => void;
  handleChangeName: (expansionId: number) => void;
  handleNameSelect: (newDisplayName: string) => void;
}

export function useExpansionSelector(
  expansions: BGGExpansionInfo[],
  baseGameVersion: VersionSelection | null,
  selectedExpansions: SelectedExpansion[],
  onExpansionsChange: (expansions: SelectedExpansion[]) => void
): UseExpansionSelectorReturn {
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
  const isSelected = useCallback((expansionId: number) =>
    selectedExpansions.some((e) => e.bgg_id === expansionId), [selectedExpansions]);

  // Get selected expansion data
  const getSelectedExpansion = useCallback((expansionId: number) =>
    selectedExpansions.find((e) => e.bgg_id === expansionId), [selectedExpansions]);

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
  }, [selectedExpansions, onExpansionsChange, findMatchingVersion, baseGameVersion, debouncedQuery, isSelected]);

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
  const formatVersionDisplay = useCallback((version: VersionSelection) => {
    const language = version.languages?.join(', ') || version.language || 'Unknown';
    const publisher = version.publishers?.join(', ') || version.publisher;
    return publisher ? `${language} · ${publisher}` : language;
  }, []);

  // Check if expansion has single version
  const hasSingleVersion = useCallback((expansion: BGGExpansionInfo) =>
    expansion.versions && expansion.versions.length === 1, []);

  // Get expansion info for selected items (for collapsed view rendering)
  const getExpansionForSelected = useCallback((selected: SelectedExpansion) => {
    return expansions.find(e => e.bgg_id === selected.bgg_id);
  }, [expansions]);

  // Find matched alternate name for expansion
  const findMatchedAltNameForExpansion = useCallback((expansion: BGGExpansionInfo) => {
    return debouncedQuery.trim() ? findMatchedAlternateName(expansion, debouncedQuery) : null;
  }, [debouncedQuery]);

  // Computed values
  const showSearch = expansions.length > SEARCH_THRESHOLD;
  const isSearching = debouncedQuery.trim().length > 0;
  const showCollapsedView = !isExpanded && !isSearching && showSearch;
  const selectedForCollapsedView = useMemo(() => {
    if (!showCollapsedView) return [];
    return selectedExpansions.slice(0, COLLAPSED_SELECTED_LIMIT);
  }, [showCollapsedView, selectedExpansions]);
  const unselectedCount = expansions.length - selectedExpansions.length;
  const hiddenSelectedCount = selectedExpansions.length - COLLAPSED_SELECTED_LIMIT;

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    debouncedQuery,

    // UI state
    isExpanded,
    setIsExpanded,

    // Modal state
    versionModalExpansion,
    setVersionModalExpansion,
    nameModalExpansionId,
    setNameModalExpansionId,

    // Computed values
    filteredExpansions,
    sortedExpansions,
    showSearch,
    isSearching,
    showCollapsedView,
    selectedForCollapsedView,
    unselectedCount,
    hiddenSelectedCount,

    // Helper functions
    isSelected,
    getSelectedExpansion,
    findMatchingVersion,
    hasSingleVersion,
    getExpansionForSelected,
    getExpansionInfo,
    formatVersionDisplay,
    findMatchedAltNameForExpansion,

    // Actions
    handleToggleExpansion,
    handleVersionSelect,
    handleChangeVersion,
    handleChangeName,
    handleNameSelect,
  };
}
