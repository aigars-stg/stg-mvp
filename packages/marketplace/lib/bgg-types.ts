// Comprehensive BGG type definitions

export interface BGGGame {
  id: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
  designers?: string[];
  playerCount?: string;
  minAge?: number;
  playingTime?: string;
  description?: string;
  rating?: number;
  isExpansion?: boolean; // Classification flag
  alternateNames?: string[]; // Localized and alternate names from BGG

  // Set when game was found via alternate name search (for auto-selection)
  matchedAlternateName?: string;

  // Optional metadata for stale cache handling
  _isStaleCache?: boolean;
  _cacheAge?: number; // hours
}

export interface BGGVersion {
  id: number;
  name: string;
  publisher?: string; // Primary publisher (for backward compatibility)
  publishers?: string[]; // All publishers
  language?: string; // Primary language (for backward compatibility)
  languages?: string[]; // All languages for multilingual versions
  languageId?: number;
  languageIds?: number[]; // All language IDs
  yearPublished?: number;
  productCode?: string;
  thumbnail?: string;
  image?: string;
}

export interface BGGInboundLink {
  id: string;
  type: string; // 'boardgameexpansion', 'boardgameintegration', 'boardgamecompilation', etc.
  value: string;
  inbound: boolean;
}

export interface BGGGameMetadata {
  id: number;
  name: string;
  type: string; // 'boardgame', 'boardgameexpansion', etc.
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
  alternateNames?: string[]; // All non-primary names from BGG
  designers?: string[];
  playerCount?: string;
  minAge?: number;
  playingTime?: string;
  description?: string;
  rating?: number; // Simple average rating
  bayesaverage?: number; // Bayesian average (more reliable, accounts for # of ratings)
  inboundLinks: BGGInboundLink[];
  outboundLinks: BGGInboundLink[];
}

export interface BGGSearchResult {
  id: number;
  name: string;
  type: string;
  yearPublished?: number;
}

export interface BGGError extends Error {
  code: 'RATE_LIMIT' | 'NETWORK_ERROR' | 'API_UNAVAILABLE' | 'PARSE_ERROR' | 'NOT_FOUND';
  userMessage: string;
  retryAfter?: number; // milliseconds
  originalError?: unknown;
}

// Manual version input for CSV-only fallback mode
// Extends BGGVersion to maintain compatibility with existing components
export interface ManualVersion extends Omit<BGGVersion, 'id'> {
  id: 0; // Sentinel value to identify manual versions
  isManual: true; // Flag for type discrimination
  name: string; // User-provided edition/version name
  publisher?: string; // User-provided publisher
  language?: string; // User-provided language
  yearPublished?: number; // User-provided edition year
  thumbnail?: string; // From user-uploaded photos
  image?: string; // From user-uploaded photos
}

// Union type for version selection (BGG or manual)
export type VersionSelection = BGGVersion | ManualVersion;

// Type guard to check if a version is manual
export function isManualVersion(version: VersionSelection | null): version is ManualVersion {
  return version !== null && 'isManual' in version && version.isManual === true;
}
