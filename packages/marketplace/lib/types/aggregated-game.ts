/**
 * Aggregated game types for browse page
 * Groups multiple listings for the same game
 */

import type { ListingCondition, ListingWithSeller } from './listing';
import type { WantedListingWithDetails } from './wanted-listing';

/**
 * Aggregated game data for browse page display
 * Groups listings by game, shows split pricing by type
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

  // Split pricing by listing type
  instant_buy_lowest_price: number | null;  // Lowest from non-auction listings (instant_buy + contact_seller)
  auction_lowest_price: number | null;      // Lowest current_bid or start_price from auctions

  // Counts by listing type (for icon strip tooltips)
  instant_buy_count: number;       // transaction_method='instant_buy' AND pricing_format='fixed_price'
  contact_seller_count: number;    // transaction_method='contact_seller'
  auction_count: number;           // pricing_format='auction'

  // Content signals
  has_bundled_expansions: boolean;  // Any listing includes expansions
  has_expansion_listings: boolean;  // Expansion offers grouped under this base game

  // Available options across all offers
  conditions: ListingCondition[];
  languages: string[];  // Languages available from listings
  seller_countries: string[];
  has_local_pickup: boolean;
  has_parcel_shipping: boolean;
  has_auction: boolean;  // Whether any offers are auctions
  auction_soonest_ends_at: string | null;  // Earliest non-expired auction end time
  auction_ended_count: number;  // Auctions that have ended (auction_ends_at in the past)

  // Featured offer (lowest non-auction price, or lowest auction if auction-only)
  featured_listing_id: string;
  featured_seller: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    country: string | null;
  };

  // Most recent listing date (for sorting by newest)
  newest_listing_date: string | null;
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
  description: string | null;
  designers: string[] | null;
  rating: number | null;

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
  wantedListings?: WantedListingWithDetails[];
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
