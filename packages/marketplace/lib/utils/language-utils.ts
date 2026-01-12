/**
 * Language utility functions for matching localized game names
 *
 * Extracted from:
 * - components/sell/ExpansionSelector.tsx
 */

/**
 * Language-specific character patterns for matching alternate names.
 * These characters are distinctive to each language and help identify localized titles.
 */
export const LANGUAGE_CHAR_PATTERNS: Record<string, RegExp> = {
  // Baltic
  'Latvian': /[āēīūķļņģ]/i,
  'Lithuanian': /[ąčęėįšųū]/i,
  'Estonian': /[äöüõ]/i,
  // Slavic
  'Polish': /[ąćęłńóśźż]/i,
  'Czech': /[áčďéěíňóřšťúůýž]/i,
  'Russian': /[а-яА-ЯёЁ]/,
  'Ukrainian': /[іїєґ]/i,
  // Nordic
  'Swedish': /[åäö]/i,
  'Danish': /[æøå]/i,
  'Norwegian': /[æøå]/i,
  'Finnish': /[äö]/i,
  // Asian
  'Japanese': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
  'Chinese': /[\u4E00-\u9FFF]/,
  'Korean': /[\uAC00-\uD7AF\u1100-\u11FF]/,
  'Thai': /[\u0E00-\u0E7F]/,
  // Other European
  'Hungarian': /[áéíóöőúüű]/i,
  'German': /[äöüß]/i,
  'French': /[àâçéèêëîïôùûüÿœæ]/i,
  'Spanish': /[áéíóúüñ¿¡]/i,
  'Portuguese': /[áàâãçéêíóôõú]/i,
  'Italian': /[àèéìíîòóùú]/i,
  'Dutch': /[éëïöü]/i,
  'Romanian': /[ăâîșț]/i,
};

/**
 * Result of finding the best display name for an expansion
 */
export interface DisplayNameResult {
  /** The name to display */
  displayName: string;
  /** Whether the user needs to manually select from multiple candidates */
  needsSelection: boolean;
  /** Candidate names if selection is needed */
  candidates: string[];
}

/**
 * Find the best display name for an expansion based on selected language.
 * Uses language-specific character patterns to match alternate names.
 *
 * @param primaryName - The primary BGG name
 * @param alternateNames - Array of alternate names from BGG
 * @param language - The selected language (e.g., "Latvian", "German")
 * @returns The best display name and whether selection is needed
 */
export function findBestDisplayName(
  primaryName: string,
  alternateNames: string[] | undefined,
  language: string | undefined
): DisplayNameResult {
  // If English or no alternates, use primary name
  if (language === 'English' || !alternateNames || alternateNames.length === 0) {
    return { displayName: primaryName, needsSelection: false, candidates: [] };
  }

  // Try to match using language-specific character patterns
  const pattern = language ? LANGUAGE_CHAR_PATTERNS[language] : null;
  if (pattern) {
    const matchingNames = alternateNames.filter(name => pattern.test(name));

    if (matchingNames.length === 1) {
      // Exact match - auto-select
      return { displayName: matchingNames[0], needsSelection: false, candidates: [] };
    } else if (matchingNames.length > 1) {
      // Multiple matches for this language - let user choose from filtered list
      return {
        displayName: matchingNames[0], // Default to first match
        needsSelection: true,
        candidates: matchingNames,
      };
    }
  }

  // Fallback: check for any non-ASCII names
  const hasNonAscii = (str: string) => /[^\x00-\x7F]/.test(str);
  const localizedNames = alternateNames.filter(hasNonAscii);

  if (localizedNames.length === 1) {
    return { displayName: localizedNames[0], needsSelection: false, candidates: [] };
  }

  // Multiple or no localized names - user needs to choose
  return {
    displayName: primaryName,
    needsSelection: true,
    candidates: alternateNames,
  };
}

/**
 * Find which alternate name matched a search query
 *
 * @param alternateNames - Array of alternate names to search
 * @param query - The search query
 * @returns The matching alternate name or null
 */
export function findMatchedAlternateName(
  alternateNames: string[] | undefined,
  query: string
): string | null {
  if (!query.trim() || !alternateNames) return null;
  const lowerQuery = query.toLowerCase();
  return alternateNames.find(alt =>
    alt.toLowerCase().includes(lowerQuery)
  ) || null;
}

/**
 * Check if a string contains non-ASCII characters (likely localized)
 */
export function hasNonAsciiCharacters(str: string): boolean {
  return /[^\x00-\x7F]/.test(str);
}

/**
 * Get the language pattern for a specific language
 */
export function getLanguagePattern(language: string): RegExp | undefined {
  return LANGUAGE_CHAR_PATTERNS[language];
}

/**
 * Check if a string matches a specific language's character pattern
 */
export function matchesLanguagePattern(text: string, language: string): boolean {
  const pattern = LANGUAGE_CHAR_PATTERNS[language];
  return pattern ? pattern.test(text) : false;
}
