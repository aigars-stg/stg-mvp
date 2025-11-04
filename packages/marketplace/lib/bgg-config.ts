/**
 * BGG API Configuration
 * Centralized configuration for BoardGameGeek API integration
 */

/**
 * Creates headers for BGG API requests with authentication
 * Automatically includes User-Agent and Authorization (if token is available)
 *
 * IMPORTANT: This should ONLY be called from server-side code (API routes, server components).
 * The BGG API token is server-side only and not exposed to the browser.
 */
export function createBGGHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'User-Agent': 'SecondTurnGames/1.0 (https://secondturn.games; aigars@secondturn.games)',
  };

  // Add Authorization header if token is available (server-side only)
  const token = process.env.BGG_API_TOKEN;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * BGG API Configuration constants
 * IMPORTANT: Only accessible from server-side code
 */
export const BGG_CONFIG = {
  /** Rate limit delay in milliseconds (default: 1000ms) */
  RATE_LIMIT_MS: parseInt(process.env.BGG_API_RATE_LIMIT_MS || '1000'),

  /** API token for authenticated requests (server-side only) */
  API_TOKEN: process.env.BGG_API_TOKEN,

  /** Base URL for BGG XML API v2 */
  API_BASE_URL: 'https://boardgamegeek.com/xmlapi2',
} as const;
