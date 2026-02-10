// BGG API integration with caching and type classification
import { XMLParser } from 'fast-xml-parser';
import type { BGGGame, BGGVersion, BGGGameMetadata, BGGInboundLink } from './bgg-types';
import { classifyGame } from './bgg-classifier';
import {
  BGGError,
  createRateLimitError,
  createAPIUnavailableError,
  createParseError,
  createTimeoutError,
  parseFetchError,
} from './bgg-errors';
import { createBGGHeaders } from './bgg-config';
import { createServiceClient } from './supabase/client';
import { decodeHTMLEntities } from './bgg-utils';
import { cacheGet, cacheSet } from './cache';
import { loggers } from './logger';

// ============================================================================
// BGG XML Parser Result Types
// These interfaces represent the structure returned by fast-xml-parser
// when parsing BGG's XML API responses
// ============================================================================

/** Represents a name element from BGG XML (primary or alternate) */
interface BGGXMLName {
  '@_type'?: string;
  '@_value': string;
}

/** Represents a link element from BGG XML (designer, publisher, language, expansion, etc.) */
interface BGGXMLLink {
  '@_id': string;
  '@_type': string;
  '@_value': string;
  '@_inbound'?: string;
}

/** Represents a version item from BGG XML */
interface BGGXMLVersion {
  '@_id': string;
  name?: BGGXMLName | BGGXMLName[];
  yearpublished?: { '@_value': string };
  productcode?: { '@_value': string };
  thumbnail?: string;
  image?: string;
  link?: BGGXMLLink | BGGXMLLink[];
}

/** Represents a game/thing item from BGG XML */
interface BGGXMLItem {
  '@_id': string;
  '@_type'?: string;
  name?: BGGXMLName | BGGXMLName[];
  yearpublished?: { '@_value': string };
  minplayers?: { '@_value': string };
  maxplayers?: { '@_value': string };
  minage?: { '@_value': string };
  playingtime?: { '@_value': string };
  thumbnail?: string;
  image?: string;
  description?: string;
  link?: BGGXMLLink | BGGXMLLink[];
  versions?: { item?: BGGXMLVersion | BGGXMLVersion[] };
  statistics?: {
    ratings?: {
      average?: { '@_value': string };
      bayesaverage?: { '@_value': string };
    };
  };
}

/** Represents a search result item from BGG XML */
interface BGGXMLSearchItem {
  '@_id': string;
  name?: BGGXMLName | BGGXMLName[];
  yearpublished?: { '@_value': string };
}

/** Root structure of BGG XML response */
interface BGGXMLResponse {
  items?: {
    item?: BGGXMLItem | BGGXMLItem[] | BGGXMLSearchItem | BGGXMLSearchItem[];
  };
}

// Re-export types for convenience
export type { BGGGame, BGGVersion, BGGGameMetadata, BGGInboundLink };

// Re-export utilities from bgg-utils for backward compatibility
export {
  getLanguageFlag,
  getLanguageInfo,
  debounce,
  CONDITION_TEMPLATES,
  decodeHTMLEntities,
} from './bgg-utils';

// In-memory Maps kept as L1 stale fallback (used when BGG API errors occur)
const searchCache = new Map<string, { data: BGGGame[]; timestamp: number }>();
const gameDetailsCache = new Map<number, { data: BGGGame; timestamp: number }>();
const versionCache = new Map<number, { data: BGGVersion[]; timestamp: number }>();
const metadataCache = new Map<number, { data: BGGGameMetadata; timestamp: number }>();
const CACHE_TTL_SECONDS = 86400; // 24 hours (for Redis)

// Parse XML helper
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});



/**
 * Check if cached data exists (even if expired)
 */
function getStaleCache<T, K>(
  cache: Map<K, { data: T; timestamp: number }>,
  key: K
): { data: T; age: number } | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const ageInMs = Date.now() - cached.timestamp;
  const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));

  return {
    data: cached.data,
    age: ageInHours,
  };
}

/**
 * Log when using stale cache as fallback
 */
function logStaleCacheFallback(
  resourceType: string,
  key: string,
  ageInHours: number,
  error: BGGError
) {
  loggers.bgg.warn(
    { resourceType, key, ageInHours, errorCode: error.code },
    `Using ${ageInHours}h old cached ${resourceType} for "${key}" due to ${error.code}`
  );
}

/**
 * Fetches comprehensive game metadata including inbound/outbound links
 * This is critical for accurate type classification (expansion vs base game)
 */
export async function fetchGameMetadata(gameId: number): Promise<BGGGameMetadata | null> {
  // Check Redis/in-memory cache first
  const cached = await cacheGet<BGGGameMetadata>(`bgg:meta:${gameId}`);
  if (cached) return cached;

  try {
    loggers.bgg.info({ gameId }, 'Fetching metadata for game');

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`,
      {
        signal: controller.signal,
        headers: createBGGHeaders(),
      }
    );

    clearTimeout(timeoutId);

    // Check response status
    if (response.status === 429) {
      throw createRateLimitError(`game ${gameId}`, 5);
    }

    if (response.status >= 500) {
      throw createAPIUnavailableError(response.status, `game ${gameId}`);
    }

    if (response.status === 404) {
      return null; // Game not found is not an error, just return null
    }

    if (!response.ok) {
      throw createAPIUnavailableError(response.status, `game ${gameId}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml) as BGGXMLResponse;

    const item = parsed.items?.item as BGGXMLItem | undefined;
    if (!item) {
      return null;
    }

    // Parse alternate names (all non-primary names)
    // Decode HTML entities like &#039; (apostrophe) that BGG often includes
    const names: BGGXMLName[] = item.name ? (Array.isArray(item.name) ? item.name : [item.name]) : [];
    const alternateNames = names
      .filter((n) => n['@_type'] !== 'primary')
      .map((n) => decodeHTMLEntities(n['@_value']))
      .filter((name) => name && name.length > 0);

    // Parse links (critical for type classification)
    const links: BGGXMLLink[] = item.link ? (Array.isArray(item.link) ? item.link : [item.link]) : [];

    // Extract inbound links (games that this game expands/integrates with)
    const inboundLinks: BGGInboundLink[] = links
      .filter((l) => l['@_inbound'] === 'true')
      .map((l) => ({
        id: l['@_id'],
        type: l['@_type'],
        value: l['@_value'],
        inbound: true,
      }));

    // Extract outbound links (games that expand/integrate with this game)
    const outboundLinks: BGGInboundLink[] = links
      .filter((l) => !l['@_inbound'] || l['@_inbound'] === 'false')
      .map((l) => ({
        id: l['@_id'],
        type: l['@_type'],
        value: l['@_value'],
        inbound: false,
      }));

    // Parse designers (decode HTML entities in names)
    const designerLinks = links.filter((l) => l['@_type'] === 'boardgamedesigner');
    const designers = designerLinks.map((l) => decodeHTMLEntities(l['@_value']));

    // Parse player count
    const minPlayers = item.minplayers?.['@_value'];
    const maxPlayers = item.maxplayers?.['@_value'];
    const playerCount = minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : undefined;

    // Parse minimum age
    const minAge = item.minage?.['@_value'] ? parseInt(item.minage['@_value']) : undefined;

    // Parse playing time
    const playingTime = item.playingtime?.['@_value'];

    // Parse ratings (both simple average and Bayesian average)
    const rating = item.statistics?.ratings?.average?.['@_value'];
    const bayesaverage = item.statistics?.ratings?.bayesaverage?.['@_value'];

    const metadata: BGGGameMetadata = {
      id: parseInt(item['@_id']),
      name: decodeHTMLEntities(names.find((n) => n['@_type'] === 'primary')?.['@_value'] || names[0]?.['@_value'] || 'Unknown'),
      type: item['@_type'] || 'boardgame',
      yearPublished: item.yearpublished ? parseInt(item.yearpublished['@_value']) : undefined,
      thumbnail: item.thumbnail,
      image: item.image,
      alternateNames: alternateNames.length > 0 ? alternateNames : undefined,
      designers,
      playerCount,
      minAge,
      playingTime,
      description: item.description,
      rating: rating ? parseFloat(rating) : undefined,
      bayesaverage: bayesaverage ? parseFloat(bayesaverage) : undefined,
      inboundLinks,
      outboundLinks,
    };

    // Cache result in Redis + in-memory (for stale fallback)
    await cacheSet(`bgg:meta:${gameId}`, metadata, CACHE_TTL_SECONDS);
    metadataCache.set(gameId, { data: metadata, timestamp: Date.now() });

    return metadata;
  } catch (error: unknown) {
    // Convert to structured error
    let bggError: BGGError;

    if (error instanceof BGGError) {
      bggError = error;
    } else if (error instanceof Error && error.name === 'AbortError') {
      bggError = createTimeoutError(`game ${gameId}`);
    } else if (error instanceof Error && (error.message?.includes('parse') || error.message?.includes('XML'))) {
      bggError = createParseError(`game ${gameId}`, error);
    } else {
      bggError = parseFetchError(error, `game ${gameId}`);
    }

    loggers.bgg.error({ gameId, error: bggError.getTechnicalDetails() }, 'Metadata fetch error');

    // Try stale cache fallback
    if (bggError.canUseStaleCacheFallback()) {
      const stale = getStaleCache(metadataCache, gameId);

      if (stale) {
        logStaleCacheFallback('game metadata', String(gameId), stale.age, bggError);
        return stale.data;
      }
    }

    // No fallback - return null (let caller handle gracefully)
    return null;
  }
}

/**
 * Internal function to perform BGG search with exact match parameter
 */
async function performBGGSearch(query: string, exact: boolean = false): Promise<BGGXMLSearchItem[]> {
  const exactParam = exact ? '&exact=1' : '';
  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame${exactParam}`,
    {
      headers: createBGGHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`BGG API error: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as BGGXMLResponse;

  if (!parsed.items) {
    return [];
  }

  const items = parsed.items?.item || [];
  return Array.isArray(items) ? items as BGGXMLSearchItem[] : [items as BGGXMLSearchItem];
}

/**
 * Smart search strategy: exact-then-fuzzy
 *
 * For queries ≥4 characters:
 * 1. Try exact match first (e.g., "Terra Mystica" finds exact game)
 * 2. If we get ≥3 results, return those (high confidence)
 * 3. Otherwise, fall back to fuzzy search for better coverage
 *
 * For short queries (<4 chars):
 * - Use fuzzy search only (exact match too restrictive)
 *
 * This fixes the "Terra" problem where fuzzy search returns 100+ irrelevant results
 */
export async function searchGames(query: string): Promise<BGGGame[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Check Redis/in-memory cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = await cacheGet<BGGGame[]>(`bgg:search:${cacheKey}`);
  if (cached) return cached;

  try {
    let searchResults: BGGXMLSearchItem[] = [];

    // Smart strategy: Exact-then-fuzzy for queries ≥4 chars
    if (query.length >= 4) {
      // Try exact match first
      const exactResults = await performBGGSearch(query, true);

      if (exactResults.length >= 3) {
        // Good exact matches found, use those
        searchResults = exactResults;
        loggers.bgg.debug({ query, resultCount: exactResults.length }, 'Exact match strategy');
      } else {
        // Not enough exact matches, fall back to fuzzy
        const fuzzyResults = await performBGGSearch(query, false);
        // Combine: exact results first, then fuzzy results
        const exactIds = new Set(exactResults.map((r) => r['@_id']));
        const additionalFuzzy = fuzzyResults.filter((r) => !exactIds.has(r['@_id']));
        searchResults = [...exactResults, ...additionalFuzzy];
        loggers.bgg.debug({ query, exactCount: exactResults.length, fuzzyCount: additionalFuzzy.length }, 'Exact+Fuzzy strategy');
      }
    } else {
      // Short query: fuzzy search only
      searchResults = await performBGGSearch(query, false);
      loggers.bgg.debug({ query, resultCount: searchResults.length }, 'Fuzzy-only strategy');
    }

    // Parse search results
    const parsedResults = searchResults
      .filter((item) => item['@_id'])
      .map((item) => {
        const nameData = item.name;
        const names: BGGXMLName[] = nameData ? (Array.isArray(nameData) ? nameData : [nameData]) : [];
        const name = names.find((n) => n['@_type'] === 'primary')?.['@_value'] || names[0]?.['@_value'];

        return {
          id: parseInt(item['@_id']),
          name: name || 'Unknown',
          yearPublished: item.yearpublished ? parseInt(item.yearpublished['@_value']) : undefined,
        };
      });

    // CRITICAL: Fetch metadata for top results to classify type
    // This prevents expansions from appearing in base game searches
    const topResults = parsedResults.slice(0, 20); // Limit to reduce API calls

    const enrichedResults = await Promise.all(
      topResults.map(async (result) => {
        const metadata = await fetchGameMetadata(result.id);
        if (!metadata) {
          // If metadata fetch fails, include the game (safer than excluding)
          return {
            ...result,
            isExpansion: false,
          };
        }

        // Use classifier to determine if expansion
        const classification = classifyGame(metadata);
        const isExp = classification.type === 'expansion' || classification.type === 'standalone-expansion';

        loggers.bgg.debug(
          { gameName: metadata.name, gameId: metadata.id, classificationType: classification.type, reason: classification.reason },
          'Game classification'
        );

        return {
          id: result.id,
          name: result.name || metadata.name,
          yearPublished: result.yearPublished || metadata.yearPublished,
          thumbnail: metadata.thumbnail,
          image: metadata.image,
          designers: metadata.designers,
          playerCount: metadata.playerCount,
          minAge: metadata.minAge,
          playingTime: metadata.playingTime,
          description: metadata.description,
          rating: metadata.rating,
          isExpansion: isExp,
        };
      })
    );

    // Filter to base games only
    const baseGames = enrichedResults.filter((game) => !game.isExpansion);

    loggers.bgg.info(
      { query, baseGameCount: baseGames.length, filteredExpansions: enrichedResults.length - baseGames.length },
      'Search complete'
    );

    // Cache results in Redis + in-memory (for stale fallback)
    await cacheSet(`bgg:search:${cacheKey}`, baseGames, CACHE_TTL_SECONDS);
    searchCache.set(cacheKey, { data: baseGames, timestamp: Date.now() });

    return baseGames;
  } catch (error: unknown) {
    // Convert to structured error
    let bggError: BGGError;

    if (error instanceof BGGError) {
      bggError = error;
    } else if (error instanceof Error && error.message?.includes('BGG API error')) {
      // Parse status code from error message
      const statusMatch = error.message.match(/error: (\d+)/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : 500;

      if (statusCode === 429) {
        bggError = createRateLimitError(query, 5);
      } else if (statusCode >= 500) {
        bggError = createAPIUnavailableError(statusCode, query);
      } else {
        bggError = parseFetchError(error, query);
      }
    } else {
      bggError = parseFetchError(error, query);
    }

    // Log the error
    loggers.bgg.error({ query, error: bggError.getTechnicalDetails() }, 'Search error');

    // Try stale cache fallback
    if (bggError.canUseStaleCacheFallback()) {
      const stale = getStaleCache(searchCache, cacheKey);

      if (stale) {
        logStaleCacheFallback('search results', query, stale.age, bggError);

        // Return stale data with metadata flag
        const staleResults = stale.data;
        return staleResults.map((r) => ({
          ...r,
          _isStaleCache: true,
          _cacheAge: stale.age,
        }));
      }
    }

    // No fallback available - throw error to UI
    throw bggError;
  }
}

export async function getGameDetails(gameId: number): Promise<BGGGame | null> {
  // Check Redis/in-memory cache first
  const cached = await cacheGet<BGGGame>(`bgg:details:${gameId}`);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`,
      {
        headers: createBGGHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml) as BGGXMLResponse;

    const item = parsed.items?.item as BGGXMLItem | undefined;
    if (!item) {
      return null;
    }

    // Parse name (handle both array and single object)
    const names: BGGXMLName[] = item.name ? (Array.isArray(item.name) ? item.name : [item.name]) : [];

    // Parse designers
    const links: BGGXMLLink[] = item.link ? (Array.isArray(item.link) ? item.link : [item.link]) : [];
    const designerLinks = links.filter((l) => l['@_type'] === 'boardgamedesigner');
    const designers = designerLinks.map((l) => l['@_value']);

    // Parse player count
    const minPlayers = item.minplayers?.['@_value'];
    const maxPlayers = item.maxplayers?.['@_value'];
    const playerCount = minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : undefined;

    // Parse minimum age
    const minAge = item.minage?.['@_value'] ? parseInt(item.minage['@_value']) : undefined;

    // Parse playing time
    const playingTime = item.playingtime?.['@_value'];

    const game: BGGGame = {
      id: parseInt(item['@_id']),
      name: names.find((n) => n['@_type'] === 'primary')?.['@_value'] || names[0]?.['@_value'] || 'Unknown',
      yearPublished: item.yearpublished ? parseInt(item.yearpublished['@_value']) : undefined,
      thumbnail: item.thumbnail,
      image: item.image,
      designers,
      playerCount,
      minAge,
      playingTime,
      description: item.description,
    };

    // Cache result in Redis + in-memory
    await cacheSet(`bgg:details:${gameId}`, game, CACHE_TTL_SECONDS);
    gameDetailsCache.set(gameId, { data: game, timestamp: Date.now() });

    return game;
  } catch (error: unknown) {
    console.error('BGG game details error:', error);
    return null;
  }
}

export async function getGameVersions(gameId: number): Promise<BGGVersion[]> {
  // Check Redis/in-memory cache first
  const cached = await cacheGet<BGGVersion[]>(`bgg:versions:${gameId}`);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&versions=1`,
      {
        headers: createBGGHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml) as BGGXMLResponse;

    const item = parsed.items?.item as BGGXMLItem | undefined;
    if (!item || !item.versions) {
      return [];
    }

    // Parse versions
    const versionsData = item.versions?.item || [];
    const versionsArray: BGGXMLVersion[] = Array.isArray(versionsData) ? versionsData : [versionsData];

    const versions: BGGVersion[] = versionsArray
      .filter((version) => version['@_id'])
      .map((version) => {
        // Extract links
        const versionLinks: BGGXMLLink[] = version.link ? (Array.isArray(version.link) ? version.link : [version.link]) : [];

        // Extract ALL publishers (decode HTML entities)
        const publisherLinks = versionLinks.filter((l) => l['@_type'] === 'boardgamepublisher');
        const publishers = publisherLinks.map((l) => decodeHTMLEntities(l['@_value']));

        // Extract ALL languages (for multilingual versions, decode HTML entities)
        const languageLinks = versionLinks.filter((l) => l['@_type'] === 'language');
        const languages = languageLinks.map((l) => decodeHTMLEntities(l['@_value']));
        const languageIds = languageLinks.map((l) => parseInt(l['@_id']));

        // Parse name (decode HTML entities)
        const nameData = version.name;
        const versionNames: BGGXMLName[] = nameData ? (Array.isArray(nameData) ? nameData : [nameData]) : [];
        const rawName = versionNames.find((n) => n['@_type'] === 'primary')?.['@_value'] || versionNames[0]?.['@_value'];
        const name = decodeHTMLEntities(rawName);

        return {
          id: parseInt(version['@_id']),
          name: name || 'Unknown Version',
          publisher: publishers[0], // Primary publisher for backward compatibility
          publishers: publishers.length > 0 ? publishers : undefined,
          language: languages[0], // Primary language for backward compatibility
          languages: languages.length > 0 ? languages : undefined,
          languageId: languageIds[0],
          languageIds: languageIds.length > 0 ? languageIds : undefined,
          yearPublished: version.yearpublished ? parseInt(version.yearpublished['@_value']) : undefined,
          productCode: version.productcode?.['@_value'],
          thumbnail: version.thumbnail,
          image: version.image,
        };
      });

    // Cache results in Redis + in-memory
    await cacheSet(`bgg:versions:${gameId}`, versions, CACHE_TTL_SECONDS);
    versionCache.set(gameId, { data: versions, timestamp: Date.now() });

    return versions;
  } catch (error: unknown) {
    console.error('BGG versions error:', error);
    return [];
  }
}

// Expansion info for a base game
export interface BGGExpansionInfo {
  bgg_id: number;
  name: string;
  year: number | null;
  thumbnail: string | null;
  image: string | null;
  versions: BGGVersion[];
  alternateNames?: string[]; // Localized names (e.g., "Spārnotie: Eiropas putni")
}

/**
 * Get the count of expansions for a game (lightweight - no version fetching)
 * Uses cached metadata if available
 */
export async function getExpansionCount(gameId: number): Promise<number> {
  try {
    const metadata = await fetchGameMetadata(gameId);
    if (!metadata) return 0;

    const expansionLinks = (metadata.outboundLinks || []).filter(
      (link) => link.type === 'boardgameexpansion'
    );

    return expansionLinks.length;
  } catch (error: unknown) {
    console.error(`Error getting expansion count for ${gameId}:`, error);
    return 0;
  }
}

/**
 * Fetch all expansions for a base game
 * Uses batch API call for efficiency
 */
export async function fetchExpansionsForGame(gameId: number): Promise<BGGExpansionInfo[]> {
  loggers.bgg.info({ gameId }, 'Fetching expansions for game');

  try {
    // First, get the base game metadata to find expansion IDs
    const metadata = await fetchGameMetadata(gameId);
    if (!metadata) {
      loggers.bgg.warn({ gameId }, 'No metadata for game');
      return [];
    }

    // Filter outbound links to get expansion IDs
    const expansionLinks = (metadata.outboundLinks || []).filter(
      (link) => link.type === 'boardgameexpansion'
    );

    if (expansionLinks.length === 0) {
      loggers.bgg.info({ gameId }, 'No expansions found');
      return [];
    }

    const expansionIds = expansionLinks.map((link) => parseInt(link.id));
    loggers.bgg.info({ gameId, gameName: metadata.name, expansionCount: expansionIds.length }, 'Found expansions');

    // Batch fetch all expansions (BGG API supports up to ~20 IDs per request)
    // Split into chunks if needed
    const BATCH_SIZE = 20;
    const expansions: BGGExpansionInfo[] = [];

    for (let i = 0; i < expansionIds.length; i += BATCH_SIZE) {
      const batchIds = expansionIds.slice(i, i + BATCH_SIZE);
      const idsParam = batchIds.join(',');

      const response = await fetch(
        `https://boardgamegeek.com/xmlapi2/thing?id=${idsParam}&versions=1`,
        {
          headers: createBGGHeaders(),
        }
      );

      if (!response.ok) {
        loggers.bgg.error({ status: response.status }, 'Batch fetch failed');
        continue;
      }

      const xml = await response.text();
      const parsed = parser.parse(xml) as BGGXMLResponse;

      const items = parsed.items?.item || [];
      const itemsArray: BGGXMLItem[] = Array.isArray(items) ? items as BGGXMLItem[] : [items as BGGXMLItem];

      for (const item of itemsArray) {
        if (!item['@_id']) continue;

        // Parse names (primary and alternates)
        const names: BGGXMLName[] = item.name ? (Array.isArray(item.name) ? item.name : [item.name]) : [];
        const primaryName = names.find((n) => n['@_type'] === 'primary')?.['@_value'] || names[0]?.['@_value'] || 'Unknown';

        // Parse alternate names (localized titles like "Spārnotie: Eiropas putni")
        const alternateNames = names
          .filter((n) => n['@_type'] !== 'primary')
          .map((n) => decodeHTMLEntities(n['@_value']))
          .filter((name) => name && name.length > 0);

        // Parse versions
        const versionsData = item.versions?.item || [];
        const versionsArray: BGGXMLVersion[] = Array.isArray(versionsData) ? versionsData : [versionsData];

        const versions: BGGVersion[] = versionsArray
          .filter((version) => version['@_id'])
          .map((version) => {
            const versionLinks: BGGXMLLink[] = version.link ? (Array.isArray(version.link) ? version.link : [version.link]) : [];

            const publisherLinks = versionLinks.filter((l) => l['@_type'] === 'boardgamepublisher');
            const publishers = publisherLinks.map((l) => decodeHTMLEntities(l['@_value']));

            const languageLinks = versionLinks.filter((l) => l['@_type'] === 'language');
            const languages = languageLinks.map((l) => decodeHTMLEntities(l['@_value']));

            const nameData = version.name;
            const versionNames: BGGXMLName[] = nameData ? (Array.isArray(nameData) ? nameData : [nameData]) : [];
            const rawName = versionNames.find((n) => n['@_type'] === 'primary')?.['@_value'] || versionNames[0]?.['@_value'];
            const name = decodeHTMLEntities(rawName);

            return {
              id: parseInt(version['@_id']),
              name: name || 'Unknown Version',
              publisher: publishers[0],
              publishers: publishers.length > 0 ? publishers : undefined,
              language: languages[0],
              languages: languages.length > 0 ? languages : undefined,
              yearPublished: version.yearpublished ? parseInt(version.yearpublished['@_value']) : undefined,
              thumbnail: version.thumbnail || item.thumbnail,
              image: version.image || item.image,
            };
          });

        // Log alternate names for debugging
        loggers.bgg.debug(
          { expansionName: primaryName, alternateNameCount: alternateNames.length, alternateNames },
          'Expansion alternate names'
        );

        expansions.push({
          bgg_id: parseInt(item['@_id']),
          name: decodeHTMLEntities(primaryName),
          year: item.yearpublished ? parseInt(item.yearpublished['@_value']) : null,
          thumbnail: item.thumbnail || null,
          image: item.image || null,
          versions,
          alternateNames: alternateNames.length > 0 ? alternateNames : undefined,
        });
      }
    }

    loggers.bgg.info({ expansionCount: expansions.length }, 'Fetched expansions with versions');
    return expansions;
  } catch (error: unknown) {
    loggers.bgg.error({ error }, 'Error fetching expansions');
    return [];
  }
}

/**
 * Fetch game data with automatic fallback detection
 * Returns game data along with a flag indicating if manual input should be used
 *
 * Triggers fallback mode when:
 * - BGG API is completely unavailable
 * - No cover image is available
 * - No version data is available
 */
export async function fetchGameWithFallback(gameId: number): Promise<{
  metadata: BGGGameMetadata | null;
  versions: BGGVersion[];
  fallbackMode: boolean;
  reason?: string;
}> {
  loggers.bgg.info({ gameId }, 'Checking game with fallback detection');

  try {
    // Fetch metadata and versions in parallel
    const [metadata, versions] = await Promise.all([
      fetchGameMetadata(gameId),
      getGameVersions(gameId),
    ]);

    // Check if we should fallback to manual input
    let fallbackMode = false;
    let reason: string | undefined;

    // Case 1: Metadata fetch completely failed
    if (!metadata) {
      fallbackMode = true;
      reason = 'BGG metadata unavailable';
      loggers.bgg.warn({ gameId }, 'No metadata available');
    }
    // Case 2: No cover image
    else if (!metadata.image && !metadata.thumbnail) {
      fallbackMode = true;
      reason = 'Missing cover image';
      loggers.bgg.warn({ gameId, gameName: metadata.name }, 'No cover image');
    }
    // Case 3: No version data
    else if (!versions || versions.length === 0) {
      fallbackMode = true;
      reason = 'No version data available';
      loggers.bgg.warn({ gameId, gameName: metadata.name }, 'No versions available');
    }

    // Apply image fallback: use game's image/thumbnail for versions without their own
    let processedVersions = versions || [];
    if (!fallbackMode && metadata && processedVersions.length > 0) {
      let fallbackCount = 0;
      processedVersions = processedVersions.map(version => {
        if (!version.thumbnail && !version.image) {
          fallbackCount++;
          return {
            ...version,
            thumbnail: metadata.thumbnail,
            image: metadata.image,
          };
        }
        return version;
      });

      if (fallbackCount > 0) {
        loggers.bgg.info({ gameId, fallbackCount }, 'Using game images for versions without images');
      }
    }

    if (fallbackMode) {
      loggers.bgg.info({ gameId, reason }, 'Entering manual input mode');
    } else {
      loggers.bgg.info({ gameId }, 'Full BGG data available');
    }

    return {
      metadata,
      versions: processedVersions,
      fallbackMode,
      reason,
    };
  } catch (error: unknown) {
    loggers.bgg.error({ gameId, error }, 'Error fetching game with fallback');

    // Complete API failure - definitely fallback
    return {
      metadata: null,
      versions: [],
      fallbackMode: true,
      reason: 'BGG API error',
    };
  }
}

/**
 * Ensures game metadata is populated in the database
 * Fetches from BGG API if missing and updates the games table
 *
 * Called during listing creation to ensure card data is available
 */
export async function ensureGameMetadata(gameId: number): Promise<void> {
  const supabase = createServiceClient();

  // Check if game already has metadata and parent_bgg_id status
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('player_count, thumbnail, image, is_expansion, parent_bgg_id')
    .eq('id', gameId)
    .single();

  if (fetchError) {
    loggers.bgg.error({ gameId, error: fetchError }, 'Error fetching game for metadata check');
    return;
  }

  const hasMetadata = game?.player_count && game?.thumbnail;
  const needsParentLookup = game?.is_expansion && !game?.parent_bgg_id;

  // If metadata exists and no parent lookup needed, we're done
  if (hasMetadata && !needsParentLookup) {
    loggers.bgg.debug({ gameId }, 'Game already has metadata');
    return;
  }

  // Fetch metadata from BGG API (needed for metadata update or parent lookup)
  loggers.bgg.info({ gameId }, 'Fetching BGG metadata');
  const metadata = await fetchGameMetadata(gameId);

  if (!metadata) {
    loggers.bgg.warn({ gameId }, 'No metadata returned from BGG');
    return;
  }

  // Update game metadata if missing
  if (!hasMetadata) {
    const { error: updateError } = await supabase
      .from('games')
      .update({
        player_count: metadata.playerCount || null,
        min_age: metadata.minAge || null,
        playing_time: metadata.playingTime || null,
        thumbnail: metadata.thumbnail || null,
        image: metadata.image || null,
        description: metadata.description || null,
        designers: metadata.designers && metadata.designers.length > 0 ? metadata.designers : null,
        metadata_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      loggers.bgg.error({ gameId, error: updateError }, 'Error updating game metadata');
      return;
    }

    loggers.bgg.info({ gameId }, 'Successfully updated metadata');
  }

  // For expansion games, ensure parent_bgg_id is set
  if (needsParentLookup) {
    const parentLink = metadata.inboundLinks.find(
      (l) => l.type === 'boardgameexpansion'
    );

    if (parentLink) {
      const parentBggId = parseInt(parentLink.id);
      const { error: parentUpdateError } = await supabase
        .from('games')
        .update({ parent_bgg_id: parentBggId })
        .eq('id', gameId);

      if (parentUpdateError) {
        loggers.bgg.error({ gameId, error: parentUpdateError }, 'Error setting parent_bgg_id');
      } else {
        loggers.bgg.info({ gameId, parentBggId }, 'Set parent_bgg_id for expansion');
        await ensureParentGameExists(parentBggId);
      }
    }
  }
}

/**
 * Ensures a parent/base game exists in the games table with metadata.
 * Called when an expansion's parent_bgg_id is set but the parent game
 * may be missing or lack metadata (thumbnail, player_count, etc.).
 */
async function ensureParentGameExists(parentBggId: number): Promise<void> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('games')
    .select('id, thumbnail')
    .eq('id', parentBggId)
    .single();

  // Parent exists with metadata — nothing to do
  if (existing?.thumbnail) return;

  // Fetch parent game metadata from BGG
  const parentMeta = await fetchGameMetadata(parentBggId);
  if (!parentMeta) return;

  await supabase.from('games').upsert({
    id: parentBggId,
    name: parentMeta.name,
    yearpublished: parentMeta.yearPublished || null,
    is_expansion: false,
    thumbnail: parentMeta.thumbnail || null,
    image: parentMeta.image || null,
    player_count: parentMeta.playerCount || null,
    min_age: parentMeta.minAge || null,
    playing_time: parentMeta.playingTime || null,
    description: parentMeta.description || null,
    designers: parentMeta.designers?.length ? parentMeta.designers : null,
    bayesaverage: parentMeta.bayesaverage || null,
    metadata_fetched_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  loggers.bgg.info({ parentBggId, name: parentMeta.name }, 'Ensured parent game exists with metadata');
}

