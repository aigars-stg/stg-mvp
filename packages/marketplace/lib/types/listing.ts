/**
 * Listing types matching the database schema
 */

export type ListingStatus = 'draft' | 'active' | 'sold' | 'removed';
export type ListingCondition = 'likeNew' | 'veryGood' | 'good' | 'acceptable';

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
  currency: string;

  // Shipping
  shipping_local_pickup: boolean;
  shipping_parcel_locker: boolean;
  shipping_notes: string | null;

  // Metadata
  seller_id: string;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
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
  };
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
