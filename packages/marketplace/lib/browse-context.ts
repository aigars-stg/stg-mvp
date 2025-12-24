/**
 * Browse Context - sessionStorage utilities for game navigation
 * Stores the browse context (game list and position) when navigating from Browse to Game page
 * Enables prev/next navigation between games on the game detail page
 */

const STORAGE_KEY = 'second-turn-browse-context';
const CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface BrowseContext {
  gameIds: number[];
  currentIndex: number;
  timestamp: number;
}

/**
 * Check if context is still valid (not expired)
 */
function isContextValid(context: BrowseContext): boolean {
  return Date.now() - context.timestamp < CONTEXT_TTL_MS;
}

/**
 * Get browse context from sessionStorage
 * Returns null if no context exists or if context is expired
 */
export function getBrowseContext(): BrowseContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const context: BrowseContext = JSON.parse(stored);

    if (!isContextValid(context)) {
      clearBrowseContext();
      return null;
    }

    return context;
  } catch (error) {
    console.error('Error reading browse context:', error);
    return null;
  }
}

/**
 * Save browse context to sessionStorage
 * Called when user navigates from Browse page to a game
 */
export function saveBrowseContext(gameIds: number[], currentIndex: number): void {
  if (typeof window === 'undefined') return;

  try {
    const context: BrowseContext = {
      gameIds,
      currentIndex,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('Error saving browse context:', error);
  }
}

/**
 * Update the current index in the browse context
 * Called when user navigates to prev/next game
 */
export function updateBrowseContextIndex(newIndex: number): void {
  if (typeof window === 'undefined') return;

  try {
    const context = getBrowseContext();
    if (!context) return;

    context.currentIndex = newIndex;
    context.timestamp = Date.now(); // Refresh timestamp on navigation
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('Error updating browse context index:', error);
  }
}

/**
 * Clear the browse context
 */
export function clearBrowseContext(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing browse context:', error);
  }
}

/**
 * Get navigation info for a specific game ID
 * Returns prev/next game IDs and position info if context exists
 */
export function getNavigationInfo(currentBggId: number): {
  hasPrev: boolean;
  hasNext: boolean;
  prevGameId: number | null;
  nextGameId: number | null;
  currentPosition: number;
  totalGames: number;
  hasContext: boolean;
} | null {
  const context = getBrowseContext();

  if (!context || context.gameIds.length === 0) {
    return null;
  }

  // Find current game's position in the list
  let currentIndex = context.gameIds.indexOf(currentBggId);

  // If current game not found in list, use stored index
  if (currentIndex === -1) {
    currentIndex = context.currentIndex;
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < context.gameIds.length - 1;

  return {
    hasPrev,
    hasNext,
    prevGameId: hasPrev ? context.gameIds[currentIndex - 1] : null,
    nextGameId: hasNext ? context.gameIds[currentIndex + 1] : null,
    currentPosition: currentIndex + 1, // 1-based for display
    totalGames: context.gameIds.length,
    hasContext: true,
  };
}
