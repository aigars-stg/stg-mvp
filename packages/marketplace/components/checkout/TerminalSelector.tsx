'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, LocationPin as MapPin, Check, RefreshCw as Loader2 } from 'griddy-icons';
import type { Terminal, TerminalCountry } from '@/lib/unisend/types';

interface TerminalSelectorProps {
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

export function TerminalSelector({
  country,
  onCountryChange,
  selectedTerminal,
  onSelect,
  error,
}: TerminalSelectorProps) {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

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
    setIsExpanded(true); // Expand when country changes
  }, [country]);

  // Handle terminal selection
  const handleTerminalSelect = (terminal: Terminal) => {
    onSelect(terminal);
    setIsExpanded(false); // Collapse after selection
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
    // Sort cities alphabetically
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTerminals]);

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

      {/* Search Input */}
      {isExpanded && (
        <div>
          <label htmlFor="terminal-search" className="block text-sm font-medium text-polar-night mb-2">
            Find Terminal
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
            <input
              id="terminal-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, address, or city..."
              aria-label="Search terminals by name, address, or city"
              className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-lg border border-border bg-bg-primary text-polar-night placeholder-text-muted focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20 outline-none transition-all min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Terminal List */}
      <div className="space-y-2" aria-live="polite" aria-busy={loading}>
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
        ) : !isExpanded && selectedTerminal ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label="Change selected terminal"
            className="w-full text-left p-4 sm:p-5 rounded-lg bg-aurora-green/10 border-2 border-aurora-green/20 hover:border-aurora-green/40 transition-all min-h-[80px]"
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
          <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
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

      {/* Error */}
      {error && (
        <p className="text-sm text-aurora-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
