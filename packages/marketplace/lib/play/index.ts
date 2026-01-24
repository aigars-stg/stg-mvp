/**
 * Galda Spēle - Daily Board Game Guessing Game
 *
 * Public exports for the play feature
 */

// Types
export * from './types';

// Feedback calculation
export {
  calculateFeedback,
  isAllCorrect,
  compareNumeric,
  compareSet,
  numericResultToEmoji,
  setResultToEmoji,
  feedbackToEmojiRow,
} from './feedback';

// localStorage state management
export {
  loadPlayState,
  savePlayState,
  getPuzzleState,
  createPuzzleState,
  addGuess,
  pruneOldPuzzles,
  hasGuessedGame,
  getWinPercentage,
  getAverageGuesses,
} from './storage';

// Share functionality
export {
  generateShareText,
  canUseNativeShare,
  nativeShare,
  copyToClipboard,
  shareResults,
} from './share';
