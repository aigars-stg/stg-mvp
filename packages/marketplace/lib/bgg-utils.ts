/**
 * BGG Utility Functions
 * Pure utility functions for BGG data that don't make API calls.
 * Safe for client-side use.
 */

import { decode } from 'he';

// Language mapping helper
const LANGUAGE_MAP: Record<number, { name: string; flag: string; code: string }> = {
  2184: { name: 'English', flag: '🇬🇧', code: 'en' },
  2475: { name: 'Latvian', flag: '🇱🇻', code: 'lv' },
  2481: { name: 'Lithuanian', flag: '🇱🇹', code: 'lt' },
  2474: { name: 'Estonian', flag: '🇪🇪', code: 'et' },
  2219: { name: 'Russian', flag: '🇷🇺', code: 'ru' },
  2165: { name: 'German', flag: '🇩🇪', code: 'de' },
  2480: { name: 'Polish', flag: '🇵🇱', code: 'pl' },
  2241: { name: 'French', flag: '🇫🇷', code: 'fr' },
  2274: { name: 'Spanish', flag: '🇪🇸', code: 'es' },
  2264: { name: 'Italian', flag: '🇮🇹', code: 'it' },
};

/**
 * Get language information by BGG language ID
 */
export function getLanguageInfo(languageId: number) {
  return LANGUAGE_MAP[languageId] || { name: 'Unknown', flag: '🌍', code: 'unknown' };
}

/**
 * Get emoji flag for a language name
 */
export function getLanguageFlag(languageName: string): string {
  const entry = Object.values(LANGUAGE_MAP).find(l =>
    l.name.toLowerCase() === languageName.toLowerCase()
  );
  return entry?.flag || '🌍';
}

/**
 * Get language code (e.g., 'en', 'de') for a language name
 */
export function getLanguageCode(languageName: string): string {
  const entry = Object.values(LANGUAGE_MAP).find(l =>
    l.name.toLowerCase() === languageName.toLowerCase()
  );
  return entry?.code || 'unknown';
}

/**
 * Format language name with emoji flag prefix
 */
export function formatLanguage(languageName: string): string {
  const flag = getLanguageFlag(languageName);
  return `${flag} ${languageName}`;
}

/**
 * Decode HTML entities from BGG data
 * BGG often returns data with HTML entities like &#039; (apostrophe), &amp; (ampersand), etc.
 * This function decodes them to their proper characters.
 *
 * @example
 * decodeHTMLEntities("Embosca&#039;t") // Returns "Embosca't"
 * decodeHTMLEntities("Zombies &amp; More") // Returns "Zombies & More"
 * decodeHTMLEntities("L&#x27;Aéropostale") // Returns "L'Aéropostale"
 */
export function decodeHTMLEntities(text: string | undefined | null): string {
  if (!text) return '';
  return decode(text);
}

/**
 * Safely decode HTML entities, handling arrays and null/undefined values
 * Used for batch processing of BGG data (names, publishers, etc.)
 */
export function decodeHTMLEntitiesArray(arr: (string | undefined | null)[] | undefined | null): string[] {
  if (!arr) return [];
  return arr.map(decodeHTMLEntities).filter(Boolean);
}

/**
 * Debounce helper function
 * Delays function execution until after wait milliseconds have elapsed since the last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Condition templates for game listings
 */
export const CONDITION_TEMPLATES = {
  'likeNew': `I've played this game 2-3 times. All components are in excellent condition. The box has no wear. Cards are pristine. I'm selling because I'm downsizing my collection.`,

  'veryGood': `I've played this game 5-10 times over the past year. Components show minor wear from regular use but everything functions perfectly. The box has minor corner wear. Cards show slight edge wear but are fully playable. Selling because my gaming group prefers different styles.`,

  'good': `This game has been played regularly - probably 15-20 times. All components are present and functional. The box shows noticeable wear on corners. Cards have visible play wear but no tears. Still plenty of life left! Selling because I want to make room for new games.`,

  'acceptable': `This is a well-played copy with 30+ plays. Box has significant wear. Components show use but everything still works. Perfect if you want to play without worrying about keeping it pristine. Selling because I've moved on to other games.`,
};
