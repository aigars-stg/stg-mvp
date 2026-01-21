'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Close, RefreshCw as Loader2, PuzzlePiece as Puzzle, Tag, Heart } from 'griddy-icons';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface SearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  listingCount: number;
  isExpansion: boolean;
}

// Store for lazy-loaded thumbnails
const thumbnailCache = new Map<number, string | null>();

interface NavbarSearchProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional className */
  className?: string;
  /** Mobile variant (full width, larger) */
  isMobile?: boolean;
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Callback when navigation occurs (for closing mobile modal) */
  onNavigate?: () => void;
}

/**
 * Search bar component for the navbar with autocomplete
 */
export function NavbarSearch({
  placeholder = 'Search board games...',
  className,
  isMobile = false,
  onSearch,
  onNavigate,
}: NavbarSearchProps) {
  const router = useRouter();
  const t = useTranslations('NavbarSearch');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loadedThumbnails, setLoadedThumbnails] = useState<Map<number, string | null>>(new Map());

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Search games (not restricted to those with listings)
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}&limit=6&with_listings=true`);
        if (res.ok) {
          const data = await res.json();
          // Map API response fields to component interface
          interface GameApiResponse {
            id: number;
            name: string;
            yearpublished: number | null;
            thumbnail: string | null;
            listingCount?: number;
            is_expansion?: boolean;
          }
          const mappedResults: SearchResult[] = (data.games || []).map((game: GameApiResponse) => ({
            id: game.id,
            name: game.name,
            yearPublished: game.yearpublished,
            thumbnail: game.thumbnail,
            listingCount: game.listingCount || 0,
            isExpansion: game.is_expansion || false,
          }));
          setResults(mappedResults);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Lazy-load thumbnails for games that don't have them
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    results.forEach(async (game) => {
      // Skip if already has thumbnail from API or already loaded/loading
      if (game.thumbnail || thumbnailCache.has(game.id) || loadedThumbnails.has(game.id)) {
        return;
      }

      // Mark as loading
      thumbnailCache.set(game.id, null);

      try {
        const res = await fetch(`/api/games/${game.id}/thumbnail`);
        if (res.ok) {
          const data = await res.json();
          if (data.thumbnail) {
            thumbnailCache.set(game.id, data.thumbnail);
            setLoadedThumbnails(prev => new Map(prev).set(game.id, data.thumbnail));
          }
        }
      } catch (error) {
        console.error(`Failed to load thumbnail for game ${game.id}:`, error);
      }
    });
  }, [isOpen, results]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' && query.trim()) {
          handleSubmit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelectGame(results[selectedIndex]);
          } else if (query.trim()) {
            handleSubmit();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, results, selectedIndex, query]
  );

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch?.(query.trim());
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery('');
      onNavigate?.();
    }
  };

  const handleSelectGame = (game: SearchResult) => {
    router.push(`/game/${game.id}`);
    setIsOpen(false);
    setQuery('');
    onNavigate?.();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSellGame = () => {
    router.push(`/sell?q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    setQuery('');
    onNavigate?.();
  };

  const handleRequestGame = () => {
    router.push(`/wanted/new?q=${encodeURIComponent(query.trim())}`);
    setIsOpen(false);
    setQuery('');
    onNavigate?.();
  };

  // Get thumbnail for a game (from API response or lazy-loaded)
  const getThumbnail = (game: SearchResult): string | null => {
    return game.thumbnail || loadedThumbnails.get(game.id) || thumbnailCache.get(game.id) || null;
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div
        className={cn(
          'relative flex items-center',
          isMobile ? 'w-full' : 'w-64 lg:w-80'
        )}
      >
        <Search
          className={cn(
            'absolute left-3 text-text-muted pointer-events-none',
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-frost-ice focus:border-transparent transition-all',
            isMobile ? 'pl-11 pr-10 py-3 text-base' : 'pl-9 pr-8 py-2 text-sm'
          )}
          aria-label="Search games"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
        />
        {query && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-2 text-text-muted hover:text-text-secondary transition-colors',
              isMobile ? 'p-1' : ''
            )}
            aria-label="Clear search"
          >
            {isLoading ? (
              <Loader2 className={cn('animate-spin', isMobile ? 'w-5 h-5' : 'w-4 h-4')} />
            ) : (
              <Close className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
            )}
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          id="search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-snow-white border border-border rounded-xl shadow-lg overflow-hidden z-50"
        >
          {results.map((game, index) => {
            const thumbnail = getThumbnail(game);
            const isLoadingThumbnail = !game.thumbnail && !loadedThumbnails.has(game.id) && thumbnailCache.has(game.id);

            return (
              <button
                key={game.id}
                onClick={() => handleSelectGame(game)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  index === selectedIndex ? 'bg-frost-ice/10' : 'hover:bg-bg-secondary'
                )}
              >
                {/* Game Thumbnail */}
                <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-bg-secondary overflow-hidden flex items-center justify-center">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : isLoadingThumbnail ? (
                    <div className="w-3 h-3 border-2 border-snow-storm border-t-polar-nightDark rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-text-muted" />
                  )}
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-polar-night truncate">
                      {game.name}
                    </span>
                    {game.isExpansion && (
                      <span className="inline-flex items-center p-1 text-aurora-purple bg-aurora-purple/10 rounded-full flex-shrink-0" title={t('expansion')}>
                        <Puzzle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted">
                    {game.yearPublished && `${game.yearPublished} • `}
                    {game.listingCount} {game.listingCount === 1 ? t('listing') : t('listings')}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Action Buttons */}
          {query.trim() && (
            <div className="border-t border-border-subtle p-3 flex gap-2">
              <button
                onClick={handleSellGame}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-frost-ice bg-frost-ice/10 hover:bg-frost-ice/20 rounded-lg transition-colors"
              >
                <Tag className="w-4 h-4" />
                {t('sellThisGame')}
              </button>
              <button
                onClick={handleRequestGame}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-aurora-red bg-aurora-red/10 hover:bg-aurora-red/20 rounded-lg transition-colors"
              >
                <Heart className="w-4 h-4" />
                {t('requestThisGame')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-snow-white border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <p className="text-sm text-text-secondary text-center px-4 py-3">
            {t('noGamesFound', { query })}
          </p>
          <div className="border-t border-border-subtle p-3 flex gap-2">
            <button
              onClick={handleSellGame}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-frost-ice bg-frost-ice/10 hover:bg-frost-ice/20 rounded-lg transition-colors"
            >
              <Tag className="w-4 h-4" />
              {t('sellThisGame')}
            </button>
            <button
              onClick={handleRequestGame}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-aurora-red bg-aurora-red/10 hover:bg-aurora-red/20 rounded-lg transition-colors"
            >
              <Heart className="w-4 h-4" />
              {t('requestThisGame')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
