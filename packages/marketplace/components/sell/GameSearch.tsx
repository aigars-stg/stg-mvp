'use client';

import { useState, useCallback } from 'react';
import { Input, Card } from '@second-turn/design-system';
import { debounce } from '@/lib/bgg-utils';
import type { BGGGame, BGGVersion } from '@/lib/bgg-types';
import { BGGError } from '@/lib/bgg-errors';
import ErrorDisplay from './ErrorDisplay';
import { GameResultCard } from './GameResultCard';
import { SearchX, X, RefreshCw, Search } from 'lucide-react';

interface GameSearchProps {
  onSelect: (game: BGGGame | null) => void;
  selectedGame: BGGGame | null;
  selectedVersion?: BGGVersion | null;
  selectedDisplayName?: string | null; // Localized display name
  onChangeVersion?: () => void;
  hideChangeVersionButton?: boolean; // Hide button to render it externally
}

export function GameSearch({ onSelect, selectedGame, selectedVersion, selectedDisplayName, onChangeVersion, hideChangeVersionButton }: GameSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BGGGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<BGGError | null>(null);

  // Debounced search function using database
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
        console.log(`🔍 [GameSearch] Searching database for: "${query}"`);

        const response = await fetch(
          `/api/games/search?q=${encodeURIComponent(query)}&limit=20`
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        console.log(`✅ [GameSearch] Found ${data.count} results in ${data.durationMs}ms`);

        // Convert database results to BGGGame format
        const games: BGGGame[] = data.games.map((game: any) => ({
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

      } catch (err: any) {
        console.error('❌ [GameSearch] Search error:', err);

        setError(new BGGError(
          'UNKNOWN',
          'Search failed. Please try again.',
          { originalError: err.message, query }
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

  const handleRetry = () => {
    performSearch(searchQuery);
  };

  if (selectedGame) {
    // Determine if we should show alternate/localized name as primary with English as subtitle
    // Priority: explicitly selected display name > matched alternate name from search
    const showAlternateNameAsPrimary =
      (selectedDisplayName && selectedDisplayName !== selectedGame.name)
        ? selectedDisplayName
        : selectedGame.matchedAlternateName;

    return (
      <div className="space-y-3">
        <div className="relative">
          <GameResultCard
            id={selectedGame.id}
            name={selectedGame.name}
            yearpublished={selectedVersion?.yearPublished || selectedGame.yearPublished}
            isExpansion={selectedGame.isExpansion}
            onClick={() => {}} // No-op since already selected
            hideChevron={true}
            versionPublisher={selectedVersion?.publishers?.join(' / ') || selectedVersion?.publisher}
            versionLanguage={selectedVersion?.languages?.join(' / ') || selectedVersion?.language}
            versionYear={selectedVersion?.yearPublished}
            versionThumbnail={selectedVersion?.thumbnail}
            matchedAlternateName={showAlternateNameAsPrimary}
          />
          <div className="absolute inset-0 border-2 border-frost-ice rounded-lg pointer-events-none" />
          {/* X button to change game */}
          <button
            onClick={() => {
              onSelect(null);
              setSearchQuery('');
              setSearchResults([]);
              setHasSearched(false);
            }}
            className="absolute top-2 right-2 p-1.5 bg-white hover:bg-aurora-red/10 rounded-full border border-border hover:border-aurora-red transition-all shadow-sm group"
            title="Change game"
          >
            <X className="w-4 h-4 text-text-muted group-hover:text-aurora-red transition-colors" />
          </button>
        </div>

        {/* Change Version button (only shown when version is selected and not hidden) */}
        {!hideChangeVersionButton && selectedVersion && onChangeVersion && (
          <button
            onClick={onChangeVersion}
            className="w-full px-4 py-2 text-sm font-medium text-frost-ice hover:text-aurora-blue border-2 border-frost-ice/30 hover:border-frost-ice rounded-lg hover:bg-frost-ice/5 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Change Version
          </button>
        )}
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
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className={`relative ${!hasSearched && searchQuery.length === 0 ? 'animate-pulse-border' : ''}`}>
          <Input
            type="text"
            placeholder="e.g., Wingspan, Catan, Icecool"
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
            title="Clear search"
          >
            <X className="w-5 h-5 text-text-muted hover:text-polar-night" />
          </button>
        )}
      </div>

      {/* Add custom CSS for pulse-border animation */}
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
      `}</style>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frost-ice" />
          <p className="mt-3 text-text-secondary">Searching games...</p>
        </div>
      )}

      {/* Search Results */}
      {!isLoading && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-text-muted">
            Found {searchResults.length} game{searchResults.length !== 1 ? 's' : ''} - select yours:
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((game: any) => (
              <GameResultCard
                key={game.id}
                id={game.id}
                name={game.name}
                yearpublished={game.yearPublished}
                bayesaverage={game.bayesaverage}
                isExpansion={game.isExpansion}
                onClick={onSelect}
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
              We couldn't find "{searchQuery}"
            </p>
            <p className="text-text-secondary">
              Check the spelling on your game box, or search{' '}
              <a
                href="https://boardgamegeek.com/geeksearch.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-frost-ice hover:underline"
              >
                BoardGameGeek.com
              </a>
              {' '}for the exact title.
            </p>
            <p className="text-text-secondary">
              Still can't find it?{' '}
              <a
                href="mailto:info@secondturn.games"
                className="text-frost-ice hover:underline"
              >
                Let us know
              </a>
              {' '}and we'll help.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
