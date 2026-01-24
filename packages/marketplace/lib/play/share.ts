/**
 * Galda Spēle - Share Functionality
 *
 * Generates shareable text and handles clipboard/native sharing.
 */

import type { PuzzleState } from './types';
import { feedbackToEmojiRow } from './feedback';

const SHARE_URL = 'secondturngames.com/play';

// =============================================================================
// SHARE TEXT GENERATION
// =============================================================================

/**
 * Generate share text for a completed puzzle
 */
export function generateShareText(
  puzzleNumber: number,
  puzzle: PuzzleState
): string {
  if (puzzle.status === 'playing') {
    throw new Error('Cannot share an incomplete puzzle');
  }

  const guessCount = puzzle.status === 'won' ? puzzle.guesses.length : 'X';
  const header = `Galda Spēle #${puzzleNumber} 🎲 ${guessCount}/6`;

  const grid = puzzle.guesses.map((g) => feedbackToEmojiRow(g.feedback)).join('\n');

  return `${header}\n\n${grid}\n\n${SHARE_URL}`;
}

// =============================================================================
// SHARING METHODS
// =============================================================================

/**
 * Check if Web Share API is available (typically mobile)
 */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Share using native share sheet (mobile)
 */
export async function nativeShare(
  puzzleNumber: number,
  puzzle: PuzzleState
): Promise<boolean> {
  if (!canUseNativeShare()) {
    return false;
  }

  const text = generateShareText(puzzleNumber, puzzle);

  try {
    await navigator.share({
      text,
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    if (error instanceof Error && error.name === 'AbortError') {
      return false; // User cancelled, not an error
    }
    console.error('Native share failed:', error);
    return false;
  }
}

/**
 * Copy share text to clipboard
 */
export async function copyToClipboard(
  puzzleNumber: number,
  puzzle: PuzzleState
): Promise<boolean> {
  const text = generateShareText(puzzleNumber, puzzle);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
}

/**
 * Share results - tries native share first, falls back to clipboard
 */
export async function shareResults(
  puzzleNumber: number,
  puzzle: PuzzleState
): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
  // Try native share on mobile
  if (canUseNativeShare()) {
    const success = await nativeShare(puzzleNumber, puzzle);
    if (success) {
      return { success: true, method: 'native' };
    }
  }

  // Fall back to clipboard
  const success = await copyToClipboard(puzzleNumber, puzzle);
  return { success, method: 'clipboard' };
}
