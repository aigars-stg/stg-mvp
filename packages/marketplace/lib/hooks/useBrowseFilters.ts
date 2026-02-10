'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';

type ListingType = 'sell' | 'wanted';

export interface BrowseFiltersState {
  // Listing type
  listingType: ListingType;

  // Common filters
  searchQuery: string;
  sortBy: string;

  // Sell-specific filters
  selectedConditions: Set<string>;
  selectedLanguages: Set<string>;
  selectedPlayerCounts: Set<number>;
  selectedMinAges: Set<number>;
  selectedPlayingTimes: Set<string>;
  priceMin: string;
  priceMax: string;

  // Wanted-specific filters
  acceptableConditions: Set<string>;
  budgetMin: string;
  budgetMax: string;
  locationFilter: string;
  showExpiringOnly: boolean;

  // UI state
  filtersOpen: boolean;
  mobileFiltersOpen: boolean;
  filtersInitialized: boolean;
}

export interface BrowseFiltersActions {
  setListingType: (type: ListingType) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;

  // Sell filter actions
  setSelectedConditions: (conditions: Set<string>) => void;
  setSelectedLanguages: (languages: Set<string>) => void;
  setSelectedPlayerCounts: (counts: Set<number>) => void;
  setSelectedMinAges: (ages: Set<number>) => void;
  setSelectedPlayingTimes: (times: Set<string>) => void;
  setPriceMin: (price: string) => void;
  setPriceMax: (price: string) => void;

  // Wanted filter actions
  setAcceptableConditions: (conditions: Set<string>) => void;
  setBudgetMin: (budget: string) => void;
  setBudgetMax: (budget: string) => void;
  setLocationFilter: (location: string) => void;
  setShowExpiringOnly: (show: boolean) => void;

  // UI actions
  setFiltersOpen: (open: boolean) => void;
  setMobileFiltersOpen: (open: boolean) => void;

  // Toggle helpers
  togglePlayerCount: (count: number) => void;
  toggleMinAge: (age: number) => void;
  togglePlayingTime: (time: string) => void;
  toggleLanguage: (lang: string) => void;
  toggleCondition: (condition: string) => void;

  // Remove helpers
  removePlayerCountFilter: (count: number) => void;
  removeMinAgeFilter: (age: number) => void;
  removePlayingTimeFilter: (time: string) => void;
  removeLanguageFilter: (lang: string) => void;
  removeConditionFilter: (condition: string) => void;
  removePriceFilter: () => void;

  // Clear helpers
  clearFilters: () => void;
}

export interface UseBrowseFiltersReturn extends BrowseFiltersState, BrowseFiltersActions {
  activeFiltersCount: number;
}

export function useBrowseFilters(): UseBrowseFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();

  // Listing type state
  const [listingType, setListingType] = useState<ListingType>('sell');

  // Common filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Sell-specific filter states
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [selectedPlayerCounts, setSelectedPlayerCounts] = useState<Set<number>>(new Set());
  const [selectedMinAges, setSelectedMinAges] = useState<Set<number>>(new Set());
  const [selectedPlayingTimes, setSelectedPlayingTimes] = useState<Set<string>>(new Set());
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Wanted-specific filter states
  const [acceptableConditions, setAcceptableConditions] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  // UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Initialize filters from URL params on mount
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

  // Update URL when filters change
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

  // Toggle helpers
  const togglePlayerCount = useCallback((count: number) => {
    setSelectedPlayerCounts(prev => {
      const next = new Set(prev);
      if (next.has(count)) {
        next.delete(count);
      } else {
        next.add(count);
      }
      return next;
    });
  }, []);

  const toggleMinAge = useCallback((age: number) => {
    setSelectedMinAges(prev => {
      const next = new Set(prev);
      if (next.has(age)) {
        next.delete(age);
      } else {
        next.add(age);
      }
      return next;
    });
  }, []);

  const togglePlayingTime = useCallback((time: string) => {
    setSelectedPlayingTimes(prev => {
      const next = new Set(prev);
      if (next.has(time)) {
        next.delete(time);
      } else {
        next.add(time);
      }
      return next;
    });
  }, []);

  const toggleLanguage = useCallback((lang: string) => {
    setSelectedLanguages(prev => {
      const next = new Set(prev);
      if (next.has(lang)) {
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  }, []);

  const toggleCondition = useCallback((condition: string) => {
    setSelectedConditions(prev => {
      const next = new Set(prev);
      if (next.has(condition)) {
        next.delete(condition);
      } else {
        next.add(condition);
      }
      return next;
    });
  }, []);

  // Remove helpers
  const removePlayerCountFilter = useCallback((count: number) => {
    setSelectedPlayerCounts(prev => {
      const next = new Set(prev);
      next.delete(count);
      return next;
    });
  }, []);

  const removeMinAgeFilter = useCallback((age: number) => {
    setSelectedMinAges(prev => {
      const next = new Set(prev);
      next.delete(age);
      return next;
    });
  }, []);

  const removePlayingTimeFilter = useCallback((time: string) => {
    setSelectedPlayingTimes(prev => {
      const next = new Set(prev);
      next.delete(time);
      return next;
    });
  }, []);

  const removeLanguageFilter = useCallback((lang: string) => {
    setSelectedLanguages(prev => {
      const next = new Set(prev);
      next.delete(lang);
      return next;
    });
  }, []);

  const removeConditionFilter = useCallback((condition: string) => {
    setSelectedConditions(prev => {
      const next = new Set(prev);
      next.delete(condition);
      return next;
    });
  }, []);

  const removePriceFilter = useCallback(() => {
    setPriceMin('');
    setPriceMax('');
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedConditions(new Set());
    setSelectedLanguages(new Set());
    setSelectedPlayerCounts(new Set());
    setSelectedMinAges(new Set());
    setSelectedPlayingTimes(new Set());
    setPriceMin('');
    setPriceMax('');
    setAcceptableConditions(new Set());
    setBudgetMin('');
    setBudgetMax('');
    setLocationFilter('');
    setShowExpiringOnly(false);
  }, []);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    if (listingType === 'sell') {
      return (
        selectedPlayerCounts.size +
        selectedMinAges.size +
        selectedPlayingTimes.size +
        selectedLanguages.size +
        selectedConditions.size +
        (priceMin || priceMax ? 1 : 0)
      );
    } else {
      return (
        acceptableConditions.size +
        (budgetMin || budgetMax ? 1 : 0) +
        (locationFilter ? 1 : 0) +
        (showExpiringOnly ? 1 : 0)
      );
    }
  }, [
    listingType,
    selectedPlayerCounts.size,
    selectedMinAges.size,
    selectedPlayingTimes.size,
    selectedLanguages.size,
    selectedConditions.size,
    priceMin,
    priceMax,
    acceptableConditions.size,
    budgetMin,
    budgetMax,
    locationFilter,
    showExpiringOnly,
  ]);

  return {
    // State
    listingType,
    searchQuery,
    sortBy,
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
    filtersOpen,
    mobileFiltersOpen,
    filtersInitialized,

    // Actions
    setListingType,
    setSearchQuery,
    setSortBy,
    setSelectedConditions,
    setSelectedLanguages,
    setSelectedPlayerCounts,
    setSelectedMinAges,
    setSelectedPlayingTimes,
    setPriceMin,
    setPriceMax,
    setAcceptableConditions,
    setBudgetMin,
    setBudgetMax,
    setLocationFilter,
    setShowExpiringOnly,
    setFiltersOpen,
    setMobileFiltersOpen,

    // Toggle helpers
    togglePlayerCount,
    toggleMinAge,
    togglePlayingTime,
    toggleLanguage,
    toggleCondition,

    // Remove helpers
    removePlayerCountFilter,
    removeMinAgeFilter,
    removePlayingTimeFilter,
    removeLanguageFilter,
    removeConditionFilter,
    removePriceFilter,

    // Clear helpers
    clearFilters,

    // Computed
    activeFiltersCount,
  };
}
