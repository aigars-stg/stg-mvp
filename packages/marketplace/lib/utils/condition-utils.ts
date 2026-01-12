/**
 * Condition utility functions for game listings
 *
 * Consolidated from:
 * - components/game/OfferCard.tsx
 * - components/listing/ListingCard.tsx
 */

/**
 * Badge variant type for condition badges
 */
export type ConditionBadgeVariant = 'likeNew' | 'veryGood' | 'good' | 'acceptable';

/**
 * Get the Badge variant for a given condition string
 *
 * @param condition - The condition string from the listing
 * @returns The corresponding Badge variant
 */
export function getConditionBadgeVariant(condition: string): ConditionBadgeVariant {
  switch (condition) {
    case 'likeNew':
      return 'likeNew';
    case 'veryGood':
      return 'veryGood';
    case 'good':
      return 'good';
    case 'acceptable':
      return 'acceptable';
    default:
      return 'acceptable';
  }
}
