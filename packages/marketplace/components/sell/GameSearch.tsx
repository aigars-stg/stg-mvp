'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input, Card } from '@second-turn/design-system';
import { debounce } from '@/lib/bgg-utils';
import type { BGGGame, BGGVersion } from '@/lib/bgg-types';
import { BGGError } from '@/lib/bgg-errors';
import ErrorDisplay from './ErrorDisplay';
import { GameResultCard } from './GameResultCard';
import { GameImageWithBackdrop } from './GameImageWithBackdrop';
import { Search as SearchX, Close, RefreshCw, Search, LinkExternal as ExternalLink } from '@/lib/icons';
import { useTranslations } from 'next-intl';

interface GameSearchProps {
  onSelect: (game: BGGGame | null) => void;
  selectedGame: BGGGame | null;
  selectedVersion?: BGGVersion | null;
  selectedDisplayName?: string | null; // Localized display name
  onChangeVersion?: () => void;
  onChangeName?: () => void;
  initialQuery?: string; // Pre-fill search query (e.g., from navbar search)
}

export function GameSearch({ onSelect, selectedGame, selectedVersion, selectedDisplayName, onChangeVersion, onChangeName, initialQuery }: GameSearchProps) {
  const t = useTranslations('Sell.GameSearch');
  const tNoResults = useTranslations('Sell.GameSearch.noResults');

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [searchResults, setSearchResults] = useState<BGGGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<BGGError | null>(null);
  const initialSearchDone = useRef(false);
  const isInitialSearch = useRef(false);

  // Debounced search function using database
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce returns stable function
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/games/search?q=${encodeURIComponent(query)}&limit=20`
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        // Define the shape of database results
        interface DatabaseGame {
          id: number;
          name: string;
          yearpublished?: number;
          thumbnail?: string;
          bayesaverage?: number;
          is_expansion?: boolean;
          matchedAlternateName?: string;
        }

        // Convert database results to BGGGame format
        const games: BGGGame[] = data.games.map((game: DatabaseGame) => ({
          id: game.id,
          name: game.name,
          yearPublished: game.yearpublished,
          thumbnail: game.thumbnail,
          bayesaverage: game.bayesaverage,
          isExpansion: game.is_expansion,
          // Include matched alternate name for auto-selection of version/display name
          matchedAlternateName: game.matchedAlternateName,
        }));

        setSearchResults(games);
        setError(null);

        // Auto-select when exactly one result is returned from a user-triggered search
        if (games.length === 1 && !isInitialSearch.current) {
          onSelect(games[0]);
        }
        isInitialSearch.current = false;

      } catch (err: unknown) {
        console.error('❌ [GameSearch] Search error:', err);

        setError(new BGGError(
          'UNKNOWN',
          'Search failed. Please try again.',
          { originalError: err instanceof Error ? err.message : 'Unknown error', query }
        ));
        setSearchResults([]);

      } finally {
        setIsLoading(false);
      }
    }, 300), // Reduced from 500ms to 300ms for faster database search
    []
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    performSearch(value);
  };

  // Trigger search on mount if initialQuery is provided
  useEffect(() => {
    if (initialQuery && !initialSearchDone.current && !selectedGame) {
      initialSearchDone.current = true;
      isInitialSearch.current = true;
      performSearch(initialQuery);
    }
  }, [initialQuery, selectedGame, performSearch]);

  const handleRetry = () => {
    performSearch(searchQuery);
  };

  if (selectedGame) {
    // Determine if we should show alternate/localized name as primary with English as subtitle
    const showAlternateNameAsPrimary =
      (selectedDisplayName && selectedDisplayName !== selectedGame.name)
        ? selectedDisplayName
        : selectedGame.matchedAlternateName;

    const displayName = showAlternateNameAsPrimary || selectedGame.name;
    const subtitleName = showAlternateNameAsPrimary ? selectedGame.name : null;

    const versionLanguage = selectedVersion?.languages?.join(' / ') || selectedVersion?.language;
    const versionPublisher = selectedVersion?.publishers?.join(' / ') || selectedVersion?.publisher;
    const displayYear = selectedVersion?.yearPublished || selectedGame.yearPublished;

    return (
      <div className="relative border-2 border-frost-ice rounded-lg p-3 flex gap-3">
        <GameImageWithBackdrop
          src={selectedVersion?.thumbnail || selectedGame.thumbnail || selectedGame.image || null}
          alt={selectedGame.name}
          isLoading={false}
          hasError={false}
        />
        <div className="flex-1 flex flex-col justify-center min-w-0 min-h-0">
          {/* Name + year + BGG link */}
          <div className="flex items-start gap-1.5">
            <h3 className="font-semibold text-polar-night leading-tight line-clamp-2 min-w-0">
              {displayName}
              {displayYear && (
                <span className="text-text-muted font-normal"> ({displayYear})</span>
              )}
            </h3>
            <a
              href={`https://boardgamegeek.com/boardgame/${selectedGame.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-frost-ice transition-colors flex-shrink-0"
              title="BoardGameGeek"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Subtitle: English name when showing localized */}
          {subtitleName && (
            <p className="text-xs text-text-muted truncate">{subtitleName}</p>
          )}

          {/* Version info line */}
          {(versionLanguage || versionPublisher) && (
            <p className="text-sm text-text-secondary mt-0.5">
              {versionLanguage}
              {versionLanguage && versionPublisher && ' \u00b7 '}
              {versionPublisher}
            </p>
          )}

          {/* Inline change links */}
          <div className="flex items-center gap-2 text-xs mt-1 flex-wrap justify-end">
            {selectedVersion && onChangeVersion && (
              <>
                <button
                  onClick={onChangeVersion}
                  className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('changeVersion')}
                </button>
                <span className="text-border">&middot;</span>
              </>
            )}
            {selectedVersion && onChangeName && (
              <>
                <button
                  onClick={onChangeName}
                  className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('changeName')}
                </button>
                <span className="text-border">&middot;</span>
              </>
            )}
            <button
              onClick={() => {
                onSelect(null);
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}
              className="text-frost-ice hover:text-aurora-blue flex items-center gap-1 transition-colors"
            >
              <Search className="w-3 h-3" />
              {t('changeGame')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className={`relative ${!hasSearched && searchQuery.length === 0 ? 'animate-pulse-border' : ''}`}>
          <Input
            type="text"
            placeholder={t('placeholder')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            inputSize="lg"
            className="text-base sm:text-lg"
            leftIcon={<Search className="w-5 h-5 text-text-muted" />}
            autoFocus
          />
        </div>
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-secondary rounded-full transition-colors z-10"
            title={t('clearSearch')}
          >
            <Close className="w-5 h-5 text-text-muted hover:text-polar-night" />
          </button>
        )}
      </div>

      {/* Add custom CSS for pulse-border animation (respects prefers-reduced-motion via globals.css) */}
      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(136, 192, 208, 0);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(136, 192, 208, 0.3);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
          border-radius: 0.5rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-border {
            animation: none;
            box-shadow: 0 0 0 2px rgba(136, 192, 208, 0.3);
          }
        }
      `}</style>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
          <p className="mt-3 text-text-secondary">{t('searching')}</p>
        </div>
      )}

      {/* Search Results */}
      {!isLoading && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-text-muted">
            {t(searchResults.length === 1 ? 'resultsFound' : 'resultsFound_other', { count: searchResults.length })}
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((game) => (
              <GameResultCard
                key={game.id}
                id={game.id}
                name={game.name}
                yearpublished={game.yearPublished}
                isExpansion={game.isExpansion}
                onClick={() => onSelect(game)}
                matchedAlternateName={game.matchedAlternateName}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State - Only When Blocked */}
      {!isLoading && error && searchResults.length === 0 && (
        <ErrorDisplay error={error} onRetry={handleRetry} />
      )}

      {/* No Results (Not an Error) */}
      {!isLoading && !error && hasSearched && searchQuery.length >= 2 && searchResults.length === 0 && (
        <Card padding="md" className="bg-aurora-red/5 border border-aurora-red/20">
          <div className="space-y-3 text-sm">
            <p className="text-aurora-red font-medium flex items-center gap-2">
              <SearchX className="w-4 h-4" />
              {tNoResults('title', { query: searchQuery })}
            </p>
            <p className="text-text-secondary">
              {tNoResults('helpText1')}{' '}
              <a
                href="https://boardgamegeek.com/geeksearch.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-frost-ice hover:underline"
              >
                {tNoResults('bggLink')}
              </a>
              {' '}{tNoResults('helpText2')}
            </p>
            <p className="text-text-secondary">
              {tNoResults('helpText3')}{' '}
              <a
                href="mailto:info@secondturn.games"
                className="text-frost-ice hover:underline"
              >
                {tNoResults('contactLink')}
              </a>
              {' '}{tNoResults('helpText4')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
