/**
 * Wanted Listing (ISO) types matching the database schema
 */

import { ListingCondition } from './listing';

export type WantedListingStatus = 'active' | 'expired' | 'fulfilled' | 'cancelled';

export interface WantedListing {
  id: string;

  // Game Reference
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;

  // Version/Edition Information
  version_source: string;
  bgg_version_id: number | null;
  version_name: string | null;
  publisher: string | null;
  language: string | null;
  edition_year: number | null;
  version_thumbnail: string | null;
  version_image: string | null;

  // Budget Information
  min_price: number | null;
  max_price: number;
  currency: string;

  // Preferences
  acceptable_conditions: ListingCondition[];
  preferred_language: string | null; // Deprecated: use language field instead
  location_preferences: string | null;
  notes: string | null;

  // Buyer & Status
  buyer_id: string;
  status: WantedListingStatus;

  // Response Tracking
  response_count: number;

  // Expiration
  expires_at: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// Wanted listing with buyer profile and game details populated
export interface WantedListingWithDetails extends WantedListing {
  game: {
    thumbnail: string | null;
    image: string | null;
    player_count?: string | null;
    min_age?: number | null;
    playing_time?: string | null;
    is_expansion?: boolean | null;
  };
  buyer: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    country: string | null;
  };
  responses?: WantedListingResponse[];
}

// Seller response to a wanted listing
export interface WantedListingResponse {
  id: string;
  wanted_listing_id: string;
  seller_id: string;
  conversation_id: string;

  // Offer Details
  offered_price: number;
  offered_condition: ListingCondition;
  response_notes: string | null;

  // Response Metadata
  responded_at: string;
  is_quick_response: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

// Response with seller profile populated
export interface WantedListingResponseWithSeller extends WantedListingResponse {
  seller: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    country: string | null;
  };
}

// For browse/listing view - lightweight version
export interface WantedListingCard {
  id: string;
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;
  version_name: string | null;
  publisher: string | null;
  language: string | null;
  edition_year: number | null;
  version_thumbnail: string | null;
  version_image: string | null;
  min_price: number | null;
  max_price: number;
  currency: string;
  acceptable_conditions: ListingCondition[];
  location_preferences: string | null;
  response_count: number;
  expires_at: string;
  created_at: string;
  status: WantedListingStatus;
  game_thumbnail: string | null;
  game_image: string | null;
  buyer_name: string;
  buyer_country: string | null;
}

// Helper functions
export function getWantedStatusLabel(status: WantedListingStatus): string {
  const labels: Record<WantedListingStatus, string> = {
    active: 'Active',
    expired: 'Expired',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

export function getWantedStatusColor(status: WantedListingStatus): string {
  const colors: Record<WantedListingStatus, string> = {
    active: 'text-aurora-green',
    expired: 'text-text-secondary',
    fulfilled: 'text-frost-ice',
    cancelled: 'text-aurora-red',
  };
  return colors[status];
}

export function getWantedStatusBadgeColor(status: WantedListingStatus): string {
  const colors: Record<WantedListingStatus, string> = {
    active: 'bg-aurora-green/10 text-aurora-green border-aurora-green/20',
    expired: 'bg-surface-2 text-text-secondary border-text-disabled',
    fulfilled: 'bg-frost-ice/10 text-frost-ice border-frost-ice/20',
    cancelled: 'bg-aurora-red/10 text-aurora-red border-aurora-red/20',
  };
  return colors[status];
}

export function getBudgetDisplay(
  minPrice: number | null,
  maxPrice: number,
  currency: string = 'EUR'
): string {
  const currencySymbol = currency === 'EUR' ? '€' : currency;
  if (minPrice === null || minPrice === 0) {
    return `Up to ${currencySymbol}${maxPrice}`;
  }
  return `${currencySymbol}${minPrice}–${currencySymbol}${maxPrice}`;
}

export function getTimeRemaining(expiresAt: string): {
  days: number;
  hours: number;
  isExpiringSoon: boolean; // Less than 5 days
  isExpired: boolean;
} {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, isExpiringSoon: false, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return {
    days,
    hours,
    isExpiringSoon: days < 5,
    isExpired: false,
  };
}

export function getTimeRemainingDisplay(expiresAt: string): string {
  const { days, hours, isExpired } = getTimeRemaining(expiresAt);

  if (isExpired) {
    return 'Expired';
  }

  if (days === 0) {
    return `${hours}h remaining`;
  }

  if (days === 1) {
    return '1 day remaining';
  }

  return `${days} days remaining`;
}

export function getResponseLimitDisplay(responseCount: number): {
  text: string;
  isNearLimit: boolean; // 7 or more
  isAtLimit: boolean; // 10
} {
  const isNearLimit = responseCount >= 7;
  const isAtLimit = responseCount >= 10;

  return {
    text: `${responseCount}/10 sellers responded`,
    isNearLimit,
    isAtLimit,
  };
}

// Validation helpers
export function canExtendWantedListing(wantedListing: WantedListing): boolean {
  return wantedListing.status === 'active' || wantedListing.status === 'expired';
}

export function canCancelWantedListing(wantedListing: WantedListing): boolean {
  return wantedListing.status === 'active';
}

export function canMarkAsFulfilled(wantedListing: WantedListing): boolean {
  return wantedListing.status === 'active' && wantedListing.response_count > 0;
}
