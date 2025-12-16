/**
 * Aggregated game types for browse page
 * Groups multiple listings for the same game
 */

import type { ListingCondition, ListingWithSeller } from './listing';

/**
 * Aggregated game data for browse page display
 * Shows "From €X" pricing and offer count
 */
export interface AggregatedGame {
  // Game identification
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;

  // Game metadata from BGG
  image: string | null;
  thumbnail: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean;

  // Aggregated offer statistics
  offer_count: number;
  lowest_price: number;
  highest_price: number;

  // Available options across all offers
  conditions: ListingCondition[];
  languages: string[];  // Languages available from listings
  seller_countries: string[];
  has_local_pickup: boolean;
  has_parcel_shipping: boolean;

  // Featured offer (lowest price)
  featured_listing_id: string;
  featured_seller: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    country: string | null;
  };
}

/**
 * Full game details with all offers
 * Used on the /game/[bgg_id] page
 */
export interface GameWithOffers {
  // Game identification
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;

  // Game metadata from BGG
  image: string | null;
  thumbnail: string | null;
  player_count: string | null;
  min_age: number | null;
  playing_time: string | null;
  is_expansion: boolean;

  // All available offers for this game
  offers: ListingWithSeller[];

  // Aggregated statistics
  offer_count: number;
  lowest_price: number;
  highest_price: number;
}

/**
 * API response for paginated aggregated games
 */
export interface AggregatedGamesResponse {
  games: AggregatedGame[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * API response for game with offers
 */
export interface GameOffersResponse {
  game: GameWithOffers;
}

/**
 * Query parameters for aggregated games API
 */
export interface AggregatedGamesQuery {
  page?: number;
  limit?: number;
  search?: string;
  condition?: ListingCondition | ListingCondition[];
  minPrice?: number;
  maxPrice?: number;
  country?: string;
  minPlayers?: number;
  maxPlayers?: number;
  minAge?: number;
  maxPlayTime?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'offers' | 'name';
  includeExpansions?: boolean;
}
