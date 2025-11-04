'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input, Select, Checkbox, Button, Badge } from '@second-turn/design-system';
import {
  Package, ChevronDown, Star, Sparkles, CircleCheck, Wrench, X,
  Users, Baby, Clock, Bookmark, Trash2
} from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import type { ListingWithSeller } from '@/lib/types/listing';
import {
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
  countActiveFilters,
  getMaxSavedSearches,
  type SavedSearch,
  type SavedSearchFilters,
} from '@/lib/saved-searches';

export default function BrowsePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Data state
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states - will be initialized from URL params
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [selectedPlayerCounts, setSelectedPlayerCounts] = useState<Set<number>>(new Set());
  const [selectedMinAges, setSelectedMinAges] = useState<Set<number>>(new Set());
  const [selectedPlayingTimes, setSelectedPlayingTimes] = useState<Set<string>>(new Set());
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Track if filters have been initialized from URL
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Ref for search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchError, setSaveSearchError] = useState('');
  const [showSavedSearchesMenu, setShowSavedSearchesMenu] = useState(false);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const query = searchParams.get('q');
    const conditions = searchParams.get('conditions');
    const languages = searchParams.get('languages');
    const playerCounts = searchParams.get('players');
    const minAges = searchParams.get('ages');
    const playingTimes = searchParams.get('times');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort');

    if (query) setSearchQuery(query);
    if (conditions) setSelectedConditions(new Set(conditions.split(',')));
    if (languages) setSelectedLanguages(new Set(languages.split(',')));
    if (playerCounts) setSelectedPlayerCounts(new Set(playerCounts.split(',').map(Number)));
    if (minAges) setSelectedMinAges(new Set(minAges.split(',').map(Number)));
    if (playingTimes) setSelectedPlayingTimes(new Set(playingTimes.split(',')));
    if (minPrice) setPriceMin(minPrice);
    if (maxPrice) setPriceMax(maxPrice);
    if (sort) setSortBy(sort);

    setFiltersInitialized(true);
  }, [searchParams]);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (!filtersInitialized) return;

    const params = new URLSearchParams();

    if (searchQuery) params.set('q', searchQuery);
    if (selectedConditions.size > 0) params.set('conditions', Array.from(selectedConditions).join(','));
    if (selectedLanguages.size > 0) params.set('languages', Array.from(selectedLanguages).join(','));
    if (selectedPlayerCounts.size > 0) params.set('players', Array.from(selectedPlayerCounts).join(','));
    if (selectedMinAges.size > 0) params.set('ages', Array.from(selectedMinAges).join(','));
    if (selectedPlayingTimes.size > 0) params.set('times', Array.from(selectedPlayingTimes).join(','));
    if (priceMin) params.set('minPrice', priceMin);
    if (priceMax) params.set('maxPrice', priceMax);
    if (sortBy !== 'recent') params.set('sort', sortBy);

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [
    searchQuery,
    selectedConditions,
    selectedLanguages,
    selectedPlayerCounts,
    selectedMinAges,
    selectedPlayingTimes,
    priceMin,
    priceMax,
    sortBy,
    filtersInitialized,
    pathname,
    router,
  ]);

  // Fetch listings with pagination
  const fetchListings = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/listings?page=${page}&limit=20`);

      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      const newListings = data.listings || [];

      if (append && page > 1) {
        // Append to existing listings for infinite scroll
        setListings((prev) => [...prev, ...newListings]);
      } else {
        // Replace listings for first page or filter changes
        setListings(newListings);
      }

      setCurrentPage(page);
      setHasMore(data.pagination?.hasMore || false);
      setTotalCount(data.pagination?.total || 0);
      setError('');
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchListings(1, false);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (filtersInitialized) {
      fetchListings(1, false);
    }
  }, [searchQuery, selectedConditions, selectedLanguages, selectedPlayerCounts, selectedMinAges, selectedPlayingTimes, priceMin, priceMax, sortBy]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      // Check if user scrolled near bottom (within 300px)
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollHeight - scrollTop - clientHeight < 300) {
        // Load more if: not currently loading, has more items, and filters are initialized
        if (!loadingMore && !loading && hasMore && filtersInitialized) {
          fetchListings(currentPage + 1, true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, loading, hasMore, currentPage, filtersInitialized]);

  // Load saved searches on mount
  useEffect(() => {
    setSavedSearches(getSavedSearches());
  }, []);

  // Close saved searches menu on outside click
  useEffect(() => {
    if (!showSavedSearchesMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-saved-searches-menu]')) {
        setShowSavedSearchesMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSavedSearchesMenu]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" key to focus search (but not when already typing in an input)
      if (e.key === '/' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape key to clear search when focused
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get current filter state
  const getCurrentFilters = (): SavedSearchFilters => ({
    searchQuery: searchQuery || undefined,
    selectedConditions: selectedConditions.size > 0 ? Array.from(selectedConditions) : undefined,
    selectedLanguages: selectedLanguages.size > 0 ? Array.from(selectedLanguages) : undefined,
    selectedPlayerCounts: selectedPlayerCounts.size > 0 ? Array.from(selectedPlayerCounts) : undefined,
    selectedMinAges: selectedMinAges.size > 0 ? Array.from(selectedMinAges) : undefined,
    selectedPlayingTimes: selectedPlayingTimes.size > 0 ? Array.from(selectedPlayingTimes) : undefined,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    sortBy: sortBy !== 'recent' ? sortBy : undefined,
  });

  // Handle save search
  const handleSaveSearch = () => {
    try {
      setSaveSearchError('');

      if (!saveSearchName.trim()) {
        setSaveSearchError('Please enter a name for your search');
        return;
      }

      if (saveSearchName.length > 50) {
        setSaveSearchError('Name must be 50 characters or less');
        return;
      }

      const filters = getCurrentFilters();
      const newSearch = saveSearch(saveSearchName.trim(), filters);

      if (newSearch) {
        setSavedSearches(getSavedSearches());
        setShowSaveDialog(false);
        setSaveSearchName('');
        alert('Search saved successfully!');
      }
    } catch (error: any) {
      setSaveSearchError(error.message || 'Failed to save search');
    }
  };

  // Handle load saved search
  const handleLoadSavedSearch = (search: SavedSearch) => {
    const { filters } = search;

    // Apply all filters
    setSearchQuery(filters.searchQuery || '');
    setSelectedConditions(new Set(filters.selectedConditions || []));
    setSelectedLanguages(new Set(filters.selectedLanguages || []));
    setSelectedPlayerCounts(new Set(filters.selectedPlayerCounts || []));
    setSelectedMinAges(new Set(filters.selectedMinAges || []));
    setSelectedPlayingTimes(new Set(filters.selectedPlayingTimes || []));
    setPriceMin(filters.priceMin || '');
    setPriceMax(filters.priceMax || '');
    setSortBy(filters.sortBy || 'recent');

    setShowSavedSearchesMenu(false);
  };

  // Handle delete saved search
  const handleDeleteSavedSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved search?')) {
      deleteSavedSearch(id);
      setSavedSearches(getSavedSearches());
    }
  };

  // Helper: Check if a player count matches a game's player range
  const playerCountMatches = (gamePlayerCount: string | null, selectedCount: number): boolean => {
    if (!gamePlayerCount) return false;

    // Handle ranges like "2-6" or "1-4"
    if (gamePlayerCount.includes('-')) {
      const [min, max] = gamePlayerCount.split('-').map(n => parseInt(n.trim()));
      return selectedCount >= min && selectedCount <= max;
    }

    // Handle exact counts like "4"
    const exactCount = parseInt(gamePlayerCount);
    return exactCount === selectedCount;
  };

  // Helper: Check if playing time matches selected time range
  const playingTimeMatches = (gamePlayingTime: string | null, selectedTime: string): boolean => {
    if (!gamePlayingTime) return false;

    const gameTime = parseInt(gamePlayingTime);
    if (isNaN(gameTime)) return false;

    switch (selectedTime) {
      case '0-30':
        return gameTime <= 30;
      case '30-60':
        return gameTime > 30 && gameTime <= 60;
      case '60-120':
        return gameTime > 60 && gameTime <= 120;
      case '120+':
        return gameTime > 120;
      default:
        return false;
    }
  };

  // Calculate available filter options from listings
  const availableOptions = useMemo(() => {
    const languages = new Set<string>();
    const conditions = new Set<string>();
    const playerCounts = new Set<number>();
    const minAges = new Set<number>();
    const playingTimeRanges = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    listings.forEach((listing) => {
      // Extract languages (handle comma-separated values)
      if (listing.language) {
        listing.language.split(', ').forEach((lang) => languages.add(lang.trim()));
      }

      // Extract conditions
      conditions.add(listing.condition);

      // Extract player counts from ranges
      if (listing.game?.player_count) {
        const playerCount = listing.game.player_count;
        if (playerCount.includes('-')) {
          const [min, max] = playerCount.split('-').map(n => parseInt(n.trim()));
          for (let i = min; i <= Math.min(max, 8); i++) {
            playerCounts.add(i);
          }
        } else {
          const count = parseInt(playerCount);
          if (!isNaN(count)) playerCounts.add(count);
        }
      }

      // Extract min ages
      if (listing.game?.min_age) {
        minAges.add(listing.game.min_age);
      }

      // Categorize playing times
      if (listing.game?.playing_time) {
        const time = parseInt(listing.game.playing_time);
        if (!isNaN(time)) {
          if (time <= 30) playingTimeRanges.add('0-30');
          else if (time <= 60) playingTimeRanges.add('30-60');
          else if (time <= 120) playingTimeRanges.add('60-120');
          else playingTimeRanges.add('120+');
        }
      }

      // Calculate price range
      if (listing.price < minPrice) minPrice = listing.price;
      if (listing.price > maxPrice) maxPrice = listing.price;
    });

    return {
      languages: Array.from(languages).sort(),
      conditions: Array.from(conditions),
      playerCounts: Array.from(playerCounts).sort((a, b) => a - b),
      minAges: Array.from(minAges).sort((a, b) => a - b),
      playingTimeRanges: Array.from(playingTimeRanges).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === -Infinity ? 100 : Math.ceil(maxPrice),
      },
    };
  }, [listings]);

  // Generate dynamic placeholder based on actual listings
  const searchPlaceholder = useMemo(() => {
    if (listings.length === 0) {
      return 'Search for board games...';
    }

    // Get unique game names
    const uniqueGames = Array.from(new Set(listings.map(l => l.game_name)));

    if (uniqueGames.length === 0) {
      return 'Search for board games...';
    }

    // Sort by name length (prefer shorter names for better mobile display)
    const sortedByLength = [...uniqueGames].sort((a, b) => a.length - b.length);

    // Take shorter names first, then randomly select 1 game
    const candidates = sortedByLength.slice(0, Math.min(5, sortedByLength.length));
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selectedGame = candidates[randomIndex];

    // Truncate if too long (max 25 chars for mobile)
    const truncatedName = selectedGame.length > 25
      ? selectedGame.substring(0, 25) + '...'
      : selectedGame;

    return `Search for ${truncatedName} or any other game...`;
  }, [listings]);

  // Handle toggles
  const toggleCondition = (condition: string) => {
    const newSet = new Set(selectedConditions);
    if (newSet.has(condition)) {
      newSet.delete(condition);
    } else {
      newSet.add(condition);
    }
    setSelectedConditions(newSet);
  };

  const toggleLanguage = (language: string) => {
    const newSet = new Set(selectedLanguages);
    if (newSet.has(language)) {
      newSet.delete(language);
    } else {
      newSet.add(language);
    }
    setSelectedLanguages(newSet);
  };

  const togglePlayerCount = (count: number) => {
    const newSet = new Set(selectedPlayerCounts);
    if (newSet.has(count)) {
      newSet.delete(count);
    } else {
      newSet.add(count);
    }
    setSelectedPlayerCounts(newSet);
  };

  const toggleMinAge = (age: number) => {
    const newSet = new Set(selectedMinAges);
    if (newSet.has(age)) {
      newSet.delete(age);
    } else {
      newSet.add(age);
    }
    setSelectedMinAges(newSet);
  };

  const togglePlayingTime = (time: string) => {
    const newSet = new Set(selectedPlayingTimes);
    if (newSet.has(time)) {
      newSet.delete(time);
    } else {
      newSet.add(time);
    }
    setSelectedPlayingTimes(newSet);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedConditions(new Set());
    setSelectedLanguages(new Set());
    setSelectedPlayerCounts(new Set());
    setSelectedMinAges(new Set());
    setSelectedPlayingTimes(new Set());
    setPriceMin('');
    setPriceMax('');
  };

  // Remove individual filters
  const removeLanguageFilter = (language: string) => {
    const newSet = new Set(selectedLanguages);
    newSet.delete(language);
    setSelectedLanguages(newSet);
  };

  const removeConditionFilter = (condition: string) => {
    const newSet = new Set(selectedConditions);
    newSet.delete(condition);
    setSelectedConditions(newSet);
  };

  const removePlayerCountFilter = (count: number) => {
    const newSet = new Set(selectedPlayerCounts);
    newSet.delete(count);
    setSelectedPlayerCounts(newSet);
  };

  const removeMinAgeFilter = (age: number) => {
    const newSet = new Set(selectedMinAges);
    newSet.delete(age);
    setSelectedMinAges(newSet);
  };

  const removePlayingTimeFilter = (time: string) => {
    const newSet = new Set(selectedPlayingTimes);
    newSet.delete(time);
    setSelectedPlayingTimes(newSet);
  };

  const removePriceFilter = () => {
    setPriceMin('');
    setPriceMax('');
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedConditions.size > 0) count++;
    if (selectedLanguages.size > 0) count++;
    if (selectedPlayerCounts.size > 0) count++;
    if (selectedMinAges.size > 0) count++;
    if (selectedPlayingTimes.size > 0) count++;
    if (priceMin || priceMax) count++;
    return count;
  }, [searchQuery, selectedConditions, selectedLanguages, selectedPlayerCounts, selectedMinAges, selectedPlayingTimes, priceMin, priceMax]);

  // Filter listings
  const filteredListings = useMemo(() => {
    let filtered = [...listings];

    // Search filter (searches game name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((listing) =>
        listing.game_name.toLowerCase().includes(query)
      );
    }

    // Condition filter
    if (selectedConditions.size > 0) {
      filtered = filtered.filter((listing) => selectedConditions.has(listing.condition));
    }

    // Language filter (handle comma-separated values)
    if (selectedLanguages.size > 0) {
      filtered = filtered.filter((listing) =>
        listing.language?.split(', ').some((lang) => selectedLanguages.has(lang.trim()))
      );
    }

    // Player count filter (handle ranges)
    if (selectedPlayerCounts.size > 0) {
      filtered = filtered.filter((listing) => {
        if (!listing.game?.player_count) return false;
        return Array.from(selectedPlayerCounts).some(count =>
          playerCountMatches(listing.game.player_count || null, count)
        );
      });
    }

    // Min age filter
    if (selectedMinAges.size > 0) {
      filtered = filtered.filter((listing) =>
        listing.game?.min_age && selectedMinAges.has(listing.game.min_age)
      );
    }

    // Playing time filter
    if (selectedPlayingTimes.size > 0) {
      filtered = filtered.filter((listing) => {
        if (!listing.game?.playing_time) return false;
        return Array.from(selectedPlayingTimes).some(time =>
          playingTimeMatches(listing.game.playing_time || null, time)
        );
      });
    }

    // Price filter
    if (priceMin) {
      filtered = filtered.filter((listing) => listing.price >= parseFloat(priceMin));
    }
    if (priceMax) {
      filtered = filtered.filter((listing) => listing.price <= parseFloat(priceMax));
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'recent':
      default:
        // Already in recent order from API
        break;
    }

    return filtered;
  }, [listings, searchQuery, selectedConditions, selectedLanguages, selectedPlayerCounts, selectedMinAges, selectedPlayingTimes, priceMin, priceMax, sortBy]);

  // Get condition icon and label
  const getConditionInfo = (condition: string) => {
    const conditionMap: Record<string, { icon: any; label: string }> = {
      likeNew: { icon: Star, label: 'Like New' },
      veryGood: { icon: Sparkles, label: 'Very Good' },
      good: { icon: CircleCheck, label: 'Good' },
      acceptable: { icon: Wrench, label: 'Acceptable' },
    };
    return conditionMap[condition] || { icon: CircleCheck, label: condition };
  };

  // Get playing time label
  const getPlayingTimeLabel = (time: string) => {
    const labels: Record<string, string> = {
      '0-30': '< 30 min',
      '30-60': '30-60 min',
      '60-120': '1-2 hours',
      '120+': '2+ hours',
    };
    return labels[time] || time;
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
           <p className="text-base sm:text-lg text-text-secondary mb-6 sm:mb-8 max-w-2xl">
            Browse quality pre-loved board games from trusted sellers across the Baltics.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
              {/* Clear Button */}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-polar-night/5 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Filter Bar */}
        <div className="mb-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between">
            {/* Left: Filters Toggle + Listing Count */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mobile: Open drawer */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden"
                leftIcon={
                  <ChevronDown className="w-4 h-4" />
                }
              >
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="trust" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              {/* Desktop: Toggle collapsible panel */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="hidden lg:flex"
                leftIcon={
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                  />
                }
              >
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="trust" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              {/* Saved Searches Dropdown */}
              <div className="relative" data-saved-searches-menu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavedSearchesMenu(!showSavedSearchesMenu)}
                  leftIcon={<Bookmark className="w-4 h-4" />}
                >
                  Saved
                  {savedSearches.length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {savedSearches.length}
                    </Badge>
                  )}
                </Button>

                {/* Saved Searches Menu */}
                {showSavedSearchesMenu && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-snow-white border-2 border-border rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-border-subtle">
                      <h3 className="font-semibold text-sm text-polar-night">Saved Searches</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {savedSearches.length === 0 ? (
                        <div className="p-6 text-center text-text-muted text-sm">
                          <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No saved searches yet
                        </div>
                      ) : (
                        <div className="py-1">
                          {savedSearches.map((search) => (
                            <button
                              key={search.id}
                              onClick={() => handleLoadSavedSearch(search)}
                              className="w-full px-4 py-3 hover:bg-bg-elevated text-left flex items-center justify-between group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-polar-night truncate">
                                  {search.name}
                                </div>
                                <div className="text-xs text-text-secondary">
                                  {countActiveFilters(search.filters)} filters
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteSavedSearch(search.id, e)}
                                className="ml-2 p-1 hover:bg-aurora-red/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete search"
                              >
                                <Trash2 className="w-4 h-4 text-aurora-red" />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Search Button - only show when filters active */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSaveDialog(true);
                    setSaveSearchName('');
                    setSaveSearchError('');
                  }}
                  disabled={savedSearches.length >= getMaxSavedSearches()}
                  title={savedSearches.length >= getMaxSavedSearches() ? `Maximum ${getMaxSavedSearches()} saved searches` : 'Save current filters'}
                >
                  Save Search
                </Button>
              )}

              <div className="text-sm text-text-secondary">
                <span className="font-medium text-polar-night">{filteredListings.length}</span> listings
              </div>
            </div>

            {/* Right: Sort */}
            <div className="w-full sm:w-auto">
              <Select
                options={[
                  { value: 'recent', label: 'Recently listed' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' },
                ]}
                value={sortBy}
                onChange={setSortBy}
                selectSize="sm"
              />
            </div>
          </div>

          {/* Collapsible Filter Panel - Desktop Only */}
          {filtersOpen && (
            <div className="hidden lg:block border-2 border-border rounded-lg p-4 sm:p-6 bg-bg-elevated animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Player Count Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">Players</h3>
                    </div>
                    {selectedPlayerCounts.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlayerCounts(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableOptions.playerCounts.map((count) => (
                      <Badge
                        key={count}
                        variant={selectedPlayerCounts.has(count) ? 'trust' : 'default'}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => togglePlayerCount(count)}
                      >
                        {count === 1 ? 'Solo' : count >= 8 ? '8+' : count}
                      </Badge>
                    ))}
                    {availableOptions.playerCounts.length === 0 && (
                      <p className="text-sm text-text-muted italic">No data available</p>
                    )}
                  </div>
                </div>

                {/* Min Age Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">Min Age</h3>
                    </div>
                    {selectedMinAges.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMinAges(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableOptions.minAges.map((age) => (
                      <Badge
                        key={age}
                        variant={selectedMinAges.has(age) ? 'trust' : 'default'}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleMinAge(age)}
                      >
                        {age}+
                      </Badge>
                    ))}
                    {availableOptions.minAges.length === 0 && (
                      <p className="text-sm text-text-muted italic">No data available</p>
                    )}
                  </div>
                </div>

                {/* Playing Time Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">Play Time</h3>
                    </div>
                    {selectedPlayingTimes.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlayingTimes(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableOptions.playingTimeRanges.map((time) => (
                      <Badge
                        key={time}
                        variant={selectedPlayingTimes.has(time) ? 'trust' : 'default'}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => togglePlayingTime(time)}
                      >
                        {getPlayingTimeLabel(time)}
                      </Badge>
                    ))}
                    {availableOptions.playingTimeRanges.length === 0 && (
                      <p className="text-sm text-text-muted italic">No data available</p>
                    )}
                  </div>
                </div>

                {/* Language Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">Language</h3>
                    {selectedLanguages.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLanguages(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableOptions.languages.map((lang) => (
                      <label
                        key={lang}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <Checkbox
                          checked={selectedLanguages.has(lang)}
                          onChange={() => toggleLanguage(lang)}
                        />
                        <span className="text-sm group-hover:text-polar-night transition-colors">
                          {lang}
                        </span>
                      </label>
                    ))}
                    {availableOptions.languages.length === 0 && (
                      <p className="text-sm text-text-muted italic">No languages available</p>
                    )}
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">Condition</h3>
                    {selectedConditions.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConditions(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {availableOptions.conditions.map((condition) => {
                      const { icon: Icon, label } = getConditionInfo(condition);
                      return (
                        <label
                          key={condition}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <Checkbox
                            checked={selectedConditions.has(condition)}
                            onChange={() => toggleCondition(condition)}
                          />
                          <Icon className="w-4 h-4 text-text-muted" />
                          <span className="text-sm group-hover:text-polar-night transition-colors">
                            {label}
                          </span>
                        </label>
                      );
                    })}
                    {availableOptions.conditions.length === 0 && (
                      <p className="text-sm text-text-muted italic">No conditions available</p>
                    )}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">Price (EUR)</h3>
                    {(priceMin || priceMax) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePriceFilter}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`${availableOptions.priceRange.min}`}
                      type="number"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      inputSize="sm"
                    />
                    <Input
                      placeholder={`${availableOptions.priceRange.max}`}
                      type="number"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      inputSize="sm"
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    €{availableOptions.priceRange.min} - €{availableOptions.priceRange.max}
                  </p>
                </div>
              </div>

              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Filter Drawer - Bottom Slide-up */}
          {mobileFiltersOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setMobileFiltersOpen(false)}
              />

              {/* Drawer */}
              <div className="fixed inset-x-0 bottom-0 bg-snow-white rounded-t-2xl shadow-2xl z-50 max-h-[85vh] flex flex-col lg:hidden animate-in slide-in-from-bottom-full duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-polar-night">Filters</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-muted" />
                  </button>
                </div>

                {/* Filter Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Player Count Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">Players</h3>
                      </div>
                      {selectedPlayerCounts.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayerCounts(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableOptions.playerCounts.map((count) => (
                        <Badge
                          key={count}
                          variant={selectedPlayerCounts.has(count) ? 'trust' : 'default'}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => togglePlayerCount(count)}
                        >
                          {count === 1 ? 'Solo' : count >= 8 ? '8+' : count}
                        </Badge>
                      ))}
                      {availableOptions.playerCounts.length === 0 && (
                        <p className="text-sm text-text-muted italic">No data available</p>
                      )}
                    </div>
                  </div>

                  {/* Min Age Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Baby className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">Min Age</h3>
                      </div>
                      {selectedMinAges.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMinAges(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableOptions.minAges.map((age) => (
                        <Badge
                          key={age}
                          variant={selectedMinAges.has(age) ? 'trust' : 'default'}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => toggleMinAge(age)}
                        >
                          {age}+
                        </Badge>
                      ))}
                      {availableOptions.minAges.length === 0 && (
                        <p className="text-sm text-text-muted italic">No data available</p>
                      )}
                    </div>
                  </div>

                  {/* Playing Time Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">Play Time</h3>
                      </div>
                      {selectedPlayingTimes.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayingTimes(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableOptions.playingTimeRanges.map((time) => (
                        <Badge
                          key={time}
                          variant={selectedPlayingTimes.has(time) ? 'trust' : 'default'}
                          className="cursor-pointer transition-all hover:scale-105"
                          onClick={() => togglePlayingTime(time)}
                        >
                          {getPlayingTimeLabel(time)}
                        </Badge>
                      ))}
                      {availableOptions.playingTimeRanges.length === 0 && (
                        <p className="text-sm text-text-muted italic">No data available</p>
                      )}
                    </div>
                  </div>

                  {/* Language Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-polar-night">Language</h3>
                      {selectedLanguages.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLanguages(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableOptions.languages.map((lang) => (
                        <label
                          key={lang}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <Checkbox
                            checked={selectedLanguages.has(lang)}
                            onChange={() => toggleLanguage(lang)}
                          />
                          <span className="text-sm group-hover:text-polar-night transition-colors">
                            {lang}
                          </span>
                        </label>
                      ))}
                      {availableOptions.languages.length === 0 && (
                        <p className="text-sm text-text-muted italic">No languages available</p>
                      )}
                    </div>
                  </div>

                  {/* Condition Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-polar-night">Condition</h3>
                      {selectedConditions.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConditions(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {availableOptions.conditions.map((condition) => {
                        const { icon: Icon, label } = getConditionInfo(condition);
                        return (
                          <label
                            key={condition}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <Checkbox
                              checked={selectedConditions.has(condition)}
                              onChange={() => toggleCondition(condition)}
                            />
                            <Icon className="w-4 h-4 text-text-muted" />
                            <span className="text-sm group-hover:text-polar-night transition-colors">
                              {label}
                            </span>
                          </label>
                        );
                      })}
                      {availableOptions.conditions.length === 0 && (
                        <p className="text-sm text-text-muted italic">No conditions available</p>
                      )}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-polar-night">Price (EUR)</h3>
                      {(priceMin || priceMax) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removePriceFilter}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={`${availableOptions.priceRange.min}`}
                        type="number"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        inputSize="sm"
                      />
                      <Input
                        placeholder={`${availableOptions.priceRange.max}`}
                        type="number"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        inputSize="sm"
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      €{availableOptions.priceRange.min} - €{availableOptions.priceRange.max}
                    </p>
                  </div>
                </div>

                {/* Footer - Action Buttons */}
                <div className="border-t border-border-subtle p-4 bg-bg-elevated">
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="flex-1"
                      disabled={activeFiltersCount === 0}
                    >
                      Clear All
                    </Button>
                    <Button
                      variant="accent"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="flex-1"
                    >
                      Apply Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="default" className="ml-2 bg-snow-white text-frost-ice">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary">Active filters:</span>

              {/* Player count chips */}
              {Array.from(selectedPlayerCounts).map((count) => (
                <Badge
                  key={count}
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={() => removePlayerCountFilter(count)}
                >
                  <Users className="w-3 h-3" />
                  <span>{count === 1 ? 'Solo' : count >= 8 ? '8+' : count}</span>
                  <X className="w-3 h-3" />
                </Badge>
              ))}

              {/* Min age chips */}
              {Array.from(selectedMinAges).map((age) => (
                <Badge
                  key={age}
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={() => removeMinAgeFilter(age)}
                >
                  <Baby className="w-3 h-3" />
                  <span>{age}+</span>
                  <X className="w-3 h-3" />
                </Badge>
              ))}

              {/* Playing time chips */}
              {Array.from(selectedPlayingTimes).map((time) => (
                <Badge
                  key={time}
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={() => removePlayingTimeFilter(time)}
                >
                  <Clock className="w-3 h-3" />
                  <span>{getPlayingTimeLabel(time)}</span>
                  <X className="w-3 h-3" />
                </Badge>
              ))}

              {/* Language chips */}
              {Array.from(selectedLanguages).map((lang) => (
                <Badge
                  key={lang}
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={() => removeLanguageFilter(lang)}
                >
                  <span>{lang}</span>
                  <X className="w-3 h-3" />
                </Badge>
              ))}

              {/* Condition chips */}
              {Array.from(selectedConditions).map((condition) => {
                const { icon: Icon, label } = getConditionInfo(condition);
                return (
                  <Badge
                    key={condition}
                    variant="default"
                    className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                    onClick={() => removeConditionFilter(condition)}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                    <X className="w-3 h-3" />
                  </Badge>
                );
              })}

              {/* Price chip */}
              {(priceMin || priceMax) && (
                <Badge
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={removePriceFilter}
                >
                  <span>
                    €{priceMin || availableOptions.priceRange.min} - €{priceMax || availableOptions.priceRange.max}
                  </span>
                  <X className="w-3 h-3" />
                </Badge>
              )}

              {/* Clear all link */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto py-0 px-2"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Loading State - Skeleton Cards */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ListingCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Failed to load listings
            </h3>
            <p className="text-text-secondary mb-6">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Listings Grid - Full Width, Responsive */}
        {!loading && !error && filteredListings.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showSeller={true} />
              ))}
            </div>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-text-secondary">Loading more listings...</p>
              </div>
            )}

            {/* No More Results */}
            {!hasMore && !loadingMore && filteredListings.length > 0 && (
              <div className="text-center py-8 border-t border-border-subtle">
                <p className="text-sm text-text-secondary">
                  You've reached the end! Showing all {totalCount} listings.
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && filteredListings.length === 0 && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <Package className="w-16 h-16 text-text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              No listings found
            </h3>
            <p className="text-text-secondary mb-6">
              {activeFiltersCount > 0
                ? 'Try adjusting your filters or search query'
                : 'Be the first to list a game!'}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="primary" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-polar-night/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-snow-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-polar-night mb-4">Save Search</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Search Name
                </label>
                <Input
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder="e.g., Family Games under €30"
                  maxLength={50}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSearch();
                    } else if (e.key === 'Escape') {
                      setShowSaveDialog(false);
                    }
                  }}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-secondary">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} will be saved
                  </p>
                  <p className="text-xs text-text-muted">
                    {saveSearchName.length}/50
                  </p>
                </div>
                {saveSearchError && (
                  <p className="text-sm text-aurora-red mt-2">{saveSearchError}</p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSearch}
                >
                  Save Search
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
