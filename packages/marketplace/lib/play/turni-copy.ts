/**
 * Returns the translation key suffix for Turni's win message based on guess count.
 * Usage: t(`Play.turni.win.${getTurniWinKey(guessCount)}`)
 */
export function getTurniWinKey(guessCount: number): string {
  // Clamp to valid range 1-6
  const clamped = Math.max(1, Math.min(6, guessCount));
  return String(clamped);
}

/**
 * Returns the translation key suffix for streak milestone, or null if no milestone.
 * Only returns a key for streaks of 3, 7, 14, or 30+.
 * Usage: const key = getTurniStreakKey(streak); if (key) t(`Play.turni.streak.${key}`)
 */
export function getTurniStreakKey(streak: number): string | null {
  if (streak >= 30) return '30';
  if (streak >= 14) return '14';
  if (streak >= 7) return '7';
  if (streak >= 3) return '3';
  return null;
}
