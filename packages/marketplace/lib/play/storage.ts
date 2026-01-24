/**
 * Galda Spēle - localStorage State Management
 *
 * Handles persistence of game state, statistics, and visitor ID.
 * All data stored client-side only (no account required).
 */

import type { PlayState, PuzzleState, PlayStats, GuessResult } from './types';
import { MAX_GUESSES } from './types';

const STORAGE_KEY = 'galda-spele-state';
const PUZZLE_RETENTION_DAYS = 30;

// =============================================================================
// DEFAULT STATE
// =============================================================================

function generateVisitorId(): string {
  return crypto.randomUUID();
}

function createDefaultStats(): PlayStats {
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: [0, 0, 0, 0, 0, 0],
  };
}

function createDefaultState(): PlayState {
  return {
    visitorId: generateVisitorId(),
    puzzles: {},
    stats: createDefaultStats(),
  };
}

// =============================================================================
// STORAGE OPERATIONS
// =============================================================================

/**
 * Load state from localStorage
 */
export function loadPlayState(): PlayState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const newState = createDefaultState();
      savePlayState(newState);
      return newState;
    }

    const parsed = JSON.parse(stored) as PlayState;

    // Ensure visitorId exists (migration for old state)
    if (!parsed.visitorId) {
      parsed.visitorId = generateVisitorId();
    }

    // Ensure stats exist
    if (!parsed.stats) {
      parsed.stats = createDefaultStats();
    }

    // Ensure puzzles object exists
    if (!parsed.puzzles) {
      parsed.puzzles = {};
    }

    return parsed;
  } catch {
    const newState = createDefaultState();
    savePlayState(newState);
    return newState;
  }
}

/**
 * Save state to localStorage
 */
export function savePlayState(state: PlayState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save play state:', error);
  }
}

// =============================================================================
// PUZZLE STATE OPERATIONS
// =============================================================================

/**
 * Get the current puzzle state for a given puzzle number
 */
export function getPuzzleState(
  state: PlayState,
  puzzleNumber: number
): PuzzleState | null {
  return state.puzzles[puzzleNumber] ?? null;
}

/**
 * Create a new puzzle state for starting a game
 */
export function createPuzzleState(): PuzzleState {
  return {
    guesses: [],
    status: 'playing',
  };
}

/**
 * Add a guess to the puzzle state
 */
export function addGuess(
  state: PlayState,
  puzzleNumber: number,
  guess: GuessResult,
  isCorrect: boolean
): PlayState {
  const puzzle = state.puzzles[puzzleNumber] ?? createPuzzleState();
  const newGuesses = [...puzzle.guesses, guess];

  let newStatus = puzzle.status;
  if (isCorrect) {
    newStatus = 'won';
  } else if (newGuesses.length >= MAX_GUESSES) {
    newStatus = 'lost';
  }

  const updatedPuzzle: PuzzleState = {
    guesses: newGuesses,
    status: newStatus,
    completedAt: newStatus !== 'playing' ? new Date().toISOString() : undefined,
  };

  // Update stats if game just ended
  let newStats = state.stats;
  if (puzzle.status === 'playing' && newStatus !== 'playing') {
    newStats = updateStats(state.stats, newStatus === 'won', newGuesses.length);
  }

  return {
    ...state,
    puzzles: {
      ...state.puzzles,
      [puzzleNumber]: updatedPuzzle,
    },
    stats: newStats,
  };
}

// =============================================================================
// STATS OPERATIONS
// =============================================================================

/**
 * Update stats after a game ends
 */
function updateStats(
  stats: PlayStats,
  won: boolean,
  guessCount: number
): PlayStats {
  const newDistribution = [...stats.distribution] as PlayStats['distribution'];

  if (won && guessCount >= 1 && guessCount <= 6) {
    newDistribution[guessCount - 1]++;
  }

  const newCurrentStreak = won ? stats.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(stats.maxStreak, newCurrentStreak);

  return {
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    currentStreak: newCurrentStreak,
    maxStreak: newMaxStreak,
    distribution: newDistribution,
  };
}

/**
 * Calculate win percentage
 */
export function getWinPercentage(stats: PlayStats): number {
  if (stats.played === 0) return 0;
  return Math.round((stats.won / stats.played) * 100);
}

/**
 * Get average guesses for wins
 */
export function getAverageGuesses(stats: PlayStats): number {
  const totalWinGuesses = stats.distribution.reduce(
    (sum, count, index) => sum + count * (index + 1),
    0
  );
  if (stats.won === 0) return 0;
  return Math.round((totalWinGuesses / stats.won) * 10) / 10;
}

// =============================================================================
// CLEANUP OPERATIONS
// =============================================================================

/**
 * Remove puzzles older than retention period to prevent localStorage bloat
 */
export function pruneOldPuzzles(
  state: PlayState,
  currentPuzzleNumber: number
): PlayState {
  const cutoffPuzzleNumber = currentPuzzleNumber - PUZZLE_RETENTION_DAYS;

  const prunedPuzzles: Record<number, PuzzleState> = {};
  for (const [key, value] of Object.entries(state.puzzles)) {
    const puzzleNum = parseInt(key, 10);
    if (puzzleNum >= cutoffPuzzleNumber) {
      prunedPuzzles[puzzleNum] = value;
    }
  }

  return {
    ...state,
    puzzles: prunedPuzzles,
  };
}

// =============================================================================
// DUPLICATE GUESS CHECK
// =============================================================================

/**
 * Check if a game has already been guessed in this puzzle
 */
export function hasGuessedGame(
  state: PlayState,
  puzzleNumber: number,
  gameId: number
): boolean {
  const puzzle = state.puzzles[puzzleNumber];
  if (!puzzle) return false;
  return puzzle.guesses.some((g) => g.gameId === gameId);
}
