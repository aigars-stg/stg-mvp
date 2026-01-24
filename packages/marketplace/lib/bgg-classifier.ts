// BGG Game Type Classification
// Handles the critical issue of expansions being marked as "boardgame" type

import type { BGGGameMetadata } from './bgg-types';

/**
 * Determines if a game is an expansion using two-step classification:
 * 1. Check explicit type field
 * 2. Check inbound expansion/integration links (critical for accuracy)
 *
 * Why this matters: BGG's search API incorrectly marks many expansions as
 * type="boardgame". The only reliable way to detect expansions is to check
 * the inbound links from other games.
 *
 * Example: "Catan: Cities & Knights" has type="boardgame" in search results
 * but has inbound links of type="boardgameexpansion" from base Catan.
 */
export function isExpansion(metadata: BGGGameMetadata): boolean {
  // Step 1: Check explicit type (catches most obvious cases)
  if (metadata.type === 'boardgameexpansion') {
    return true;
  }

  // Step 2: Check inbound expansion links (critical for false positives)
  const hasExpansionLinks = metadata.inboundLinks.some(
    (link) =>
      link.type === 'boardgameexpansion' ||
      link.type === 'boardgameintegration'
  );

  if (hasExpansionLinks) {
    return true;
  }

  // Step 3: Check if it expands another game (outbound expansion links)
  const expandsAnotherGame = metadata.outboundLinks.some(
    (link) => link.type === 'boardgameexpansion'
  );

  return expandsAnotherGame;
}

/**
 * Determines if a game is a standalone expansion or variant
 * These can be played without the base game but are still expansions
 */
export function isStandaloneExpansion(metadata: BGGGameMetadata): boolean {
  const hasStandaloneLink = metadata.inboundLinks.some(
    (link) => link.type === 'boardgameintegration'
  );

  const hasExpansionLink = metadata.inboundLinks.some(
    (link) => link.type === 'boardgameexpansion'
  );

  return hasStandaloneLink && hasExpansionLink;
}

/**
 * Determines if a game is a compilation or bundle
 * These contain multiple games in one box
 */
export function isCompilation(metadata: BGGGameMetadata): boolean {
  return (
    metadata.type === 'boardgamecompilation' ||
    metadata.inboundLinks.some((link) => link.type === 'boardgamecompilation')
  );
}

/**
 * Classifies game type with detailed reasoning
 * Returns human-readable classification
 */
export function classifyGame(metadata: BGGGameMetadata): {
  type: 'base' | 'expansion' | 'standalone-expansion' | 'compilation';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  // Compilation check
  if (isCompilation(metadata)) {
    return {
      type: 'compilation',
      confidence: 'high',
      reason: 'Game is marked as a compilation or contains multiple games',
    };
  }

  // Standalone expansion check
  if (isStandaloneExpansion(metadata)) {
    return {
      type: 'standalone-expansion',
      confidence: 'high',
      reason: 'Game can be played standalone but expands another game',
    };
  }

  // Expansion check
  if (isExpansion(metadata)) {
    const expansionLinks = metadata.inboundLinks.filter(
      (link) =>
        link.type === 'boardgameexpansion' || link.type === 'boardgameintegration'
    );

    if (expansionLinks.length > 0) {
      return {
        type: 'expansion',
        confidence: 'high',
        reason: `Expands: ${expansionLinks.map((l) => l.value).join(', ')}`,
      };
    }

    return {
      type: 'expansion',
      confidence: 'medium',
      reason: 'Marked as expansion type',
    };
  }

  // Base game (default)
  if (metadata.type === 'boardgame' && metadata.inboundLinks.length === 0) {
    return {
      type: 'base',
      confidence: 'high',
      reason: 'No expansion links found',
    };
  }

  return {
    type: 'base',
    confidence: 'medium',
    reason: 'Assumed to be base game',
  };
}

/** Game with metadata and optional additional properties */
interface GameWithMetadata {
  metadata: BGGGameMetadata;
  [key: string]: unknown;
}

/**
 * Filters search results to only base games
 * Removes expansions, compilations, and standalone expansions
 */
export function filterToBaseGames(
  games: GameWithMetadata[]
): GameWithMetadata[] {
  return games.filter((game) => {
    const classification = classifyGame(game.metadata);
    return classification.type === 'base';
  });
}

/**
 * Explains why a game was filtered out
 * Useful for debugging and user feedback
 */
export function getFilterReason(metadata: BGGGameMetadata): string | null {
  const classification = classifyGame(metadata);

  if (classification.type === 'base') {
    return null; // Not filtered
  }

  const reasons: Record<typeof classification.type, string> = {
    expansion: 'This is an expansion and requires the base game to play',
    'standalone-expansion': 'This is a standalone expansion',
    compilation: 'This is a compilation of multiple games',
  };

  return reasons[classification.type];
}
