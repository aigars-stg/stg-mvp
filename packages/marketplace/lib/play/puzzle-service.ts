/**
 * Galda Spēle - Puzzle Generation Service
 *
 * Handles daily puzzle selection and BGG data enrichment.
 */

import { createHash } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { createServiceClient, supabase } from '@/lib/supabase/client';
import { createBGGHeaders } from '@/lib/bgg-config';
import type { GameAttributes, TargetGame } from './types';
import { LAUNCH_DATE, RIGA_TIMEZONE } from './types';
import { logger } from '@/lib/logger';

// =============================================================================
// CONSTANTS
// =============================================================================

const PUZZLE_SALT = process.env.PLAY_PUZZLE_SALT || 'galda-spele-default-salt';
const BGG_API_URL = 'https://boardgamegeek.com/xmlapi2';

// Eligibility criteria
const MIN_RATING = 6.0;
const MIN_YEAR = 2000;

// Cache for eligible games (refreshed periodically)
let eligibleGamesCache: { ids: number[]; timestamp: number } | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// PUZZLE NUMBER CALCULATION
// =============================================================================

/**
 * Get the current puzzle number based on Europe/Riga timezone
 */
export function getPuzzleNumber(date: Date = new Date()): number {
  // Convert to Riga timezone
  const rigaDate = new Date(date.toLocaleString('en-US', { timeZone: RIGA_TIMEZONE }));

  // Calculate days since launch
  const launchTime = LAUNCH_DATE.getTime();
  const currentTime = new Date(
    rigaDate.getFullYear(),
    rigaDate.getMonth(),
    rigaDate.getDate()
  ).getTime();

  const daysSinceLaunch = Math.floor((currentTime - launchTime) / (1000 * 60 * 60 * 24));

  // Puzzle numbers start at 1
  return Math.max(1, daysSinceLaunch + 1);
}

/**
 * Get the date string for today in Riga timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  const rigaDate = new Date(now.toLocaleString('en-US', { timeZone: RIGA_TIMEZONE }));
  return rigaDate.toISOString().split('T')[0];
}

// =============================================================================
// ELIGIBLE GAMES
// =============================================================================

/**
 * Get list of eligible game IDs for puzzles
 */
async function getEligibleGameIds(): Promise<number[]> {
  // Check cache
  if (eligibleGamesCache && Date.now() - eligibleGamesCache.timestamp < CACHE_DURATION_MS) {
    return eligibleGamesCache.ids;
  }

  // Query eligible games
  const { data, error } = await supabase
    .from('games')
    .select('id')
    .eq('is_expansion', false)
    .gte('bayesaverage', MIN_RATING)
    .gte('yearpublished', MIN_YEAR)
    .not('image', 'is', null)
    .order('bayesaverage', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('Failed to fetch eligible games:', error);
    throw new Error('Failed to fetch eligible games');
  }

  const ids = (data || []).map((g) => g.id);

  // Update cache
  eligibleGamesCache = { ids, timestamp: Date.now() };

  logger.info({ eligibleGameCount: ids.length }, 'Loaded eligible games for puzzles');
  return ids;
}

// =============================================================================
// DETERMINISTIC GAME SELECTION
// =============================================================================

/**
 * Select a game ID deterministically based on puzzle number
 */
async function selectGameId(puzzleNumber: number): Promise<number> {
  const eligibleIds = await getEligibleGameIds();

  if (eligibleIds.length === 0) {
    throw new Error('No eligible games found');
  }

  // Deterministic hash
  const hash = createHash('sha256')
    .update(`${puzzleNumber}-${PUZZLE_SALT}`)
    .digest('hex');

  const index = parseInt(hash.slice(0, 8), 16) % eligibleIds.length;

  return eligibleIds[index];
}

// =============================================================================
// BGG DATA ENRICHMENT
// =============================================================================

interface BGGExtendedData {
  weight: number;
  categories: string[];
  mechanics: string[];
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
}

/**
 * Fetch weight, categories, and mechanics from BGG API
 * With retry logic and better error handling
 */
async function fetchBGGExtendedData(gameId: number, retries = 3): Promise<BGGExtendedData> {
  const url = `${BGG_API_URL}/thing?id=${gameId}&stats=1`;

  logger.debug({ gameId }, 'Fetching BGG extended data');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: createBGGHeaders(),
      });

      if (!response.ok) {
        logger.warn({ gameId, status: response.status, attempt }, 'BGG API HTTP error');
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw new Error(`BGG API error: ${response.status}`);
      }

      const xml = await response.text();

      // BGG sometimes returns empty or "please wait" responses
      if (xml.includes('Please try again') || xml.length < 100) {
        logger.debug({ gameId, attempt }, 'BGG API rate limited, retrying');
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error('BGG API rate limited');
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });

      const result = parser.parse(xml);
      const item = result?.items?.item;

      if (!item) {
        logger.error({ gameId }, 'Game not found in BGG response');
        throw new Error(`Game ${gameId} not found in BGG`);
      }

      // Parse weight (averageweight from statistics)
      const weight = parseFloat(item.statistics?.ratings?.averageweight?.['@_value'] || '0');

      // Parse player counts
      const minPlayers = parseInt(item.minplayers?.['@_value'] || '1', 10);
      const maxPlayers = parseInt(item.maxplayers?.['@_value'] || '1', 10);

      // Parse playing time (use playingtime, or average of min/max)
      const playingTime = parseInt(item.playingtime?.['@_value'] || '60', 10);

      // Parse links for categories and mechanics
      const links = item.link ? (Array.isArray(item.link) ? item.link : [item.link]) : [];

      const categories = links
        .filter((l: { '@_type': string; '@_value': string }) => l['@_type'] === 'boardgamecategory')
        .map((l: { '@_type': string; '@_value': string }) => l['@_value']);

      const mechanics = links
        .filter((l: { '@_type': string; '@_value': string }) => l['@_type'] === 'boardgamemechanic')
        .map((l: { '@_type': string; '@_value': string }) => l['@_value']);

      logger.info(
        { gameId, weight, minPlayers, maxPlayers, playingTime, categoryCount: categories.length, mechanicCount: mechanics.length },
        'BGG extended data fetched successfully'
      );
      return { weight, categories, mechanics, minPlayers, maxPlayers, playingTime };

    } catch (error) {
      logger.warn({ gameId, attempt, error }, 'BGG API attempt failed');
      if (attempt === retries) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('BGG fetch failed after all retries');
}

// =============================================================================
// PUZZLE MANAGEMENT
// =============================================================================

interface DailyPuzzle {
  puzzleNumber: number;
  gameId: number;
  weight: number;
  categories: string[];
  mechanics: string[];
}

/**
 * Get or create today's puzzle
 */
export async function getOrCreateDailyPuzzle(puzzleNumber: number): Promise<DailyPuzzle> {
  logger.info({ puzzleNumber }, 'Getting daily puzzle');

  // Try to get existing puzzle
  const { data: existing, error: fetchError } = await supabase
    .from('play_daily_puzzles')
    .select('*')
    .eq('puzzle_number', puzzleNumber)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected for new puzzles
    logger.error({ puzzleNumber, error: fetchError }, 'Error fetching puzzle');
  }

  if (existing) {
    logger.debug({ puzzleNumber, gameId: existing.game_id }, 'Found existing puzzle');
    return {
      puzzleNumber: existing.puzzle_number,
      gameId: existing.game_id,
      weight: parseFloat(existing.bgg_weight?.toString() || '0'),
      categories: existing.bgg_categories || [],
      mechanics: existing.bgg_mechanics || [],
    };
  }

  // Generate new puzzle
  logger.info({ puzzleNumber }, 'Generating new puzzle');

  const gameId = await selectGameId(puzzleNumber);
  logger.info({ puzzleNumber, gameId }, 'Selected game for puzzle');

  const bggData = await fetchBGGExtendedData(gameId);
  logger.debug({ gameId }, 'Fetched BGG data');

  // Insert using service role (bypasses RLS)
  const serviceClient = createServiceClient();

  const { error: insertError } = await serviceClient
    .from('play_daily_puzzles')
    .insert({
      puzzle_number: puzzleNumber,
      game_id: gameId,
      bgg_weight: bggData.weight,
      bgg_categories: bggData.categories,
      bgg_mechanics: bggData.mechanics,
    });

  if (insertError) {
    logger.error({ puzzleNumber, gameId, error: insertError }, 'Failed to insert puzzle');
    throw new Error(`Failed to create puzzle: ${insertError.message}`);
  }

  logger.info({ puzzleNumber, gameId }, 'Created puzzle');

  return {
    puzzleNumber,
    gameId,
    weight: bggData.weight,
    categories: bggData.categories,
    mechanics: bggData.mechanics,
  };
}

// =============================================================================
// GAME ATTRIBUTE FETCHING
// =============================================================================

/**
 * Get full game attributes for feedback calculation
 */
export async function getGameAttributes(gameId: number): Promise<GameAttributes | null> {
  logger.debug({ gameId }, 'Getting attributes for guessed game');

  // Get basic info from our database
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, name, yearpublished, player_count, playing_time, thumbnail, image')
    .eq('id', gameId)
    .single();

  if (gameError) {
    logger.error({ gameId, error: gameError }, 'Error fetching game');
    return null;
  }

  if (!game) {
    logger.warn({ gameId }, 'Game not found in database');
    return null;
  }

  logger.debug({ gameId, gameName: game.name }, 'Found game');

  // Fetch extended BGG data (includes player count, play time, weight, categories, mechanics)
  const bggData = await fetchBGGExtendedData(gameId);

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearpublished || 2000,
    minPlayers: bggData.minPlayers,
    maxPlayers: bggData.maxPlayers,
    playingTimeMinutes: bggData.playingTime,
    weight: bggData.weight,
    categories: bggData.categories,
    mechanics: bggData.mechanics,
    thumbnail: game.thumbnail,
    image: game.image,
  };
}

/**
 * Get target game attributes from cached puzzle data
 */
export async function getTargetGameAttributes(
  puzzleNumber: number
): Promise<GameAttributes | null> {
  const puzzle = await getOrCreateDailyPuzzle(puzzleNumber);

  // Get basic info from our database
  const { data: game } = await supabase
    .from('games')
    .select('id, name, yearpublished, thumbnail, image')
    .eq('id', puzzle.gameId)
    .single();

  if (!game) {
    return null;
  }

  // Fetch player count and play time from BGG API (these aren't cached in puzzle table yet)
  const bggData = await fetchBGGExtendedData(puzzle.gameId);

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearpublished || 2000,
    minPlayers: bggData.minPlayers,
    maxPlayers: bggData.maxPlayers,
    playingTimeMinutes: bggData.playingTime,
    weight: puzzle.weight,
    categories: puzzle.categories,
    mechanics: puzzle.mechanics,
    thumbnail: game.thumbnail,
    image: game.image,
  };
}

/**
 * Get target game info for reveal (with full attributes for comparison)
 */
export async function getTargetGameInfo(puzzleNumber: number): Promise<TargetGame | null> {
  const puzzle = await getOrCreateDailyPuzzle(puzzleNumber);

  const { data: game } = await supabase
    .from('games')
    .select('id, name, yearpublished, player_count, playing_time, thumbnail, image')
    .eq('id', puzzle.gameId)
    .single();

  if (!game) {
    return null;
  }

  // Fetch player count and play time from BGG API for accurate data
  const bggData = await fetchBGGExtendedData(puzzle.gameId);

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearpublished || 2000,
    playerCount: `${bggData.minPlayers}-${bggData.maxPlayers}`,
    maxPlayers: bggData.maxPlayers,
    playingTime: `${bggData.playingTime} min`,
    playingTimeMinutes: bggData.playingTime,
    weight: puzzle.weight,
    categories: puzzle.categories,
    mechanics: puzzle.mechanics,
    image: game.image,
    thumbnail: game.thumbnail,
  };
}
