/**
 * Saved Searches - Browser localStorage utilities
 * Allows users to save filter combinations for quick access
 */

const STORAGE_KEY = 'second-turn-saved-searches';
const MAX_SAVED_SEARCHES = 10;

export interface SavedSearchFilters {
  searchQuery?: string;
  selectedConditions?: string[];
  selectedLanguages?: string[];
  selectedPlayerCounts?: number[];
  selectedMinAges?: number[];
  selectedPlayingTimes?: string[];
  priceMin?: string;
  priceMax?: string;
  sortBy?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: number;
}

/**
 * Get all saved searches from localStorage
 */
export function getSavedSearches(): SavedSearch[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const searches: SavedSearch[] = JSON.parse(stored);
    // Sort by creation date, newest first
    return searches.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error reading saved searches:', error);
    return [];
  }
}

/**
 * Save a new search
 * Returns the new search or null if limit reached
 */
export function saveSearch(
  name: string,
  filters: SavedSearchFilters
): SavedSearch | null {
  if (typeof window === 'undefined') return null;

  try {
    const searches = getSavedSearches();

    // Check if limit reached
    if (searches.length >= MAX_SAVED_SEARCHES) {
      throw new Error(`Maximum of ${MAX_SAVED_SEARCHES} saved searches reached`);
    }

    // Check for duplicate names
    if (searches.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A search with this name already exists');
    }

    const newSearch: SavedSearch = {
      id: `search-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      filters,
      createdAt: Date.now(),
    };

    const updated = [newSearch, ...searches];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newSearch;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
}

/**
 * Delete a saved search by ID
 */
export function deleteSavedSearch(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const searches = getSavedSearches();
    const updated = searches.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting saved search:', error);
    throw error;
  }
}

/**
 * Get a specific saved search by ID
 */
export function getSavedSearch(id: string): SavedSearch | null {
  const searches = getSavedSearches();
  return searches.find((s) => s.id === id) || null;
}

/**
 * Count active filters in a saved search
 */
export function countActiveFilters(filters: SavedSearchFilters): number {
  let count = 0;
  if (filters.searchQuery) count++;
  if (filters.selectedConditions && filters.selectedConditions.length > 0) count++;
  if (filters.selectedLanguages && filters.selectedLanguages.length > 0) count++;
  if (filters.selectedPlayerCounts && filters.selectedPlayerCounts.length > 0) count++;
  if (filters.selectedMinAges && filters.selectedMinAges.length > 0) count++;
  if (filters.selectedPlayingTimes && filters.selectedPlayingTimes.length > 0) count++;
  if (filters.priceMin || filters.priceMax) count++;
  return count;
}

/**
 * Get the maximum number of allowed saved searches
 */
export function getMaxSavedSearches(): number {
  return MAX_SAVED_SEARCHES;
}
