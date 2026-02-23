/* eslint-disable @next/next/no-img-element -- game thumbnails are external BGG URLs */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { Select, Button } from '@second-turn/design-system';
import { Package, SettingsAdjustHorizontal as SlidersHorizontal, Search, Plus, SearchPlus } from '@/lib/icons';
import { EmptyStateIcon } from '@/components/common/EmptyStateIcon';
import { AggregatedGameCard, SellFilters, WantedFilters, MobileFilterDrawer, ActiveFilterChips } from '@/components/browse';
import { AggregatedWantedGameCard } from '@/components/browse/AggregatedWantedGameCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import type { AggregatedGame } from '@/lib/types/aggregated-game';
import type { WantedListingWithDetails, AggregatedWantedGame } from '@/lib/types/wanted-listing';
import { useAuth } from '@/lib/auth/AuthContext';
import { CountryPrompt } from '@/components/onboarding';
import { cn } from '@/lib/utils';
import { isOfflineError } from '@/lib/utils/offline';
import { OfflineError } from '@/components/common/OfflineError';
import { useTranslations } from 'next-intl';
import { useBrowseFilters } from '@/lib/hooks/useBrowseFilters';

export default function BrowsePage() {
  const { user, profile } = useAuth();
  const t = useTranslations('Browse');

  // Use the browse filters hook for all filter state and actions
  const filters = useBrowseFilters();

  // Data state
  const [games, setGames] = useState<AggregatedGame[]>([]);
  const [wantedListings, setWantedListings] = useState<WantedListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Destructure commonly used filter values for easier access
  const {
    listingType,
    setListingType,
    searchQuery,
    sortBy,
    setSortBy,
    selectedConditions,
    selectedLanguages,
    setSelectedLanguages,
    selectedPlayerCounts,
    setSelectedPlayerCounts,
    selectedMinAges,
    setSelectedMinAges,
    selectedPlayingTimes,
    setSelectedPlayingTimes,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    acceptableConditions,
    setAcceptableConditions,
    budgetMin,
    setBudgetMin,
    budgetMax,
    setBudgetMax,
    locationFilter,
    setLocationFilter,
    showExpiringOnly,
    setShowExpiringOnly,
    showEndedAuctions,
    setShowEndedAuctions,
    filtersOpen,
    setFiltersOpen,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    filtersInitialized,
    togglePlayerCount,
    toggleMinAge,
    togglePlayingTime,
    toggleLanguage,
    removePlayerCountFilter,
    removeMinAgeFilter,
    removePlayingTimeFilter,
    removeLanguageFilter,
    removeConditionFilter,
    removePriceFilter,
    clearFilters,
    activeFiltersCount,
  } = filters;

  // Handle listing type change with sort reset
  const handleListingTypeChange = useCallback((type: 'sell' | 'auctions' | 'wanted') => {
    setListingType(type);
    const defaultSort = type === 'auctions' ? 'ending-soon' : 'recent';
    setSortBy(defaultSort);
  }, [setListingType, setSortBy]);

  // Fetch aggregated games with pagination
  const fetchGames = async (page: number, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Build query params for server-side filtering
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');

      if (searchQuery) params.set('search', searchQuery);
      if (priceMin) params.set('minPrice', priceMin);
      if (priceMax) params.set('maxPrice', priceMax);

      // Filter by pricing format based on active tab
      if (listingType === 'sell') {
        params.set('pricingFormat', 'fixed_price');
      } else if (listingType === 'auctions') {
        params.set('pricingFormat', 'auction');
        if (showEndedAuctions) params.set('includeEnded', 'true');
      }

      // Map sortBy to API sort param
      const sortMap: Record<string, string> = {
        'recent': 'newest',
        'price-low': 'price_asc',
        'price-high': 'price_desc',
        'ending-soon': 'ending_soon',
      };
      params.set('sort', sortMap[sortBy] || 'newest');

      // Add language filters
      selectedLanguages.forEach(lang => params.append('language', lang));

      const response = await fetch(`/api/games?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }

      const data = await response.json();
      const newGames = data.games || [];

      if (append && page > 1) {
        // Append to existing games for infinite scroll
        setGames((prev) => [...prev, ...newGames]);
      } else {
        // Replace games for first page or filter changes
        setGames(newGames);
      }

      setCurrentPage(page);
      setHasMore(data.pagination?.hasMore || false);
      setTotalCount(data.pagination?.total || 0);
      setError('');
      setIsOffline(false);
    } catch (err: unknown) {
      console.error('Error fetching games:', err);
      if (isOfflineError(err)) {
        setIsOffline(true);
        setError('');
      } else {
        setIsOffline(false);
        setError(err instanceof Error ? err.message : 'Failed to load games');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch wanted listings
  const fetchWantedListings = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/wanted?status=active');

      if (!response.ok) {
        throw new Error('Failed to fetch wanted listings');
      }

      const data = await response.json();
      setWantedListings(data.wantedListings || []);
      setError('');
      setIsOffline(false);
    } catch (err: unknown) {
      console.error('Error fetching wanted listings:', err);
      if (isOfflineError(err)) {
        setIsOffline(true);
        setError('');
      } else {
        setIsOffline(false);
        setError(err instanceof Error ? err.message : 'Failed to load wanted listings');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    if (listingType === 'sell' || listingType === 'auctions') {
      fetchGames(1, false);
    } else {
      fetchWantedListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (filtersInitialized && (listingType === 'sell' || listingType === 'auctions')) {
      fetchGames(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedLanguages, priceMin, priceMax, sortBy, showEndedAuctions, filtersInitialized, listingType]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!filtersInitialized || (listingType !== 'sell' && listingType !== 'auctions')) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loadingMore && !loading && hasMore) {
          fetchGames(currentPage + 1, true);
        }
      },
      {
        root: null,
        rootMargin: '300px', // Trigger 300px before reaching the element
        threshold: 0,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, hasMore, currentPage, filtersInitialized, listingType]);

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

  // Calculate available filter options from games
  const availableOptions = useMemo(() => {
    const languages = new Set<string>();
    const playerCounts = new Set<number>();
    const minAges = new Set<number>();
    const playingTimeRanges = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    games.forEach((game) => {
      // Extract languages from aggregated game
      game.languages.forEach(lang => languages.add(lang));

      // Extract player counts from ranges
      if (game.player_count) {
        const playerCount = game.player_count;
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
      if (game.min_age) {
        minAges.add(game.min_age);
      }

      // Categorize playing times
      if (game.playing_time) {
        const time = parseInt(game.playing_time);
        if (!isNaN(time)) {
          if (time <= 30) playingTimeRanges.add('0-30');
          else if (time <= 60) playingTimeRanges.add('30-60');
          else if (time <= 120) playingTimeRanges.add('60-120');
          else playingTimeRanges.add('120+');
        }
      }

      // Calculate price range (use lowest_price from each game)
      if (game.lowest_price < minPrice) minPrice = game.lowest_price;
      if (game.highest_price > maxPrice) maxPrice = game.highest_price;
    });

    // Sort languages: English first, then Baltic (Estonian, Latvian, Lithuanian), then rest alphabetically
    const sortedLanguages = Array.from(languages).sort((a, b) => {
      const priority: Record<string, number> = {
        'English': 0,
        'Estonian': 1,
        'Latvian': 2,
        'Lithuanian': 3,
      };
      const aPriority = priority[a] ?? 100;
      const bPriority = priority[b] ?? 100;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.localeCompare(b);
    });

    return {
      languages: sortedLanguages,
      playerCounts: Array.from(playerCounts).sort((a, b) => a - b),
      minAges: Array.from(minAges).sort((a, b) => a - b),
      playingTimeRanges: Array.from(playingTimeRanges).sort(),
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === -Infinity ? 100 : Math.ceil(maxPrice),
      },
    };
  }, [games]);

  // Filter games (client-side filtering for game-level attributes)
  // Note: Most filtering is now done server-side via API
  const filteredGames = useMemo(() => {
    let filtered = [...games];

    // Player count filter (handle ranges) - client-side
    if (selectedPlayerCounts.size > 0) {
      filtered = filtered.filter((game) => {
        if (!game.player_count) return false;
        return Array.from(selectedPlayerCounts).some(count =>
          playerCountMatches(game.player_count, count)
        );
      });
    }

    // Min age filter - client-side
    if (selectedMinAges.size > 0) {
      filtered = filtered.filter((game) =>
        game.min_age && selectedMinAges.has(game.min_age)
      );
    }

    // Playing time filter - client-side
    if (selectedPlayingTimes.size > 0) {
      filtered = filtered.filter((game) => {
        if (!game.playing_time) return false;
        return Array.from(selectedPlayingTimes).some(time =>
          playingTimeMatches(game.playing_time, time)
        );
      });
    }

    return filtered;
  }, [games, selectedPlayerCounts, selectedMinAges, selectedPlayingTimes]);

  // Filter wanted listings
  const filteredWantedListings = useMemo(() => {
    let filtered = [...wantedListings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((listing) =>
        listing.game_name.toLowerCase().includes(query)
      );
    }

    // Acceptable conditions filter
    if (acceptableConditions.size > 0) {
      filtered = filtered.filter((listing) =>
        listing.acceptable_conditions?.some(cond => acceptableConditions.has(cond))
      );
    }

    // Budget filter
    if (budgetMin) {
      filtered = filtered.filter((listing) =>
        (listing.max_price || 0) >= parseFloat(budgetMin)
      );
    }
    if (budgetMax) {
      filtered = filtered.filter((listing) =>
        (listing.max_price || 0) <= parseFloat(budgetMax)
      );
    }

    // Location filter
    if (locationFilter) {
      const query = locationFilter.toLowerCase();
      filtered = filtered.filter((listing) =>
        listing.location_preferences?.toLowerCase().includes(query)
      );
    }

    // Sorting
    switch (sortBy) {
      case 'budget-high':
        filtered.sort((a, b) => (b.max_price || 0) - (a.max_price || 0));
        break;
      case 'budget-low':
        filtered.sort((a, b) => (a.max_price || 0) - (b.max_price || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.response_count || 0) - (a.response_count || 0));
        break;
      case 'recent':
      default:
        // Already in recent order from API
        break;
    }

    return filtered;
  }, [wantedListings, searchQuery, acceptableConditions, budgetMin, budgetMax, locationFilter, sortBy]);

  // Aggregate wanted listings by game for browse view
  const aggregatedWantedGames = useMemo((): AggregatedWantedGame[] => {
    const gameMap = new Map<number, WantedListingWithDetails[]>();
    for (const wl of filteredWantedListings) {
      if (!gameMap.has(wl.bgg_game_id)) gameMap.set(wl.bgg_game_id, []);
      gameMap.get(wl.bgg_game_id)!.push(wl);
    }

    const games = Array.from(gameMap.entries()).map(([id, listings]) => ({
      bgg_game_id: id,
      game_name: listings[0].game_name,
      game_year: listings[0].game_year,
      image: listings[0].game?.image || null,
      thumbnail: listings[0].game?.thumbnail || null,
      player_count: listings[0].game?.player_count || null,
      min_age: listings[0].game?.min_age || null,
      playing_time: listings[0].game?.playing_time || null,
      is_expansion: listings[0].game?.is_expansion || null,
      wanted_count: listings.length,
      budget_max: Math.max(...listings.map(l => l.max_price)),
      newest_date: listings[0].created_at,
    }));

    // Sort aggregated games
    switch (sortBy) {
      case 'budget-high': games.sort((a, b) => b.budget_max - a.budget_max); break;
      case 'budget-low': games.sort((a, b) => a.budget_max - b.budget_max); break;
      case 'popular': games.sort((a, b) => b.wanted_count - a.wanted_count); break;
      default: break; // 'recent' — already ordered from API
    }
    return games;
  }, [filteredWantedListings, sortBy]);

  // Memoized array of game IDs for navigation context
  const gameIds = useMemo(() => {
    return filteredGames.map(g => g.bgg_game_id);
  }, [filteredGames]);

  return (
    <div>
      {/* Compact Unified Toolbar */}
      <div className={cn(
        "border-b transition-colors sticky top-16 z-40 backdrop-blur-sm bg-snow-white/95",
        listingType === 'sell' ? "border-frost-ice/20" : listingType === 'auctions' ? "border-aurora-purple/20" : "border-aurora-orange/20"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Desktop: Single row */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            {/* Left side: Tabs + Count */}
            <div className="flex items-center gap-4">
              {/* Compact Tab Toggle */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-snow-white/80 shadow-sm">
                <button
                  onClick={() => handleListingTypeChange('sell')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    listingType === 'sell'
                      ? "bg-frost-ice text-snow-white shadow-sm"
                      : "text-text-secondary hover:text-text"
                  )}
                  aria-pressed={listingType === 'sell'}
                  aria-label={t('tabs.forSaleAria')}
                >
                  {t('tabs.forSale')}
                </button>
                <button
                  onClick={() => handleListingTypeChange('auctions')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    listingType === 'auctions'
                      ? "bg-aurora-purple text-snow-white shadow-sm"
                      : "text-text-secondary hover:text-text"
                  )}
                  aria-pressed={listingType === 'auctions'}
                  aria-label={t('tabs.auctionsAria')}
                >
                  {t('tabs.auctions')}
                </button>
                <button
                  onClick={() => handleListingTypeChange('wanted')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                    listingType === 'wanted'
                      ? "bg-aurora-orange text-snow-white shadow-sm"
                      : "text-text-secondary hover:text-text"
                  )}
                  aria-pressed={listingType === 'wanted'}
                  aria-label={t('tabs.wantedAria')}
                >
                  {t('tabs.wanted')}
                </button>
              </div>
            </div>

            {/* Right side: Sort, Filters, Saved */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <Select
                options={
                  listingType === 'sell'
                    ? [
                        { value: 'recent', label: t('sort.recentlyListed') },
                        { value: 'price-low', label: t('sort.priceLowHigh') },
                        { value: 'price-high', label: t('sort.priceHighLow') },
                      ]
                    : listingType === 'auctions'
                      ? [
                          { value: 'ending-soon', label: t('sort.endingSoon') },
                          { value: 'recent', label: t('sort.recentlyListed') },
                          { value: 'price-low', label: t('sort.priceLowHigh') },
                          { value: 'price-high', label: t('sort.priceHighLow') },
                        ]
                      : [
                          { value: 'recent', label: t('sort.recentlyPosted') },
                          { value: 'budget-high', label: t('sort.budgetHighLow') },
                          { value: 'budget-low', label: t('sort.budgetLowHigh') },
                          { value: 'popular', label: t('sort.mostResponses') },
                        ]
                }
                value={sortBy}
                onChange={setSortBy}
                selectSize="sm"
              />

              {/* Filters Button */}
              <Button
                variant={filtersOpen ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                {t('filters.title')}
              </Button>
            </div>
          </div>

          {/* Mobile: Two rows */}
          <div className="sm:hidden space-y-3">
            {/* Row 1: Full-width tabs */}
            <div className="flex rounded-lg border border-border p-0.5 bg-snow-white/80">
              <button
                onClick={() => handleListingTypeChange('sell')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                  listingType === 'sell'
                    ? "bg-frost-ice text-snow-white"
                    : "text-text-secondary"
                )}
                aria-pressed={listingType === 'sell'}
                aria-label={t('tabs.forSaleAria')}
              >
                {t('tabs.forSale')}
              </button>
              <button
                onClick={() => handleListingTypeChange('auctions')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                  listingType === 'auctions'
                    ? "bg-aurora-purple text-snow-white"
                    : "text-text-secondary"
                )}
                aria-pressed={listingType === 'auctions'}
                aria-label={t('tabs.auctionsAria')}
              >
                {t('tabs.auctions')}
              </button>
              <button
                onClick={() => handleListingTypeChange('wanted')}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                  listingType === 'wanted'
                    ? "bg-aurora-orange text-snow-white"
                    : "text-text-secondary"
                )}
                aria-pressed={listingType === 'wanted'}
                aria-label={t('tabs.wantedAria')}
              >
                {t('tabs.wanted')}
              </button>
            </div>

            {/* Row 2: Controls - Sort first, then Filters */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="flex-1">
                <Select
                  options={
                    listingType === 'sell'
                      ? [
                          { value: 'recent', label: t('sort.recentlyListed') },
                          { value: 'price-low', label: t('sort.priceLowHigh') },
                          { value: 'price-high', label: t('sort.priceHighLow') },
                        ]
                      : listingType === 'auctions'
                        ? [
                            { value: 'ending-soon', label: t('sort.endingSoon') },
                            { value: 'recent', label: t('sort.recentlyListed') },
                            { value: 'price-low', label: t('sort.priceLowHigh') },
                            { value: 'price-high', label: t('sort.priceHighLow') },
                          ]
                        : [
                            { value: 'recent', label: t('sort.recentlyPosted') },
                            { value: 'expiring', label: t('sort.expiringSoon') },
                            { value: 'budget-high', label: t('sort.budgetHighLow') },
                            { value: 'budget-low', label: t('sort.budgetLowHigh') },
                            { value: 'popular', label: t('sort.mostResponses') },
                          ]
                  }
                  value={sortBy}
                  onChange={setSortBy}
                  selectSize="sm"
                />
              </div>

              {/* Mobile Filters Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="flex-shrink-0"
                aria-label={t('filters.openFiltersAria')}
              >
                <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                {t('filters.title')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Country Prompt - shown if logged in but no country set */}
        {user && !profile?.country && <CountryPrompt />}

        {/* Filter Panels Container */}
        <div className="mb-6 space-y-4">
          {/* Collapsible Filter Panel - Desktop Only */}
          {filtersOpen && (
            <div className="hidden lg:block border border-border rounded-lg p-4 sm:p-6 bg-bg-elevated animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listingType === 'sell' || listingType === 'auctions' ? (
                  <>
                    <SellFilters
                      selectedPlayerCounts={selectedPlayerCounts}
                      availablePlayerCounts={availableOptions.playerCounts}
                      onTogglePlayerCount={togglePlayerCount}
                      onClearPlayerCounts={() => setSelectedPlayerCounts(new Set())}
                      selectedMinAges={selectedMinAges}
                      availableMinAges={availableOptions.minAges}
                      onToggleMinAge={toggleMinAge}
                      onClearMinAges={() => setSelectedMinAges(new Set())}
                      selectedPlayingTimes={selectedPlayingTimes}
                      availablePlayingTimes={availableOptions.playingTimeRanges}
                      onTogglePlayingTime={togglePlayingTime}
                      onClearPlayingTimes={() => setSelectedPlayingTimes(new Set())}
                      selectedLanguages={selectedLanguages}
                      availableLanguages={availableOptions.languages}
                      onToggleLanguage={toggleLanguage}
                      onClearLanguages={() => setSelectedLanguages(new Set())}
                      priceMin={priceMin}
                      priceMax={priceMax}
                      onPriceMinChange={setPriceMin}
                      onPriceMaxChange={setPriceMax}
                      onClearPrice={removePriceFilter}
                      priceRange={availableOptions.priceRange}
                    />
                    {listingType === 'auctions' && (
                      <div className="col-span-full">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-polar-night transition-colors">
                          <input
                            type="checkbox"
                            checked={showEndedAuctions}
                            onChange={(e) => setShowEndedAuctions(e.target.checked)}
                            className="rounded border-border text-aurora-purple focus:ring-aurora-purple"
                          />
                          {t('filters.includeEnded')}
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <WantedFilters
                    acceptableConditions={acceptableConditions}
                    onToggleCondition={(condition) => {
                      const newSet = new Set(acceptableConditions);
                      if (newSet.has(condition)) {
                        newSet.delete(condition);
                      } else {
                        newSet.add(condition);
                      }
                      setAcceptableConditions(newSet);
                    }}
                    onClearConditions={() => setAcceptableConditions(new Set())}
                    budgetMin={budgetMin}
                    budgetMax={budgetMax}
                    onBudgetMinChange={setBudgetMin}
                    onBudgetMaxChange={setBudgetMax}
                    onClearBudget={() => {
                      setBudgetMin('');
                      setBudgetMax('');
                    }}
                    locationFilter={locationFilter}
                    onLocationChange={setLocationFilter}
                    onClearLocation={() => setLocationFilter('')}
                    showExpiringOnly={showExpiringOnly}
                    onToggleExpiring={() => setShowExpiringOnly(!showExpiringOnly)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Mobile Filter Drawer - Bottom Slide-up */}
          <MobileFilterDrawer
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            onClearAll={clearFilters}
            activeFiltersCount={activeFiltersCount}
          >
            {listingType === 'wanted' ? (
              <WantedFilters
                acceptableConditions={acceptableConditions}
                onToggleCondition={(condition) => {
                  const newSet = new Set(acceptableConditions);
                  if (newSet.has(condition)) {
                    newSet.delete(condition);
                  } else {
                    newSet.add(condition);
                  }
                  setAcceptableConditions(newSet);
                }}
                onClearConditions={() => setAcceptableConditions(new Set())}
                budgetMin={budgetMin}
                budgetMax={budgetMax}
                onBudgetMinChange={setBudgetMin}
                onBudgetMaxChange={setBudgetMax}
                onClearBudget={() => {
                  setBudgetMin('');
                  setBudgetMax('');
                }}
                locationFilter={locationFilter}
                onLocationChange={setLocationFilter}
                onClearLocation={() => setLocationFilter('')}
                showExpiringOnly={showExpiringOnly}
                onToggleExpiring={() => setShowExpiringOnly(!showExpiringOnly)}
              />
            ) : (
              <>
                <SellFilters
                  selectedPlayerCounts={selectedPlayerCounts}
                  availablePlayerCounts={availableOptions.playerCounts}
                  onTogglePlayerCount={togglePlayerCount}
                  onClearPlayerCounts={() => setSelectedPlayerCounts(new Set())}
                  selectedMinAges={selectedMinAges}
                  availableMinAges={availableOptions.minAges}
                  onToggleMinAge={toggleMinAge}
                  onClearMinAges={() => setSelectedMinAges(new Set())}
                  selectedPlayingTimes={selectedPlayingTimes}
                  availablePlayingTimes={availableOptions.playingTimeRanges}
                  onTogglePlayingTime={togglePlayingTime}
                  onClearPlayingTimes={() => setSelectedPlayingTimes(new Set())}
                  selectedLanguages={selectedLanguages}
                  availableLanguages={availableOptions.languages}
                  onToggleLanguage={toggleLanguage}
                  onClearLanguages={() => setSelectedLanguages(new Set())}
                  priceMin={priceMin}
                  priceMax={priceMax}
                  onPriceMinChange={setPriceMin}
                  onPriceMaxChange={setPriceMax}
                  onClearPrice={removePriceFilter}
                  priceRange={availableOptions.priceRange}
                />
                {listingType === 'auctions' && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-polar-night transition-colors">
                      <input
                        type="checkbox"
                        checked={showEndedAuctions}
                        onChange={(e) => setShowEndedAuctions(e.target.checked)}
                        className="rounded border-border text-aurora-purple focus:ring-aurora-purple"
                      />
                      {t('filters.includeEnded')}
                    </label>
                  </div>
                )}
              </>
            )}
          </MobileFilterDrawer>

          {/* Active Filter Chips */}
          <ActiveFilterChips
            selectedPlayerCounts={selectedPlayerCounts}
            selectedMinAges={selectedMinAges}
            selectedPlayingTimes={selectedPlayingTimes}
            selectedLanguages={selectedLanguages}
            selectedConditions={selectedConditions}
            priceMin={priceMin}
            priceMax={priceMax}
            priceRange={availableOptions.priceRange}
            onRemovePlayerCount={removePlayerCountFilter}
            onRemoveMinAge={removeMinAgeFilter}
            onRemovePlayingTime={removePlayingTimeFilter}
            onRemoveLanguage={removeLanguageFilter}
            onRemoveCondition={removeConditionFilter}
            onRemovePrice={removePriceFilter}
            onClearAll={clearFilters}
          />
        </div>

        {/* Loading State - Skeleton Cards */}
        {loading && (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-pl-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:snap-none lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="flex-shrink-0 w-[calc(100vw-4rem)] snap-start sm:w-auto sm:flex-shrink">
                <ListingCardSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Offline State */}
        {isOffline && !loading && (
          <OfflineError
            onRetry={() => {
              if (listingType === 'sell' || listingType === 'auctions') {
                fetchGames(1, false);
              } else {
                fetchWantedListings();
              }
            }}
            message={t('messages.offlineError')}
          />
        )}

        {/* Error State */}
        {error && !loading && !isOffline && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              {t('messages.genericError')}
            </h3>
            <p className="text-text-secondary mb-6">{error}</p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              {t('messages.tryAgain')}
            </Button>
          </div>
        )}

        {/* Wanted CTA Banner */}
        {listingType === 'wanted' && !loading && !error && !isOffline && aggregatedWantedGames.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-aurora-orange/5 border border-aurora-orange/20 rounded-lg">
            <div className="w-8 h-8 bg-aurora-orange/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-aurora-orange" />
            </div>
            <p className="text-sm text-text-secondary flex-grow">
              {t('wantedCta.description')}
            </p>
            <Link href="/wanted/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                {t('wantedCta.button')}
              </Button>
            </Link>
          </div>
        )}

        {/* Games Grid - Full Width, Responsive */}
        {!loading && !error && !isOffline && (listingType === 'wanted' ? aggregatedWantedGames.length > 0 : filteredGames.length > 0) && (
          <>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-pl-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:snap-none lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
              {listingType === 'wanted'
                ? aggregatedWantedGames.map((game) => (
                    <div key={game.bgg_game_id} className="flex-shrink-0 w-[calc(100vw-4rem)] snap-start sm:w-auto sm:flex-shrink">
                      <AggregatedWantedGameCard game={game} />
                    </div>
                  ))
                : filteredGames.map((game, index) => (
                    <div key={game.bgg_game_id} className="flex-shrink-0 w-[calc(100vw-4rem)] snap-start sm:w-auto sm:flex-shrink">
                      <AggregatedGameCard
                        game={game}
                        allGameIds={gameIds}
                        index={index}
                      />
                    </div>
                  ))
              }

              {/* Infinite scroll sentinel - inside container for both layouts */}
              {/* Mobile: thin element at end of horizontal scroll. Desktop: full-width row at bottom of grid */}
              {(listingType === 'sell' || listingType === 'auctions') && hasMore && !loading && (
                <div ref={loadMoreRef} className="flex-shrink-0 w-1 sm:w-full sm:col-span-full sm:h-1" aria-hidden="true" />
              )}
            </div>

            {/* Loading More Indicator - For sell and auction listings */}
            {(listingType === 'sell' || listingType === 'auctions') && loadingMore && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-text-secondary">{t('messages.loadingMore')}</p>
              </div>
            )}

            {/* No More Results - For sell and auction listings */}
            {(listingType === 'sell' || listingType === 'auctions') && !hasMore && !loadingMore && filteredGames.length > 0 && (
              <div className="text-center py-8 border-t border-border-subtle space-y-4">
                <p className="text-sm text-text-secondary">
                  {t('messages.reachedEnd', { totalCount })}
                </p>
                {/* BGG Attribution */}
                <a
                  href="https://boardgamegeek.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img
                    src="/images/powered-by-bgg-rgb.svg"
                    alt="Powered by BoardGameGeek"
                    className="h-5 opacity-50 hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && !isOffline && (listingType === 'wanted' ? aggregatedWantedGames.length === 0 : filteredGames.length === 0) && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <EmptyStateIcon
                icon={listingType === 'wanted' ? SearchPlus : Package}
                color={listingType === 'wanted' ? 'aurora-orange' : 'frost-ice'}
              />
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              {listingType === 'auctions'
                ? t('emptyState.noAuctions')
                : listingType === 'sell'
                  ? t('emptyState.noGamesFound')
                  : t('emptyState.noWantedListings')
              }
            </h3>
            <p className="text-text-secondary mb-6">
              {activeFiltersCount > 0
                ? t('emptyState.tryAdjustingFilters')
                : listingType === 'auctions'
                  ? t('emptyState.beFirstToAuction')
                  : listingType === 'sell'
                    ? t('emptyState.beFirstToList')
                    : t('wantedCta.description')
              }
            </p>
            {activeFiltersCount > 0 ? (
              <Button variant="accent" onClick={clearFilters}>
                {t('emptyState.clearAllFilters')}
              </Button>
            ) : listingType === 'wanted' ? (
              <Link href="/wanted/new">
                <Button variant="primary">
                  {t('wantedCta.button')}
                </Button>
              </Link>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}
