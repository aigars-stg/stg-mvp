export default function GamePageLoading() {
  return (
    <div className="min-h-screen bg-bg-primary animate-pulse">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-3">
        <div className="h-4 w-32 bg-polar-night/10 rounded" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {/* Mobile: compact game card */}
        <div className="lg:hidden mb-4">
          <div className="bg-snow-white rounded-xl border border-border p-4">
            <div className="flex gap-3">
              <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-polar-night/10" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-5 bg-polar-night/10 rounded w-3/4" />
                <div className="h-3 bg-polar-night/10 rounded w-1/2" />
                <div className="h-3 bg-polar-night/10 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: game info panel */}
        <div className="hidden lg:flex gap-6 mb-8">
          <div className="w-40 h-40 flex-shrink-0 rounded-xl bg-polar-night/10" />
          <div className="flex-1 space-y-3">
            <div className="h-7 bg-polar-night/10 rounded w-2/3" />
            <div className="h-4 bg-polar-night/10 rounded w-1/3" />
            <div className="h-4 bg-polar-night/10 rounded w-1/4" />
          </div>
        </div>

        {/* Listings heading */}
        <div className="h-6 bg-polar-night/10 rounded w-40 mb-4" />

        {/* Listing cards */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-snow-white rounded-xl border border-border p-4">
              <div className="flex gap-3">
                <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-polar-night/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-polar-night/10 rounded w-1/2" />
                  <div className="h-4 bg-polar-night/10 rounded w-1/4" />
                  <div className="h-8 bg-polar-night/10 rounded w-28 mt-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
