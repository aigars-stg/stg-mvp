/**
 * Common Supabase query result types
 *
 * This file provides typed aliases for commonly used database table rows
 * and a typed Supabase client to eliminate `any` casts throughout the codebase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert, TablesUpdate } from './database.types';

// Typed Supabase client - use this instead of `any` for supabase parameters
export type TypedSupabase = SupabaseClient<Database>;

// Table row types (read operations)
export type BasketItemRow = Tables<'basket_items'>;
export type BasketRow = Tables<'baskets'>;
export type BidRow = Tables<'bids'>;
export type ConversationRow = Tables<'conversations'>;
export type GameRow = Tables<'games'>;
export type ListingRow = Tables<'listings'>;
export type ListingQuestionRow = Tables<'listing_questions'>;
export type MessageRow = Tables<'messages'>;
export type NotificationRow = Tables<'notifications'>;
export type OrderRow = Tables<'orders'>;
export type OrderItemRow = Tables<'order_items'>;
export type OrderIssueRow = Tables<'order_issues'>;
export type SavedListingRow = Tables<'saved_listings'>;
export type SellerProfileRow = Tables<'seller_profiles'>;
export type SellerReviewRow = Tables<'seller_reviews'>;
export type TrackingEventRow = Tables<'tracking_events'>;
export type UserProfileRow = Tables<'user_profiles'>;
export type WantedListingRow = Tables<'wanted_listings'>;
export type WantedListingResponseRow = Tables<'wanted_listing_responses'>;

// View row types
export type ListingWithDetailsRow = Tables<'listings_with_details'>;
export type PublicProfileRow = Tables<'public_profiles'>;
export type PublicSellerProfileRow = Tables<'public_seller_profiles'>;
export type SellerReviewsWithBuyerRow = Tables<'seller_reviews_with_buyer'>;

// Insert types (create operations)
export type ListingInsert = TablesInsert<'listings'>;
export type MessageInsert = TablesInsert<'messages'>;
export type OrderInsert = TablesInsert<'orders'>;
export type BidInsert = TablesInsert<'bids'>;
export type WantedListingInsert = TablesInsert<'wanted_listings'>;

// Update types (modify operations)
export type ListingUpdate = TablesUpdate<'listings'>;
export type OrderUpdate = TablesUpdate<'orders'>;
export type UserProfileUpdate = TablesUpdate<'user_profiles'>;
export type SellerProfileUpdate = TablesUpdate<'seller_profiles'>;

// Common composite types for API responses
export interface ListingWithSeller extends ListingRow {
  seller?: Pick<UserProfileRow, 'id' | 'full_name' | 'avatar_url' | 'country'> | null;
  game?: Pick<GameRow, 'id' | 'name' | 'thumbnail' | 'yearpublished'> | null;
}

export interface GameWithListings extends GameRow {
  listings?: ListingRow[];
}

// Re-export for convenience
export type { Database, Tables, TablesInsert, TablesUpdate };
