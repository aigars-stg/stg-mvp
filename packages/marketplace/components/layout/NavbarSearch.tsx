'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Close, RefreshCw as Loader2 } from 'griddy-icons';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  listingCount: number;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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
        // Search games that have active listings
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}&limit=6&with_listings=true`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.games || []);
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
          {results.map((game, index) => (
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
                {game.thumbnail ? (
                  <img
                    src={game.thumbnail}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Search className="w-4 h-4 text-text-muted" />
                )}
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-polar-night truncate">
                  {game.name}
                </div>
                <div className="text-xs text-text-muted">
                  {game.yearPublished && `${game.yearPublished} • `}
                  {game.listingCount} {game.listingCount === 1 ? 'listing' : 'listings'}
                </div>
              </div>
            </button>
          ))}

          {/* View All Results */}
          {query.trim() && (
            <button
              onClick={handleSubmit}
              className="w-full px-4 py-3 text-sm text-frost-ice hover:bg-frost-ice/5 border-t border-border-subtle transition-colors text-left"
            >
              Search all games for "{query}"
            </button>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-snow-white border border-border rounded-xl shadow-lg p-4 z-50">
          <p className="text-sm text-text-secondary text-center">
            No games found for "{query}"
          </p>
          <button
            onClick={handleSubmit}
            className="w-full mt-2 text-sm text-frost-ice hover:underline"
          >
            Search all listings
          </button>
        </div>
      )}
    </div>
  );
}
