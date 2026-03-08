/* eslint-disable @next/next/no-img-element -- BGG version images are external URLs */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, Badge, Button } from '@second-turn/design-system';
import type { BGGGame, BGGVersion, VersionSelection } from '@/lib/bgg-types';
import { ManualVersionInput } from './ManualVersionInput';
import { useTranslations } from 'next-intl';

interface LanguageVersionSelectorProps {
  game: BGGGame;
  selectedVersion: VersionSelection | null;
  onSelect: (version: VersionSelection) => void;
  fallbackMode?: boolean;
  fallbackReason?: string;
  onVersionCountChange?: (count: number) => void; // Callback when version count is known
  initialVersions?: BGGVersion[]; // Pre-fetched versions to avoid duplicate API call
}

// Priority languages for Baltic region (in specific order) - defined outside component for stable reference
const PRIMARY_LANGUAGES = ['Latvian', 'Lithuanian', 'Estonian', 'English', 'German'];

export function LanguageVersionSelector({
  game,
  selectedVersion,
  onSelect,
  fallbackMode = false,
  fallbackReason: _fallbackReason,
  onVersionCountChange,
  initialVersions,
}: LanguageVersionSelectorProps) {
  const t = useTranslations('Sell.LanguageVersionSelector');
  const tNoVersions = useTranslations('Sell.LanguageVersionSelector.noVersions');
  const tAutoSelected = useTranslations('Sell.LanguageVersionSelector.autoSelected');

  const [versions, setVersions] = useState<BGGVersion[]>([]);
  const [isLoading, setIsLoading] = useState(!fallbackMode);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    selectedVersion?.language || ''
  );
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);

  // Fetch versions when game changes (skip if in fallback mode)
  useEffect(() => {
    if (fallbackMode) return;

    async function fetchVersions() {
      setIsLoading(true);
      setSelectedLanguage(''); // Reset language selection when game changes

      try {
        // Use pre-fetched versions if available, otherwise call API
        let fetchedVersions: BGGVersion[];
        if (initialVersions && initialVersions.length > 0) {
          fetchedVersions = initialVersions;
        } else {
          const response = await fetch(`/api/games/${game.id}/versions`);

          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
          }

          const data = await response.json();
          fetchedVersions = data.versions;
        }

        setVersions(fetchedVersions);

        // Notify parent of version count (for hiding "Change version" button when only 1)
        onVersionCountChange?.(fetchedVersions.length);

        // Auto-select if only 1 version available
        if (fetchedVersions.length === 1 && !selectedVersion) {
          onSelect(fetchedVersions[0]);
        } else if (fetchedVersions.length > 1) {
          // Check if all versions have the same single language
          const languages = new Set<string>();
          fetchedVersions.forEach((version: BGGVersion) => {
            if (version.languages && version.languages.length > 0) {
              version.languages.forEach((lang) => languages.add(lang));
            } else if (version.language) {
              languages.add(version.language);
            }
          });

          // Auto-select language if only 1 language exists
          if (languages.size === 1) {
            const singleLanguage = Array.from(languages)[0];
            setSelectedLanguage(singleLanguage);

            // If only 1 version for that language, auto-select it too
            if (fetchedVersions.length === 1) {
              onSelect(fetchedVersions[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
        setVersions([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (game) {
      fetchVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, fallbackMode]); // Only re-run when game changes, not when onSelect changes

  // Extract and sort languages from all versions
  const { primaryLanguages, otherLanguages } = useMemo(() => {
    const languages = new Set<string>();
    versions.forEach((version) => {
      // Add all languages from multilingual versions
      if (version.languages && version.languages.length > 0) {
        version.languages.forEach((lang) => languages.add(lang));
      } else if (version.language) {
        // Fallback to single language for backward compatibility
        languages.add(version.language);
      }
    });

    const allLanguages = Array.from(languages);

    // Split into primary (in specified order) and other (alphabetically sorted)
    const primary = PRIMARY_LANGUAGES.filter(lang => allLanguages.includes(lang));
    const other = allLanguages
      .filter(lang => !PRIMARY_LANGUAGES.includes(lang))
      .sort();

    return { primaryLanguages: primary, otherLanguages: other };
  }, [versions]);

  // Filter versions by selected language (includes multilingual versions)
  const filteredVersions = useMemo(() => {
    if (!selectedLanguage) return [];
    return versions.filter((version) => {
      // Check if version includes the selected language
      if (version.languages && version.languages.length > 0) {
        return version.languages.includes(selectedLanguage);
      }
      // Fallback for backward compatibility
      return version.language === selectedLanguage;
    });
  }, [versions, selectedLanguage]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };

  // Render manual input immediately if in fallback mode (placed after all hooks)
  if (fallbackMode) {
    return <ManualVersionInput gameName={game.name} gameYear={game.yearPublished} onSubmit={onSelect} />;
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
        <p className="mt-4 text-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <Card padding="md" className="bg-aurora-yellow/10 border border-aurora-yellow/20">
        <div className="text-sm">
          <div className="font-semibold text-polar-night mb-2">
            {tNoVersions('title')}
          </div>
          <p className="text-text-secondary mb-4">
            {tNoVersions('description')}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              onSelect({
                id: 0,
                name: game.name,
                publisher: undefined,
                language: undefined,
                yearPublished: game.yearPublished,
              });
            }}
          >
            {tNoVersions('continueButton')}
          </Button>
        </div>
      </Card>
    );
  }

  // Show confirmation when single version was auto-selected
  if (versions.length === 1 && selectedVersion) {
    return (
      <Card padding="md" className="bg-success/10 border border-success/20">
        <div className="flex gap-3">
          <div className="text-success flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-polar-night mb-2">
              {tAutoSelected('title')}
            </div>
            <p className="text-sm text-text-secondary mb-3">
              {tAutoSelected('onlyVersion')}
            </p>
            <div className="bg-bg-elevated rounded-lg p-3 flex gap-3">
              {selectedVersion.thumbnail && (
                <div className="flex-shrink-0 w-16 h-16 bg-bg-secondary rounded border border-border flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedVersion.thumbnail}
                    alt={selectedVersion.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="font-medium text-polar-night">{selectedVersion.name}</div>
                {selectedVersion.publishers && selectedVersion.publishers.length > 0 ? (
                  <div className="text-sm text-text-secondary">
                    {selectedVersion.publishers.join(' / ')}
                  </div>
                ) : selectedVersion.publisher ? (
                  <div className="text-sm text-text-secondary">
                    {selectedVersion.publisher}
                  </div>
                ) : null}
                {selectedVersion.yearPublished && (
                  <div className="text-sm text-text-secondary">
                    {selectedVersion.yearPublished}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language Selection */}
      <div>
        <p className="text-sm font-medium text-polar-night mb-3">
          {t('selectLanguage')}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Primary languages (Baltic region priority) */}
          {primaryLanguages.map((language) => (
            <Badge
              key={language}
              variant={selectedLanguage === language ? 'trust' : 'default'}
              className="cursor-pointer transition-all hover:scale-105 !rounded-lg"
              onClick={() => handleLanguageChange(language)}
            >
              {language}
            </Badge>
          ))}

          {/* Other languages button (if any exist) */}
          {otherLanguages.length > 0 && !showOtherLanguages && (
            <button
              className="px-3 py-1 text-sm text-text-muted border border-dashed border-border rounded-lg hover:border-frost-ice/50 hover:text-frost-ice transition-colors"
              onClick={() => setShowOtherLanguages(true)}
            >
              {t('otherLanguages', { count: otherLanguages.length })}
            </button>
          )}

          {/* Other languages (expanded) */}
          {showOtherLanguages && otherLanguages.map((language) => (
            <Badge
              key={language}
              variant={selectedLanguage === language ? 'trust' : 'default'}
              className="cursor-pointer transition-all hover:scale-105 !rounded-lg"
              onClick={() => handleLanguageChange(language)}
            >
              {language}
            </Badge>
          ))}

          {/* Hide other languages button */}
          {showOtherLanguages && otherLanguages.length > 0 && (
            <button
              className="px-3 py-1 text-sm text-text-muted border border-dashed border-border rounded-lg hover:border-frost-ice/50 hover:text-frost-ice transition-colors"
              onClick={() => setShowOtherLanguages(false)}
            >
              {t('showLess')}
            </button>
          )}
        </div>
      </div>

      {/* Version Selection - appears when language is selected */}
      {selectedLanguage && filteredVersions.length >= 1 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm font-medium text-polar-night mb-3">
            {t('selectVersion', { count: filteredVersions.length })}
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {filteredVersions.map((version) => (
              <Card
                key={version.id}
                padding="none"
                className={`cursor-pointer transition-all duration-200 overflow-hidden ${
                  selectedVersion?.id === version.id
                    ? 'border-frost-ice bg-frost-ice/5'
                    : 'border border-border hover:border-frost-ice hover:shadow-md'
                }`}
                onClick={() => onSelect(version)}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Version Thumbnail */}
                  {version.thumbnail ? (
                    <div className="flex-shrink-0 w-20 h-20 bg-bg-secondary rounded border border-border flex items-center justify-center overflow-hidden">
                      <img
                        src={version.thumbnail}
                        alt={version.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-20 bg-bg-secondary rounded border border-border flex items-center justify-center">
                      <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Version Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text leading-tight mb-1">
                      {version.name}
                    </h4>
                    <div className="space-y-0.5">
                      {version.publishers && version.publishers.length > 0 ? (
                        <p className="text-sm text-text-secondary truncate">
                          {version.publishers.join(' / ')}
                        </p>
                      ) : version.publisher ? (
                        <p className="text-sm text-text-secondary truncate">
                          {version.publisher}
                        </p>
                      ) : null}
                      {version.yearPublished && (
                        <p className="text-sm text-text-secondary">
                          {version.yearPublished}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selected Checkmark */}
                  {selectedVersion?.id === version.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-primary text-snow-storm-1 flex items-center justify-center">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No versions found for language */}
      {selectedLanguage && filteredVersions.length === 0 && (
        <Card padding="md" className="bg-snow-storm-1 animate-fade-in">
          <p className="text-sm text-text-secondary">
            {t('noVersionsForLanguage', { language: selectedLanguage })}
          </p>
        </Card>
      )}
    </div>
  );
}
