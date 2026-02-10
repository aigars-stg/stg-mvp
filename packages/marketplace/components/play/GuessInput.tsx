'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@second-turn/design-system';
import { debounce } from '@/lib/bgg-utils';
import { Search, Close } from 'griddy-icons';
import Image from 'next/image';

interface GameSearchResult {
  id: number;
  name: string;
  yearpublished: number | null;
  thumbnail: string | null;
}

interface GuessInputProps {
  onSelect: (game: GameSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function GuessInput({ onSelect, disabled, placeholder }: GuessInputProps) {
  const t = useTranslations('Play');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced search
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce creates a stable function; including it would recreate on every render, defeating the purpose of debouncing
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/games/search?q=${encodeURIComponent(searchQuery)}&limit=10&base_games_only=true`
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        const games: GameSearchResult[] = (data.games || []).map(
          (g: { id: number; name: string; yearpublished?: number; thumbnail?: string }) => ({
            id: g.id,
            name: g.name,
            yearpublished: g.yearpublished || null,
            thumbnail: g.thumbnail || null,
          })
        );

        setResults(games);
        setIsOpen(games.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

  // Handle selection
  const handleSelect = (game: GameSearchResult) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(game);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear input
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-gray-400" />
        </div>
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder || t('guessPlaceholder')}
          disabled={disabled}
          className="pl-10 pr-10"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            type="button"
          >
            <Close size={20} />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-500" />
        </div>
      )}

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto"
          role="listbox"
        >
          {results.map((game, index) => (
            <li
              key={game.id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-teal-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(game)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded overflow-hidden">
                {game.thumbnail ? (
                  <Image
                    src={game.thumbnail}
                    alt=""
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    ?
                  </div>
                )}
              </div>

              {/* Game info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {game.name}
                </p>
                {game.yearpublished && (
                  <p className="text-xs text-gray-500">
                    {game.yearpublished}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
