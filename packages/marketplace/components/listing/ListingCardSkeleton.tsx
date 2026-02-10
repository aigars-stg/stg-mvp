import { Card } from '@second-turn/design-system';

/**
 * Skeleton loading state for ListingCard
 * Matches the dimensions and structure of the compact ListingCard
 */
export function ListingCardSkeleton() {
  return (
    <Card
      variant="standard"
      padding="none"
      className="overflow-hidden h-full flex flex-col animate-pulse"
    >
      {/* Image Skeleton */}
      <div className="relative h-40 sm:h-44 lg:h-48 bg-polar-night/5">
        <div className="absolute inset-0 bg-gradient-to-br from-polar-night/10 to-polar-night/5" />

        {/* Condition Badge Skeleton - top right */}
        <div className="absolute top-3 right-3">
          <div className="h-5 w-16 bg-polar-night/20 rounded-2xl" />
        </div>

        {/* Image counter skeleton - bottom right */}
        <div className="absolute bottom-3 right-3">
          <div className="h-5 w-10 bg-polar-night/20 rounded-md" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col flex-grow space-y-2">
        {/* Title Skeleton */}
        <div className="space-y-1.5 min-h-[2.5rem]">
          <div className="h-5 bg-polar-night/10 rounded w-full" />
          <div className="h-5 bg-polar-night/10 rounded w-2/3" />
        </div>

        {/* Metadata Skeleton */}
        <div className="flex gap-2">
          <div className="h-4 bg-polar-night/10 rounded w-12" />
          <div className="h-4 bg-polar-night/10 rounded w-10" />
          <div className="h-4 bg-polar-night/10 rounded w-14" />
        </div>

        {/* Language Skeleton */}
        <div className="h-4 bg-polar-night/10 rounded w-20" />

        {/* Price Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-7 bg-polar-night/10 rounded w-20" />
          <div className="h-5 bg-polar-night/10 rounded w-14" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Location + Shipping Skeleton */}
        <div className="pt-2 border-t border-border-subtle space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-polar-night/10 rounded" />
            <div className="h-4 bg-polar-night/10 rounded w-16" />
            <div className="w-1 h-4 bg-polar-night/10 rounded" />
            <div className="h-4 bg-polar-night/10 rounded w-20" />
          </div>

        </div>
      </div>
    </Card>
  );
}
