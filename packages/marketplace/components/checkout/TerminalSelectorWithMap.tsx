'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, Check, Loader2, Map as MapIcon, List } from 'lucide-react';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';

// Dynamically import the map component to avoid SSR issues and reduce initial bundle
const TerminalMap = dynamic(() => import('./TerminalMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] rounded-lg border border-border bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin text-frost-ice mx-auto mb-2" />
        <span className="text-sm text-text-secondary">Loading map...</span>
      </div>
    </div>
  ),
});

interface TerminalSelectorWithMapProps {
  country: TerminalCountry;
  onCountryChange: (country: TerminalCountry) => void;
  selectedTerminal: Terminal | null;
  onSelect: (terminal: Terminal) => void;
  error?: string;
}

const COUNTRIES: { code: TerminalCountry; name: string; flag: string }[] = [
  { code: 'LT', name: 'Lithuania', flag: 'fi fi-lt' },
  { code: 'LV', name: 'Latvia', flag: 'fi fi-lv' },
  { code: 'EE', name: 'Estonia', flag: 'fi fi-ee' },
];

type ViewMode = 'map' | 'list';

export function TerminalSelectorWithMap({
  country,
  onCountryChange,
  selectedTerminal,
  onSelect,
  error,
}: TerminalSelectorWithMapProps) {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isListExpanded, setIsListExpanded] = useState(true);

  // Fetch terminals when country changes
  useEffect(() => {
    const fetchTerminals = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        const response = await fetch(`/api/shipping/terminals?country=${country}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch terminals');
        }

        setTerminals(data.terminals || []);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load terminals');
        setTerminals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTerminals();
    setIsListExpanded(true);
  }, [country]);

  // Handle terminal selection
  const handleTerminalSelect = (terminal: Terminal) => {
    onSelect(terminal);
    setIsListExpanded(false);
  };

  // Filter terminals by search query
  const filteredTerminals = useMemo(() => {
    if (!searchQuery.trim()) return terminals;

    const query = searchQuery.toLowerCase();
    return terminals.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query) ||
        t.city.toLowerCase().includes(query)
    );
  }, [terminals, searchQuery]);

  // Group terminals by city
  const terminalsByCity = useMemo(() => {
    const grouped: Record<string, Terminal[]> = {};
    filteredTerminals.forEach((terminal) => {
      if (!grouped[terminal.city]) {
        grouped[terminal.city] = [];
      }
      grouped[terminal.city].push(terminal);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTerminals]);

  // Terminal list component (reused in both mobile list view and desktop sidebar)
  const TerminalList = ({ maxHeight = '400px' }: { maxHeight?: string }) => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-8" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-frost-ice" aria-hidden="true" />
          <span className="ml-2 text-text-secondary">Loading terminals...</span>
        </div>
      ) : fetchError ? (
        <div className="text-center py-8 text-aurora-red" role="alert">
          <p>{fetchError}</p>
          <button
            type="button"
            onClick={() => onCountryChange(country)}
            className="mt-2 text-sm text-frost-ice hover:underline min-h-[32px] px-3 py-1"
          >
            Try again
          </button>
        </div>
      ) : filteredTerminals.length === 0 ? (
        <div className="text-center py-8 text-text-secondary" role="status">
          {searchQuery
            ? 'No terminals found matching your search'
            : 'No terminals available'}
        </div>
      ) : !isListExpanded && selectedTerminal ? (
        <button
          type="button"
          onClick={() => setIsListExpanded(true)}
          aria-label="Change selected terminal"
          className="w-full text-left p-4 rounded-lg bg-aurora-green/10 border-2 border-aurora-green/20 hover:border-aurora-green/40 transition-all"
        >
          <div className="flex items-center gap-2 text-aurora-green">
            <Check className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Selected Terminal</span>
          </div>
          <p className="mt-1 text-sm text-polar-night">
            {selectedTerminal.name} - {selectedTerminal.address}, {selectedTerminal.city}
          </p>
          <p className="mt-1 text-xs text-frost-ice">
            Click to change terminal
          </p>
        </button>
      ) : (
        <div className={`overflow-y-auto space-y-4 pr-1`} style={{ maxHeight }}>
          {terminalsByCity.map(([city, cityTerminals]) => (
            <div key={city}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                {city}
              </h4>
              <div className="space-y-2">
                {cityTerminals.map((terminal) => (
                  <button
                    key={terminal.id}
                    type="button"
                    onClick={() => handleTerminalSelect(terminal)}
                    className={`
                      w-full text-left p-3 rounded-lg border-2 transition-all
                      ${
                        selectedTerminal?.id === terminal.id
                          ? 'border-frost-ice bg-frost-ice/5 ring-2 ring-frost-ice/20'
                          : 'border-border hover:border-frost-ice/50 hover:bg-bg-secondary'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-polar-night">
                            {terminal.name}
                          </span>
                          {selectedTerminal?.id === terminal.id && (
                            <Check className="w-4 h-4 text-frost-ice flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {terminal.address}, {terminal.postalCode}
                        </p>
                        {terminal.comment && (
                          <p className="text-xs text-frost-ice mt-1 italic">
                            {terminal.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Country Selection */}
      <div>
        <label id="country-label" className="block text-sm font-medium text-polar-night mb-2">
          Delivery Country
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-labelledby="country-label">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              role="radio"
              aria-checked={country === c.code}
              onClick={() => onCountryChange(c.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCountryChange(c.code);
                }
              }}
              className={`
                flex items-center justify-center gap-2 px-3 py-3 sm:py-3.5 rounded-lg border-2 transition-all min-h-[48px]
                ${
                  country === c.code
                    ? 'border-frost-ice bg-frost-ice/10 ring-2 ring-frost-ice/20'
                    : 'border-border hover:border-frost-ice/50 hover:bg-bg-secondary'
                }
              `}
              aria-label={c.name}
            >
              <span className={`${c.flag} text-lg`} aria-hidden="true" />
              <span className="text-sm font-medium text-polar-night">{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: View Toggle */}
      <div className="lg:hidden flex rounded-lg border border-border p-1 bg-bg-secondary">
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'map'
              ? 'bg-white text-polar-night shadow-sm'
              : 'text-text-secondary hover:text-polar-night'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Map
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-polar-night shadow-sm'
              : 'text-text-secondary hover:text-polar-night'
          }`}
        >
          <List className="w-4 h-4" />
          List
        </button>
      </div>

      {/* Mobile: Map View */}
      <div className={`lg:hidden ${viewMode === 'map' ? 'block' : 'hidden'}`}>
        <TerminalMap
          terminals={terminals}
          selectedTerminal={selectedTerminal}
          onSelect={handleTerminalSelect}
          country={country}
        />
        {selectedTerminal && (
          <div className="mt-3 p-3 rounded-lg bg-aurora-green/10 border border-aurora-green/20">
            <div className="flex items-center gap-2 text-aurora-green text-sm">
              <Check className="w-4 h-4" />
              <span className="font-medium">Selected:</span>
            </div>
            <p className="text-sm text-polar-night mt-1">
              {selectedTerminal.name}
            </p>
            <p className="text-xs text-text-secondary">
              {selectedTerminal.address}, {selectedTerminal.city}
            </p>
          </div>
        )}
      </div>

      {/* Mobile: List View */}
      <div className={`lg:hidden ${viewMode === 'list' ? 'block' : 'hidden'}`}>
        {/* Search Input */}
        {isListExpanded && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, address, or city..."
                aria-label="Search terminals by name, address, or city"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
              />
            </div>
          </div>
        )}
        <TerminalList />
      </div>

      {/* Desktop: Hybrid View (Map + List side by side) */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
        {/* Map */}
        <div>
          <TerminalMap
            terminals={terminals}
            selectedTerminal={selectedTerminal}
            onSelect={handleTerminalSelect}
            country={country}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {/* Search Input */}
          {isListExpanded && (
            <div>
              <label htmlFor="terminal-search-desktop" className="block text-sm font-medium text-polar-night mb-2">
                Find Terminal
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                <input
                  id="terminal-search-desktop"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, address, or city..."
                  aria-label="Search terminals by name, address, or city"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all"
                />
              </div>
            </div>
          )}
          <TerminalList maxHeight="390px" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-aurora-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default TerminalSelectorWithMap;
