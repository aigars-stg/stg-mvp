/**
 * Listing types matching the database schema
 */

export type ListingStatus = 'draft' | 'active' | 'sold' | 'removed';
export type ListingCondition = 'likeNew' | 'veryGood' | 'good' | 'acceptable';
export type ListingType = 'instant_buy' | 'contact_seller' | 'auction';
export type AuctionDuration = 1 | 3 | 5 | 7;

// Expansion included with a listing (bundled with base game)
export interface IncludedExpansion {
  bgg_id: number;
  name: string;
  year: number | null;
  // Version info
  version_source: 'bgg' | 'manual';
  bgg_version_id: number | null;
  version_name: string | null;
  language: string | null;
  publisher: string | null;
  // Images
  thumbnail: string | null;
  image: string | null;
}

export interface Listing {
  id: string;

  // Game Reference
  bgg_game_id: number;
  game_name: string;
  game_year: number | null;

  // Version/Language/Publisher
  version_source: 'bgg' | 'manual';
  bgg_version_id: number | null;
  version_name: string | null;
  publisher: string | null;
  language: string | null;
  edition_year: number | null;

  // Photos
  photo_urls: string[];

  // Condition
  condition: ListingCondition;
  condition_notes: string | null;
  all_components_present: boolean;
  missing_components: string | null;

  // Pricing
  price: number;
  previous_price: number | null; // For showing "Price Reduced" indicators

  // Shipping
  shipping_local_pickup: boolean;
  shipping_parcel_locker: boolean;
  shipping_notes: string | null;

  // Expansions (bundled with base game)
  included_expansions: IncludedExpansion[];

  // Metadata
  seller_id: string;
  status: ListingStatus;
  listing_type: ListingType;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  removed_at: string | null;

  // Reservation fields
  reserved_by: string | null;
  reserved_until: string | null;

  // Auction fields (only present when listing_type === 'auction')
  auction_start_price?: number;
  auction_current_bid?: number | null;
  auction_bid_count?: number;
  auction_ends_at?: string;
  auction_duration_days?: AuctionDuration;
  auction_winner_id?: string | null;
  auction_winner_notified_at?: string | null;
  auction_payment_deadline?: string | null;
  auction_anti_snipe_extended?: boolean;
}

// Listing with seller profile and game images populated
export interface ListingWithSeller extends Listing {
  game: {
    thumbnail: string | null;
    image: string | null;
    player_count?: string | null;
    min_age?: number | null;
    playing_time?: string | null;
    is_expansion?: boolean | null;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    country: string | null;
    // Trust fields (from seller_profiles)
    total_reviews?: number;
    average_rating?: number;
    total_completed_sales?: number;
    member_since?: string | null;
  };
}

// Saved listing
export interface SavedListing {
  id: string;
  user_id: string;
  listing_id: string;
  saved_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Saved listing with full listing details
export interface SavedListingWithDetails extends SavedListing {
  listing: ListingWithSeller;
}

// Helper functions
export function getConditionLabel(condition: ListingCondition): string {
  const labels: Record<ListingCondition, string> = {
    likeNew: 'Like New',
    veryGood: 'Very Good',
    good: 'Good',
    acceptable: 'Acceptable',
  };
  return labels[condition];
}

export function getConditionColor(condition: ListingCondition): string {
  const colors: Record<ListingCondition, string> = {
    likeNew: 'text-aurora-green',
    veryGood: 'text-frost-ice',
    good: 'text-aurora-yellow',
    acceptable: 'text-text-secondary',
  };
  return colors[condition];
}

export function getConditionIcon(condition: ListingCondition): string {
  const icons: Record<ListingCondition, string> = {
    likeNew: '📦',
    veryGood: '✨',
    good: '🎲',
    acceptable: '🔧',
  };
  return icons[condition];
}

export function getStatusLabel(status: ListingStatus): string {
  const labels: Record<ListingStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    sold: 'Sold',
    removed: 'Removed',
  };
  return labels[status];
}

export function getListingTypeLabel(type: ListingType): string {
  const labels: Record<ListingType, string> = {
    instant_buy: 'Instant Buy',
    contact_seller: 'Contact Seller',
    auction: 'Auction',
  };
  return labels[type];
}

export function isContactSellerListing(listing: { listing_type?: ListingType }): boolean {
  return listing.listing_type === 'contact_seller';
}

export function isAuctionListing(listing: { listing_type?: ListingType }): boolean {
  return listing.listing_type === 'auction';
}

// Bid interface
export interface Bid {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  is_winning: boolean;
  triggered_extension: boolean;
  extension_minutes: number | null;
  created_at: string;
}

// Bid with bidder info for display
export interface BidWithBidder extends Bid {
  bidder: {
    display_name: string;
    country: string | null;
  };
}

// Notification interface
export interface Notification {
  id: string;
  user_id: string;
  type: 'outbid' | 'auction_won' | 'auction_expired' | 'second_chance' | 'payment_reminder' | 'auction_ending';
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

// Auction helper functions
export function getAuctionTimeRemaining(endsAt: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isEnded: boolean;
  isEndingSoon: boolean;
} {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isEnded: true, isEndingSoon: false };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diff,
    isEnded: false,
    isEndingSoon: diff <= 5 * 60 * 1000, // 5 minutes
  };
}

export function getMinimumBid(listing: Listing): number {
  if (!isAuctionListing(listing)) return listing.price;

  if (listing.auction_current_bid && listing.auction_current_bid > 0) {
    return listing.auction_current_bid + 1; // EUR 1.00 increment
  }
  return listing.auction_start_price || listing.price;
}

export function getAuctionDurationLabel(days: AuctionDuration): string {
  const labels: Record<AuctionDuration, string> = {
    1: '1 day',
    3: '3 days',
    5: '5 days',
    7: '7 days',
  };
  return labels[days];
}

export function formatAuctionTimeRemaining(time: ReturnType<typeof getAuctionTimeRemaining>): string {
  if (time.isEnded) return 'Ended';

  const parts: string[] = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  if (time.hours > 0 || time.days > 0) parts.push(`${time.hours}h`);
  if (time.minutes > 0 || time.hours > 0 || time.days > 0) parts.push(`${time.minutes}m`);
  if (time.days === 0) parts.push(`${time.seconds}s`);

  return parts.join(' ');
}
