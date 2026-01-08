'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Input, Select, Checkbox, Button, Badge } from '@second-turn/design-system';
import {  Package, Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench, X, Users, User as Baby, Time as Clock, LocationPin as MapPin, AlertCircle, SettingsAdjustHorizontal as SlidersHorizontal  } from 'griddy-icons';
import { AggregatedGameCard } from '@/components/browse/AggregatedGameCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { WantedListingCard } from '@/components/wanted/WantedListingCard';
import type { AggregatedGame } from '@/lib/types/aggregated-game';
import type { WantedListingWithDetails } from '@/lib/types/wanted-listing';
import { useAuth } from '@/lib/auth/AuthContext';
import { CountryPrompt } from '@/components/onboarding';
import { cn } from '@/lib/utils';
import { isOfflineError } from '@/lib/utils/offline';
import { OfflineError } from '@/components/common/OfflineError';
import { useTranslations } from 'next-intl';

type ListingType = 'sell' | 'wanted';

export default function BrowsePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const t = useTranslations('Browse');
  const tListings = useTranslations('Listings');

  // Listing type state
  const [listingType, setListingType] = useState<ListingType>('sell');

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

  // Wanted-specific filter states
  const [acceptableConditions, setAcceptableConditions] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  // Track if filters have been initialized from URL
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initialize filters from URL params on mount (avoiding useSearchParams for SSG compatibility)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get('type');
    const query = searchParams.get('q');
    const conditions = searchParams.get('conditions');
    const languages = searchParams.get('languages');
    const playerCounts = searchParams.get('players');
    const minAges = searchParams.get('ages');
    const playingTimes = searchParams.get('times');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort');

    // Wanted-specific params
    const acceptableConds = searchParams.get('acceptableConditions');
    const budMin = searchParams.get('budgetMin');
    const budMax = searchParams.get('budgetMax');
    const location = searchParams.get('location');
    const expiring = searchParams.get('expiring');

    // Set listing type
    if (type === 'wanted') setListingType('wanted');

    // General filters
    if (query) setSearchQuery(query);
    if (conditions) setSelectedConditions(new Set(conditions.split(',')));
    if (languages) setSelectedLanguages(new Set(languages.split(',')));
    if (playerCounts) setSelectedPlayerCounts(new Set(playerCounts.split(',').map(Number)));
    if (minAges) setSelectedMinAges(new Set(minAges.split(',').map(Number)));
    if (playingTimes) setSelectedPlayingTimes(new Set(playingTimes.split(',')));
    if (minPrice) setPriceMin(minPrice);
    if (maxPrice) setPriceMax(maxPrice);
    if (sort) setSortBy(sort);

    // Wanted filters
    if (acceptableConds) setAcceptableConditions(new Set(acceptableConds.split(',')));
    if (budMin) setBudgetMin(budMin);
    if (budMax) setBudgetMax(budMax);
    if (location) setLocationFilter(location);
    if (expiring === 'true') setShowExpiringOnly(true);

    setFiltersInitialized(true);
  }, []);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (!filtersInitialized) return;

    const params = new URLSearchParams();

    // Listing type
    if (listingType !== 'sell') params.set('type', listingType);

    // General filters
    if (searchQuery) params.set('q', searchQuery);
    if (sortBy !== 'recent') params.set('sort', sortBy);

    // Sell-specific filters
    if (listingType === 'sell') {
      if (selectedConditions.size > 0) params.set('conditions', Array.from(selectedConditions).join(','));
      if (selectedLanguages.size > 0) params.set('languages', Array.from(selectedLanguages).join(','));
      if (selectedPlayerCounts.size > 0) params.set('players', Array.from(selectedPlayerCounts).join(','));
      if (selectedMinAges.size > 0) params.set('ages', Array.from(selectedMinAges).join(','));
      if (selectedPlayingTimes.size > 0) params.set('times', Array.from(selectedPlayingTimes).join(','));
      if (priceMin) params.set('minPrice', priceMin);
      if (priceMax) params.set('maxPrice', priceMax);
    }

    // Wanted-specific filters
    if (listingType === 'wanted') {
      if (acceptableConditions.size > 0) params.set('acceptableConditions', Array.from(acceptableConditions).join(','));
      if (budgetMin) params.set('budgetMin', budgetMin);
      if (budgetMax) params.set('budgetMax', budgetMax);
      if (locationFilter) params.set('location', locationFilter);
      if (showExpiringOnly) params.set('expiring', 'true');
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [
    listingType,
    searchQuery,
    selectedConditions,
    selectedLanguages,
    selectedPlayerCounts,
    selectedMinAges,
    selectedPlayingTimes,
    priceMin,
    priceMax,
    acceptableConditions,
    budgetMin,
    budgetMax,
    locationFilter,
    showExpiringOnly,
    sortBy,
    filtersInitialized,
    pathname,
    router,
  ]);

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

      // Map sortBy to API sort param
      const sortMap: Record<string, string> = {
        'recent': 'newest',
        'price-low': 'price_asc',
        'price-high': 'price_desc',
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
    if (listingType === 'sell') {
      fetchGames(1, false);
    } else {
      fetchWantedListings();
    }
  }, [listingType]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (filtersInitialized && listingType === 'sell') {
      fetchGames(1, false);
    }
  }, [searchQuery, selectedLanguages, priceMin, priceMax, sortBy, filtersInitialized, listingType]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!filtersInitialized || listingType !== 'sell') return;

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

  // Handle toggles

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
    // Clear sell filters
    setSelectedConditions(new Set());
    setSelectedLanguages(new Set());
    setSelectedPlayerCounts(new Set());
    setSelectedMinAges(new Set());
    setSelectedPlayingTimes(new Set());
    setPriceMin('');
    setPriceMax('');
    // Clear wanted filters
    setAcceptableConditions(new Set());
    setBudgetMin('');
    setBudgetMax('');
    setLocationFilter('');
    setShowExpiringOnly(false);
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

    if (listingType === 'sell') {
      if (selectedLanguages.size > 0) count++;
      if (selectedPlayerCounts.size > 0) count++;
      if (selectedMinAges.size > 0) count++;
      if (selectedPlayingTimes.size > 0) count++;
      if (priceMin || priceMax) count++;
    } else {
      if (acceptableConditions.size > 0) count++;
      if (budgetMin || budgetMax) count++;
      if (locationFilter) count++;
      if (showExpiringOnly) count++;
    }

    return count;
  }, [
    listingType,
    searchQuery,
    selectedLanguages,
    selectedPlayerCounts,
    selectedMinAges,
    selectedPlayingTimes,
    priceMin,
    priceMax,
    acceptableConditions,
    budgetMin,
    budgetMax,
    locationFilter,
    showExpiringOnly
  ]);

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

  // Get condition icon and label
  const getConditionInfo = (condition: string) => {
    const conditionMap: Record<string, { icon: any; label: string }> = {
      likeNew: { icon: Star, label: tListings('conditions.likeNew') },
      veryGood: { icon: Sparkles, label: tListings('conditions.veryGood') },
      good: { icon: CircleCheck, label: tListings('conditions.good') },
      acceptable: { icon: Wrench, label: tListings('conditions.acceptable') },
    };
    return conditionMap[condition] || { icon: CircleCheck, label: condition };
  };

  // Get playing time label
  const getPlayingTimeLabel = (time: string) => {
    const labels: Record<string, string> = {
      '0-30': t('playingTime.under30'),
      '30-60': t('playingTime.thirtyTo60'),
      '60-120': t('playingTime.oneToTwoHours'),
      '120+': t('playingTime.twoPlus'),
    };
    return labels[time] || time;
  };

  // Handle "I Have This" click for wanted listings
  const handleIHaveThis = (wantedListingId: string) => {
    if (!user) {
      router.push(`/auth/signin?redirect=/wanted/${wantedListingId}`);
      return;
    }
    router.push(`/wanted/${wantedListingId}?openModal=true`);
  };

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

    // Expiring soon filter (< 7 days)
    if (showExpiringOnly) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      filtered = filtered.filter((listing) => {
        if (!listing.expires_at) return false;
        return new Date(listing.expires_at) < sevenDaysFromNow;
      });
    }

    // Sorting
    switch (sortBy) {
      case 'expiring':
        filtered.sort((a, b) =>
          new Date(a.expires_at || 0).getTime() - new Date(b.expires_at || 0).getTime()
        );
        break;
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
  }, [wantedListings, searchQuery, acceptableConditions, budgetMin, budgetMax, locationFilter, showExpiringOnly, sortBy]);

  // Memoized array of game IDs for navigation context
  const gameIds = useMemo(() => {
    return filteredGames.map(g => g.bgg_game_id);
  }, [filteredGames]);

  return (
    <div>
      {/* Compact Unified Toolbar */}
      <div className={cn(
        "border-b transition-colors sticky top-16 z-40 backdrop-blur-sm",
        listingType === 'sell' ? "bg-snow-white/95 border-frost-ice/20" : "bg-snow-white/95 border-aurora-orange/20"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Desktop: Single row */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            {/* Left side: Tabs + Count */}
            <div className="flex items-center gap-4">
              {/* Compact Tab Toggle */}
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-snow-white/80 shadow-sm">
                <button
                  onClick={() => setListingType('sell')}
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
                  onClick={() => setListingType('wanted')}
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
                onClick={() => setListingType('sell')}
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
                onClick={() => setListingType('wanted')}
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
            <div className="hidden lg:block border-2 border-border rounded-lg p-4 sm:p-6 bg-bg-elevated animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listingType === 'sell' ? (
                  <>
                {/* Player Count Filter */}
                <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.players')}</h3>
                    </div>
                    {selectedPlayerCounts.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlayerCounts(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
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
                        {count === 1 ? t('playerCount.solo') : count >= 8 ? t('playerCount.eightPlus') : count}
                      </Badge>
                    ))}
                    {availableOptions.playerCounts.length === 0 && (
                      <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                    )}
                  </div>
                </div>

                {/* Min Age Filter */}
                <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.minAge')}</h3>
                    </div>
                    {selectedMinAges.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMinAges(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
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
                      <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                    )}
                  </div>
                </div>

                {/* Playing Time Filter */}
                <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.playTime')}</h3>
                    </div>
                    {selectedPlayingTimes.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPlayingTimes(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
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
                      <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                    )}
                  </div>
                </div>

                {/* Language Filter */}
                <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">{t('filters.language')}</h3>
                    {selectedLanguages.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLanguages(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
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
                      <p className="text-sm text-text-muted italic">{t('messages.noLanguagesAvailable')}</p>
                    )}
                  </div>
                </div>

                {/* Price Range */}
                <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">{t('filters.priceEur')}</h3>
                    {(priceMin || priceMax) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePriceFilter}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
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
              </>
                ) : (
                  <>
                {/* Wanted-Specific Filters */}

                {/* Acceptable Conditions Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-aurora-orange" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.acceptableConditions')}</h3>
                    </div>
                    {acceptableConditions.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAcceptableConditions(new Set())}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {['likeNew', 'veryGood', 'good', 'acceptable'].map((condition) => {
                      const { icon: Icon, label } = getConditionInfo(condition);
                      return (
                        <label
                          key={condition}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <Checkbox
                            checked={acceptableConditions.has(condition)}
                            onChange={() => {
                              const newSet = new Set(acceptableConditions);
                              if (newSet.has(condition)) {
                                newSet.delete(condition);
                              } else {
                                newSet.add(condition);
                              }
                              setAcceptableConditions(newSet);
                            }}
                          />
                          <Icon className="w-4 h-4 text-text-muted" />
                          <span className="text-sm group-hover:text-polar-night transition-colors">
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-polar-night">{t('filters.budgetEur')}</h3>
                    {(budgetMin || budgetMax) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBudgetMin('');
                          setBudgetMax('');
                        }}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('filters.minPlaceholder')}
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      inputSize="sm"
                    />
                    <Input
                      placeholder={t('filters.maxPlaceholder')}
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      inputSize="sm"
                    />
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-aurora-orange" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.location')}</h3>
                    </div>
                    {locationFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocationFilter('')}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        {t('filters.clear')}
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder={t('filters.searchLocationPlaceholder')}
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    inputSize="sm"
                  />
                </div>

                {/* Expiring Soon Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-aurora-orange" />
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.expiringSoon')}</h3>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={showExpiringOnly}
                      onChange={() => setShowExpiringOnly(!showExpiringOnly)}
                    />
                    <span className="text-sm group-hover:text-polar-night transition-colors">
                      {t('filters.expiringToggle')}
                    </span>
                  </label>
                </div>
              </>
                )}
              </div>
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
                  <h2 className="text-lg font-semibold text-polar-night">{t('filters.title')}</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-muted" />
                  </button>
                </div>

                {/* Filter Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Player Count Filter */}
                  <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">{t('filters.players')}</h3>
                      </div>
                      {selectedPlayerCounts.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayerCounts(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          {t('filters.clear')}
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
                          {count === 1 ? t('playerCount.solo') : count >= 8 ? t('playerCount.eightPlus') : count}
                        </Badge>
                      ))}
                      {availableOptions.playerCounts.length === 0 && (
                        <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                      )}
                    </div>
                  </div>

                  {/* Min Age Filter */}
                  <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Baby className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">{t('filters.minAge')}</h3>
                      </div>
                      {selectedMinAges.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMinAges(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          {t('filters.clear')}
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
                        <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                      )}
                    </div>
                  </div>

                  {/* Playing Time Filter */}
                  <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <h3 className="text-sm font-medium text-polar-night">{t('filters.playTime')}</h3>
                      </div>
                      {selectedPlayingTimes.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayingTimes(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          {t('filters.clear')}
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
                        <p className="text-sm text-text-muted italic">{t('messages.noDataAvailable')}</p>
                      )}
                    </div>
                  </div>

                  {/* Language Filter */}
                  <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.language')}</h3>
                      {selectedLanguages.size > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLanguages(new Set())}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          {t('filters.clear')}
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
                        <p className="text-sm text-text-muted italic">{t('messages.noLanguagesAvailable')}</p>
                      )}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="p-4 rounded-lg bg-snow-white/50 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-polar-night">{t('filters.priceEur')}</h3>
                      {(priceMin || priceMax) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removePriceFilter}
                          className="h-auto py-0 px-2 text-xs"
                        >
                          {t('filters.clear')}
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
                <div className="border-t border-border-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-bg-elevated">
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="flex-1"
                      disabled={activeFiltersCount === 0}
                    >
                      {t('filters.clearAll')}
                    </Button>
                    <Button
                      variant="accent"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="flex-1"
                    >
                      {t('filters.applyFilters')}
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
              <span className="text-sm text-text-secondary">{t('filters.activeFilters')}</span>

              {/* Player count chips */}
              {Array.from(selectedPlayerCounts).map((count) => (
                <Badge
                  key={count}
                  variant="default"
                  className="cursor-pointer hover:bg-border-strong transition-colors flex items-center gap-1"
                  onClick={() => removePlayerCountFilter(count)}
                >
                  <Users className="w-3 h-3" />
                  <span>{count === 1 ? t('playerCount.solo') : count >= 8 ? t('playerCount.eightPlus') : count}</span>
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
                {t('filters.clearAll')}
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

        {/* Offline State */}
        {isOffline && !loading && (
          <OfflineError
            onRetry={() => {
              if (listingType === 'sell') {
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

        {/* Games Grid - Full Width, Responsive */}
        {!loading && !error && !isOffline && (listingType === 'sell' ? filteredGames.length > 0 : filteredWantedListings.length > 0) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {listingType === 'sell'
                ? filteredGames.map((game, index) => (
                    <AggregatedGameCard
                      key={game.bgg_game_id}
                      game={game}
                      allGameIds={gameIds}
                      index={index}
                    />
                  ))
                : filteredWantedListings.map((wantedListing) => (
                    <WantedListingCard
                      key={wantedListing.id}
                      wantedListing={wantedListing}
                      onIHaveThis={handleIHaveThis}
                      showBuyer={true}
                    />
                  ))
              }
            </div>

            {/* Infinite scroll sentinel - triggers loading when visible */}
            {listingType === 'sell' && hasMore && !loading && (
              <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
            )}

            {/* Loading More Indicator - Only for sell listings */}
            {listingType === 'sell' && loadingMore && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-frost-ice border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-text-secondary">{t('messages.loadingMore')}</p>
              </div>
            )}

            {/* No More Results - Only for sell listings */}
            {listingType === 'sell' && !hasMore && !loadingMore && filteredGames.length > 0 && (
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
        {!loading && !error && !isOffline && (listingType === 'sell' ? filteredGames.length === 0 : filteredWantedListings.length === 0) && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <Package className="w-16 h-16 text-text-muted" />
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              {listingType === 'sell' ? t('emptyState.noGamesFound') : t('emptyState.noWantedListings')}
            </h3>
            <p className="text-text-secondary mb-6">
              {activeFiltersCount > 0
                ? t('emptyState.tryAdjustingFilters')
                : listingType === 'sell'
                  ? t('emptyState.beFirstToList')
                  : t('emptyState.beFirstToPost')
              }
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="primary" onClick={clearFilters}>
                {t('emptyState.clearAllFilters')}
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
