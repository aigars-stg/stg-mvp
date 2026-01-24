'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@second-turn/design-system';
import { getLanguageFlag } from '@/lib/bgg-utils';
import type { BGGGame, BGGVersion } from '@/lib/bgg-types';
import { useTranslations } from 'next-intl';

interface VersionSelectorProps {
  game: BGGGame;
  selectedVersion: BGGVersion | null;
  onSelect: (version: BGGVersion) => void;
}

export function VersionSelector({ game, selectedVersion, onSelect }: VersionSelectorProps) {
  const tLoading = useTranslations('Sell.VersionSelector.loading');
  const tNoVersions = useTranslations('Sell.VersionSelector.noVersions');
  const tFetchError = useTranslations('Sell.VersionSelector.fetchError');
  const tGameInfo = useTranslations('Sell.VersionSelector.gameInfo');
  const tVersionList = useTranslations('Sell.VersionSelector.versionList');
  const tHelp = useTranslations('Sell.VersionSelector.help');

  const [versions, setVersions] = useState<BGGVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      setIsLoading(true);
      setError(null);

      try {
        // Call server-side API route instead of BGG directly
        const response = await fetch(`/api/games/${game.id}/versions`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        const fetchedVersions = data.versions;

        setVersions(fetchedVersions);

        if (fetchedVersions.length === 0) {
          setError('no-versions');
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
        setError('fetch-error');
      } finally {
        setIsLoading(false);
      }
    }

    if (game) {
      fetchVersions();
    }
  }, [game]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-frost-ice" />
        <p className="mt-4 text-text-secondary">{tLoading('title')}</p>
        <p className="text-sm text-text-muted mt-2">{tLoading('subtitle')}</p>
      </div>
    );
  }

  if (error === 'no-versions') {
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
              // Create a basic version object
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

  if (error === 'fetch-error') {
    return (
      <Card padding="md" className="bg-aurora-red/10 border border-aurora-red/20">
        <div className="text-sm">
          <div className="font-semibold text-polar-night mb-2">
            {tFetchError('title')}
          </div>
          <p className="text-text-secondary mb-4">
            {tFetchError('description')}
          </p>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            {tFetchError('retryButton')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Game Summary */}
      <Card padding="md" className="bg-snow-stormLight">
        <div className="flex gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-polar-night">
              {game.name}
            </h3>
            {game.yearPublished && (
              <p className="text-sm text-text-secondary mt-1">
                {tGameInfo('originalRelease', { year: game.yearPublished })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Versions List */}
      {versions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-polar-night">
              {tVersionList(versions.length === 1 ? 'foundVersions' : 'foundVersions_other', { count: versions.length })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => onSelect(version)}
                className={`
                  text-left p-4 rounded-lg border-2 transition-all
                  hover:border-frost-ice hover:shadow-md
                  ${
                    selectedVersion?.id === version.id
                      ? 'border-frost-ice bg-frost-ice/5 shadow-sm'
                      : 'border-border-subtle bg-snow-white'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Version Name */}
                    <div className="font-semibold text-polar-night mb-2">
                      {version.name}
                    </div>

                    {/* Version Details */}
                    <div className="space-y-1">
                      {version.publisher && (
                        <div className="text-sm flex items-start gap-2">
                          <span className="text-text-muted min-w-[80px]">{tVersionList('publisher')}</span>
                          <span className="text-text-secondary">{version.publisher}</span>
                        </div>
                      )}

                      {version.language && (
                        <div className="text-sm flex items-start gap-2">
                          <span className="text-text-muted min-w-[80px]">{tVersionList('language')}</span>
                          <span className="text-text-secondary flex items-center gap-1">
                            {getLanguageFlag(version.language)}
                            {version.language}
                          </span>
                        </div>
                      )}

                      {version.yearPublished && (
                        <div className="text-sm flex items-start gap-2">
                          <span className="text-text-muted min-w-[80px]">{tVersionList('year')}</span>
                          <span className="text-text-secondary">{version.yearPublished}</span>
                        </div>
                      )}

                      {version.productCode && (
                        <div className="text-sm flex items-start gap-2">
                          <span className="text-text-muted min-w-[80px]">{tVersionList('productCode')}</span>
                          <span className="text-text-secondary font-mono text-xs">
                            {version.productCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selection Checkmark */}
                  {selectedVersion?.id === version.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-frost-ice flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help Card */}
      <Card padding="md" className="bg-frost-ice/5 border border-frost-ice/20">
        <div className="flex gap-3">
          <div className="text-frost-ice flex-shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold text-polar-night mb-1">
              {tHelp('title')}
            </div>
            <div className="text-text-secondary">
              {tHelp('description')}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
