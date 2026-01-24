/**
 * Galda Spēle - Daily Board Game Guessing Game
 * Type definitions for the play feature
 */

// =============================================================================
// FEEDBACK TYPES
// =============================================================================

export type NumericFeedbackResult = 'correct' | 'higher' | 'lower' | 'close';
export type SetFeedbackResult = 'correct' | 'partial' | 'none';

export interface NumericFeedback {
  value: number;
  result: NumericFeedbackResult;
}

export interface SetFeedback {
  value: string[];
  matched: string[];
  result: SetFeedbackResult;
}

export interface GuessFeedback {
  year: NumericFeedback;
  players: NumericFeedback;
  weight: NumericFeedback;
  playTime: NumericFeedback;
  categories: SetFeedback;
  mechanics: SetFeedback;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface DailyPuzzleResponse {
  puzzleNumber: number;
  date: string; // ISO date string YYYY-MM-DD
}

export interface GuessRequest {
  puzzleNumber: number;
  gameId: number;
}

export interface GuessedGame {
  id: number;
  name: string;
  thumbnail: string | null;
}

export interface GuessResponse {
  correct: boolean;
  guessedGame: GuessedGame;
  feedback: GuessFeedback;
  answer: TargetGame | null; // Only populated when correct === true
}

export interface TargetGame {
  id: number;
  name: string;
  yearPublished: number;
  playerCount: string;
  maxPlayers: number;
  playingTime: string;
  playingTimeMinutes: number;
  weight: number;
  categories: string[];
  mechanics: string[];
  image: string | null;
  thumbnail: string | null;
}

// =============================================================================
// GAME DATA TYPES (for feedback calculation)
// =============================================================================

export interface GameAttributes {
  id: number;
  name: string;
  yearPublished: number;
  minPlayers: number;
  maxPlayers: number;
  playingTimeMinutes: number;
  weight: number;
  categories: string[];
  mechanics: string[];
  thumbnail: string | null;
  image: string | null;
}

// =============================================================================
// CLIENT STATE TYPES (localStorage)
// =============================================================================

export interface GuessResult {
  gameId: number;
  gameName: string;
  thumbnail: string | null;
  feedback: GuessFeedback;
}

export interface PuzzleState {
  guesses: GuessResult[];
  status: 'playing' | 'won' | 'lost';
  completedAt?: string; // ISO timestamp
}

export interface PlayStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  distribution: [number, number, number, number, number, number]; // Wins by guess count (1-6)
}

export interface PlayState {
  visitorId: string;
  puzzles: Record<number, PuzzleState>;
  stats: PlayStats;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_GUESSES = 6;
export const LAUNCH_DATE = new Date('2026-02-15');
export const RIGA_TIMEZONE = 'Europe/Riga';

// Feedback thresholds
export const WEIGHT_EXACT_TOLERANCE = 0.1;
export const WEIGHT_CLOSE_TOLERANCE = 0.3;
export const PLAY_TIME_CLOSE_TOLERANCE = 15; // minutes
export const SET_MATCH_THRESHOLD = 2; // Minimum matches for "correct"
