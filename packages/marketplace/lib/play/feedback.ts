/**
 * Galda Spēle - Feedback Calculation Logic
 *
 * Compares a guessed game's attributes against the target game
 * and returns structured feedback for each attribute.
 */

import type {
  GameAttributes,
  GuessFeedback,
  NumericFeedback,
  NumericFeedbackResult,
  SetFeedback,
  SetFeedbackResult,
} from './types';

import {
  WEIGHT_EXACT_TOLERANCE,
  WEIGHT_CLOSE_TOLERANCE,
  PLAY_TIME_CLOSE_TOLERANCE,
  SET_MATCH_THRESHOLD,
} from './types';

// =============================================================================
// NUMERIC COMPARISON
// =============================================================================

/**
 * Compare two numeric values and return feedback
 * @param guess - The guessed value
 * @param target - The target value
 * @param exactTolerance - Values within this range are "correct" (default: 0)
 * @param closeTolerance - Values within this range are "close" (default: 0, meaning no "close" state)
 */
export function compareNumeric(
  guess: number,
  target: number,
  exactTolerance = 0,
  closeTolerance = 0
): NumericFeedbackResult {
  const diff = Math.abs(guess - target);

  if (diff <= exactTolerance) {
    return 'correct';
  }

  if (closeTolerance > 0 && diff <= closeTolerance) {
    return 'close';
  }

  return guess < target ? 'higher' : 'lower';
}

/**
 * Create numeric feedback object
 */
function createNumericFeedback(
  guessValue: number,
  targetValue: number,
  exactTolerance = 0,
  closeTolerance = 0
): NumericFeedback {
  return {
    value: guessValue,
    result: compareNumeric(guessValue, targetValue, exactTolerance, closeTolerance),
  };
}

// =============================================================================
// SET COMPARISON (Categories / Mechanics)
// =============================================================================

/**
 * Compare two sets and return the intersection
 */
function getSetIntersection(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((item) => setB.has(item.toLowerCase()));
}

/**
 * Compare two sets of strings (categories or mechanics)
 * @param guess - The guessed values
 * @param target - The target values
 * @param matchThreshold - Number of matches needed for "correct" (default: 2)
 */
export function compareSet(
  guess: string[],
  target: string[],
  matchThreshold = SET_MATCH_THRESHOLD
): { matched: string[]; result: SetFeedbackResult } {
  const matched = getSetIntersection(guess, target);
  const matchCount = matched.length;

  let result: SetFeedbackResult;
  if (matchCount >= matchThreshold) {
    result = 'correct';
  } else if (matchCount > 0) {
    result = 'partial';
  } else {
    result = 'none';
  }

  return { matched, result };
}

/**
 * Create set feedback object
 */
function createSetFeedback(
  guessValue: string[],
  targetValue: string[],
  matchThreshold = SET_MATCH_THRESHOLD
): SetFeedback {
  const { matched, result } = compareSet(guessValue, targetValue, matchThreshold);
  return {
    value: guessValue,
    matched,
    result,
  };
}

// =============================================================================
// MAIN FEEDBACK CALCULATION
// =============================================================================

/**
 * Calculate complete feedback for a guess against the target
 */
export function calculateFeedback(
  guess: GameAttributes,
  target: GameAttributes
): GuessFeedback {
  return {
    year: createNumericFeedback(guess.yearPublished, target.yearPublished),
    players: createNumericFeedback(guess.maxPlayers, target.maxPlayers),
    weight: createNumericFeedback(
      guess.weight,
      target.weight,
      WEIGHT_EXACT_TOLERANCE,
      WEIGHT_CLOSE_TOLERANCE
    ),
    playTime: createNumericFeedback(
      guess.playingTimeMinutes,
      target.playingTimeMinutes,
      0,
      PLAY_TIME_CLOSE_TOLERANCE
    ),
    categories: createSetFeedback(guess.categories, target.categories),
    mechanics: createSetFeedback(guess.mechanics, target.mechanics),
  };
}

// =============================================================================
// FEEDBACK RESULT CHECKERS
// =============================================================================

/**
 * Check if all feedback indicates a correct guess
 */
export function isAllCorrect(feedback: GuessFeedback): boolean {
  return (
    feedback.year.result === 'correct' &&
    feedback.players.result === 'correct' &&
    feedback.weight.result === 'correct' &&
    feedback.playTime.result === 'correct' &&
    feedback.categories.result === 'correct' &&
    feedback.mechanics.result === 'correct'
  );
}

// =============================================================================
// EMOJI CONVERSION (for sharing)
// =============================================================================

/**
 * Convert numeric feedback result to emoji
 */
export function numericResultToEmoji(result: NumericFeedbackResult): string {
  switch (result) {
    case 'correct':
      return '✅';
    case 'close':
      return '🟨';
    case 'higher':
      return '⬆️';
    case 'lower':
      return '⬇️';
  }
}

/**
 * Convert set feedback result to emoji
 */
export function setResultToEmoji(result: SetFeedbackResult): string {
  switch (result) {
    case 'correct':
      return '✅';
    case 'partial':
      return '🟨';
    case 'none':
      return '❌';
  }
}

/**
 * Convert a full feedback object to emoji row for sharing
 */
export function feedbackToEmojiRow(feedback: GuessFeedback): string {
  return [
    numericResultToEmoji(feedback.year.result),
    numericResultToEmoji(feedback.players.result),
    numericResultToEmoji(feedback.weight.result),
    numericResultToEmoji(feedback.playTime.result),
    setResultToEmoji(feedback.categories.result),
    setResultToEmoji(feedback.mechanics.result),
  ].join('');
}
