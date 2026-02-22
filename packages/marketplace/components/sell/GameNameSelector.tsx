'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Badge } from '@second-turn/design-system';
import { useTranslations } from 'next-intl';
import type { VersionSelection } from '@/lib/bgg-types';
import { RefreshCw, InfoCircle as Info, ChevronDown } from '@/lib/icons';

interface GameNameSelectorProps {
  primaryName: string;
  alternateNames: string[] | null;
  selectedName: string;
  selectedVersion: VersionSelection | null;
  onChange: (name: string) => void;
  onAutoComplete?: () => void; // Callback when auto-completed
  onChangeName?: () => void; // Callback to change/clear the selected name
  hideChangeNameButton?: boolean; // Hide button to render it externally
  matchedAlternateName?: string; // Auto-select this name if provided (from search)
}

/**
 * GameNameSelector - Allows sellers to choose from alternate game names
 *
 * Smart logic:
 * 1. If English or single language or no alternates → auto-select primary name (hidden)
 * 2. If non-English with alternates → show badge selector
 *
 * This is crucial for localized versions where the box might have a different name.
 * For example:
 * - "Sausage Sizzle" (primary) vs "A.E.R.O" (alternate)
 * - "Forest Shuffle" (primary) vs "Mežā" (Latvian alternate)
 *
 * Benefits:
 * - Better discoverability for local buyers
 * - Accurate representation of the physical box
 * - Improved search relevance
 */
export function GameNameSelector({
  primaryName,
  alternateNames,
  selectedName,
  selectedVersion,
  onChange,
  onAutoComplete,
  onChangeName,
  hideChangeNameButton,
  matchedAlternateName,
}: GameNameSelectorProps) {
  const t = useTranslations('Sell.sections.gameNameSelector');

  // Track if the "Other" (non-Latin) panel is expanded
  const [showOtherNames, setShowOtherNames] = useState(false);

  // Track which matched name we've already auto-selected to prevent infinite loops
  // (onChange is recreated each render, causing effect to re-run)
  const autoSelectedNameRef = useRef<string | null>(null);

  // Helper to detect if a string contains non-Latin characters
  const hasNonLatinCharacters = (str: string) => {
    // Check for non-Latin scripts (Cyrillic, Greek, Chinese, Japanese, Korean, Arabic, Hebrew, etc.)
    // Includes: Basic Latin, Latin-1, Latin Extended A/B/Additional, General Punctuation
    return /[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F]/.test(str);
  };

  // Check if we should auto-complete (hide selector)
  const shouldAutoComplete = useMemo(() => {
    // No alternate names → use primary
    if (!alternateNames || alternateNames.length === 0) {
      return true;
    }

    // If version has English as ANY of its languages → use primary
    if (selectedVersion) {
      // Check if English is in the languages array
      if (selectedVersion.languages && selectedVersion.languages.length > 0) {
        if (selectedVersion.languages.includes('English')) {
          return true;
        }
      }
      // Fallback to single language field for backward compatibility
      else if (selectedVersion.language === 'English') {
        return true;
      }
    }

    // Otherwise, show selector for non-English with alternates
    return false;
  }, [alternateNames, selectedVersion]);

  // Auto-complete effect - runs when conditions change
  useEffect(() => {
    if (shouldAutoComplete && selectedName !== primaryName) {
      onChange(primaryName);
      onAutoComplete?.();
    }
  }, [shouldAutoComplete, selectedName, primaryName, onChange, onAutoComplete]);

  // Auto-select matched alternate name from search (if valid and no name selected yet)
  useEffect(() => {
    // Only auto-select if:
    // 1. matchedAlternateName is provided
    // 2. No name is currently selected
    // 3. Not in auto-complete mode (otherwise primary name takes over)
    // 4. The matched name is valid (primary or in alternates)
    // 5. We haven't already auto-selected this name (prevents infinite loops)
    if (matchedAlternateName && !selectedName && !shouldAutoComplete) {
      // Skip if we've already auto-selected this exact name
      if (autoSelectedNameRef.current === matchedAlternateName) {
        return;
      }

      const isValid =
        matchedAlternateName === primaryName ||
        alternateNames?.includes(matchedAlternateName);

      if (isValid) {
        console.log(`🔍 [GameNameSelector] Auto-selecting matched name from search: "${matchedAlternateName}"`);
        autoSelectedNameRef.current = matchedAlternateName;
        onChange(matchedAlternateName);
      }
    }
  }, [matchedAlternateName, selectedName, shouldAutoComplete, primaryName, alternateNames, onChange]);

  // Reset auto-select tracking when matchedAlternateName changes (new search)
  useEffect(() => {
    if (matchedAlternateName !== autoSelectedNameRef.current) {
      autoSelectedNameRef.current = null;
    }
  }, [matchedAlternateName]);

  // Hide selector if auto-complete conditions are met
  if (shouldAutoComplete) {
    return null; // Don't render anything
  }

  // If a name is already selected and onChangeName is provided, show collapsed state with "Change Name" button
  if (selectedName && onChangeName) {
    // If button should be hidden (rendered externally), return null
    if (hideChangeNameButton) {
      return null;
    }

    return (
      <button
        onClick={onChangeName}
        className="w-full px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        {t('changeName')}
      </button>
    );
  }

  // Group alternate names by script
  const latinNames: string[] = [];
  const nonLatinNames: string[] = [];

  alternateNames?.forEach(name => {
    if (hasNonLatinCharacters(name)) {
      nonLatinNames.push(name);
    } else {
      latinNames.push(name);
    }
  });

  // Build options for display (only Latin names and primary)
  const nameOptions = [
    { value: primaryName, label: primaryName, isPrimary: true },
    ...latinNames.map(name => ({ value: name, label: name, isPrimary: false })),
  ];

  return (
    <div className="space-y-3">
      <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-secondary">
          {t('hint')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {nameOptions.map((option) => (
          <Badge
            key={option.value}
            variant={selectedName === option.value ? 'trust' : 'default'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.isPrimary && (
              <span className="ml-1 text-xs opacity-70">({t('primary')})</span>
            )}
          </Badge>
        ))}

        {/* "Other" toggle button for non-Latin names */}
        {nonLatinNames.length > 0 && (
          <Badge
            variant={showOtherNames ? 'trust' : 'default'}
            className="cursor-pointer transition-all hover:scale-105 flex items-center gap-1"
            onClick={() => setShowOtherNames(!showOtherNames)}
          >
            {t('other')}
            <ChevronDown className={`w-3 h-3 transition-transform ${showOtherNames ? 'rotate-180' : ''}`} />
          </Badge>
        )}
      </div>

      {/* Show non-Latin names when "Other" is expanded */}
      {nonLatinNames.length > 0 && showOtherNames && (
        <div className="p-4 bg-bg-elevated border-2 border-border rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-300">
          <p className="text-sm font-medium text-polar-night">{t('otherScripts')}</p>
          <div className="flex flex-wrap gap-2">
            {nonLatinNames.map((name) => (
              <Badge
                key={name}
                variant={selectedName === name ? 'trust' : 'default'}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => onChange(name)}
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
