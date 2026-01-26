'use client';

/**
 * Loading skeleton for CartItemCard
 * Matches the structure of the cart item for smooth loading transitions
 */
export function CartItemCardSkeleton() {
  return (
    <div className="bg-snow-white animate-pulse">
      {/* Mobile Layout */}
      <div className="sm:hidden">
        {/* Image placeholder */}
        <div className="h-44 bg-bg-secondary" />

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-grow space-y-2">
              {/* Game name */}
              <div className="h-5 bg-bg-secondary rounded w-3/4" />
              <div className="h-5 bg-bg-secondary rounded w-1/2" />

              {/* Badges */}
              <div className="flex gap-2">
                <div className="h-5 bg-bg-secondary rounded w-16" />
                <div className="h-5 bg-bg-secondary rounded w-20" />
              </div>

              {/* Language icons */}
              <div className="h-4 bg-bg-secondary rounded w-20" />
            </div>

            {/* Price */}
            <div className="h-6 bg-bg-secondary rounded w-16" />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex gap-4 p-5">
        {/* Image */}
        <div className="flex-shrink-0 w-32 h-32 bg-bg-secondary rounded-lg" />

        {/* Content */}
        <div className="flex-grow space-y-2">
          {/* Game name */}
          <div className="h-5 bg-bg-secondary rounded w-2/3" />

          {/* Badges */}
          <div className="flex gap-2">
            <div className="h-5 bg-bg-secondary rounded w-16" />
            <div className="h-5 bg-bg-secondary rounded w-20" />
            <div className="h-4 bg-bg-secondary rounded w-16" />
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-end justify-between">
          <div className="h-7 bg-bg-secondary rounded w-20" />
          <div className="h-9 w-9 bg-bg-secondary rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for an entire cart basket
 */
export function CartBasketSkeleton() {
  return (
    <div className="bg-snow-white border-2 border-border rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-b border-border-subtle">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-bg-secondary rounded-xl" />
            <div className="space-y-2">
              <div className="h-5 bg-bg-secondary rounded w-32" />
              <div className="h-4 bg-bg-secondary rounded w-20" />
            </div>
          </div>
          {/* Timer */}
          <div className="h-7 bg-bg-secondary rounded w-24" />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border-subtle">
        <CartItemCardSkeleton />
        <CartItemCardSkeleton />
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 bg-bg-elevated border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Summary */}
          <div className="space-y-2 max-w-xs">
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-24" />
              <div className="h-4 bg-bg-secondary rounded w-16" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-16" />
              <div className="h-4 bg-bg-secondary rounded w-12" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-bg-secondary rounded w-20" />
              <div className="h-4 bg-bg-secondary rounded w-12" />
            </div>
            <div className="border-t border-border-subtle pt-2">
              <div className="flex justify-between">
                <div className="h-5 bg-bg-secondary rounded w-12" />
                <div className="h-6 bg-bg-secondary rounded w-20" />
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="h-12 bg-bg-secondary rounded-lg w-full sm:w-32" />
        </div>
      </div>
    </div>
  );
}
