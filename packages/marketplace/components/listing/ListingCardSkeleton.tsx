import { Card } from '@second-turn/design-system';

/**
 * Skeleton loading state for ListingCard
 * Matches the dimensions and structure of the actual ListingCard
 */
export function ListingCardSkeleton() {
  return (
    <Card
      variant="default"
      padding="none"
      className="overflow-hidden h-full flex flex-col animate-pulse"
    >
      {/* Image Skeleton */}
      <div className="relative h-64 bg-polar-night/5">
        <div className="absolute inset-0 bg-gradient-to-br from-polar-night/10 to-polar-night/5" />

        {/* Condition Badge Skeleton */}
        <div className="absolute top-3 left-3">
          <div className="h-6 w-24 bg-polar-night/10 rounded-2xl" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col flex-grow space-y-3">
        {/* Title Skeleton (2 lines) */}
        <div className="space-y-2">
          <div className="h-5 bg-polar-night/10 rounded w-full" />
          <div className="h-5 bg-polar-night/10 rounded w-3/4" />
        </div>

        {/* Metadata Skeleton */}
        <div className="flex gap-3">
          <div className="h-4 bg-polar-night/10 rounded w-16" />
          <div className="h-4 bg-polar-night/10 rounded w-16" />
        </div>

        {/* Publisher/Language Skeleton */}
        <div className="h-4 bg-polar-night/10 rounded w-5/6" />

        {/* Price & Condition Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-8 bg-polar-night/10 rounded w-20" />
          <div className="h-6 bg-polar-night/10 rounded-2xl w-24" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Seller Info Skeleton */}
        <div className="pt-3 border-t border-border-subtle space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-polar-night/10" />
            <div className="h-4 bg-polar-night/10 rounded w-24" />
          </div>

          {/* Buy Button Skeleton */}
          <div className="h-11 bg-polar-night/10 rounded-md w-full" />
        </div>
      </div>
    </Card>
  );
}
