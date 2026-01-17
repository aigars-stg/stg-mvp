'use client';

import { Skeleton, SkeletonText, SkeletonAvatar, Card } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function SkeletonPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Skeleton</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Skeleton loaders provide visual placeholders while content is loading.
          They reduce perceived wait time and indicate where content will appear.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Skeletons create a smooth loading experience throughout the marketplace:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Listing cards:</strong> Show placeholder cards while games load on browse pages</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>User profiles:</strong> Display avatar and text placeholders during profile loads</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Product images:</strong> Show image shapes before photos fully load</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Basic Skeleton"
          description="Simple rectangular skeleton with pulse animation."
        >
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Skeleton Variants"
          description="Different shapes for different content types."
        >
          <div className="flex items-start gap-6 flex-wrap">
            <div className="text-center">
              <Skeleton variant="default" className="h-24 w-48 mb-2" />
              <span className="text-sm text-text-muted">Default</span>
            </div>
            <div className="text-center">
              <Skeleton variant="circular" className="h-16 w-16 mb-2" />
              <span className="text-sm text-text-muted">Circular</span>
            </div>
            <div className="text-center">
              <Skeleton variant="text" className="w-32 mb-2" />
              <span className="text-sm text-text-muted">Text</span>
            </div>
            <div className="text-center">
              <Skeleton variant="image" className="h-24 w-24 mb-2" />
              <span className="text-sm text-text-muted">Image</span>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Helper Components */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Helper Components</h2>

        <ComponentDemo
          title="SkeletonText"
          description="Pre-configured skeleton for text blocks with multiple lines."
        >
          <div className="space-y-6 max-w-md">
            <div>
              <p className="text-sm text-text-muted mb-2">3 lines (default)</p>
              <SkeletonText lines={3} />
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">5 lines</p>
              <SkeletonText lines={5} />
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="SkeletonAvatar"
          description="Pre-configured skeleton for avatar placeholders."
        >
          <div className="flex items-end gap-4 flex-wrap">
            <div className="text-center">
              <SkeletonAvatar size="xs" />
              <span className="text-xs text-text-muted mt-1 block">xs</span>
            </div>
            <div className="text-center">
              <SkeletonAvatar size="sm" />
              <span className="text-xs text-text-muted mt-1 block">sm</span>
            </div>
            <div className="text-center">
              <SkeletonAvatar size="md" />
              <span className="text-xs text-text-muted mt-1 block">md</span>
            </div>
            <div className="text-center">
              <SkeletonAvatar size="lg" />
              <span className="text-xs text-text-muted mt-1 block">lg</span>
            </div>
            <div className="text-center">
              <SkeletonAvatar size="xl" />
              <span className="text-xs text-text-muted mt-1 block">xl</span>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Real Marketplace Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Examples</h2>

        <ComponentDemo
          title="Listing Card Skeleton"
          description="Loading placeholder for game listing cards."
        >
          <Card className="w-full max-w-xs overflow-hidden">
            <Skeleton variant="image" className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex items-center gap-2 pt-2">
                <SkeletonAvatar size="sm" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </Card>
        </ComponentDemo>

        <ComponentDemo
          title="User Profile Skeleton"
          description="Loading placeholder for user profiles."
        >
          <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg max-w-sm">
            <SkeletonAvatar size="xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="List Skeleton"
          description="Loading placeholder for list items."
        >
          <div className="space-y-4 max-w-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                <Skeleton variant="image" className="h-16 w-16 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </ComponentDemo>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
} from '@second-turn/design-system';

// Basic skeleton shapes
<Skeleton className="h-4 w-full" />
<Skeleton variant="circular" className="h-12 w-12" />
<Skeleton variant="image" className="h-48 w-full" />

// Helper components
<SkeletonText lines={3} />
<SkeletonAvatar size="lg" />

// Listing card skeleton
function ListingCardSkeleton() {
  return (
    <Card>
      <Skeleton variant="image" className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}`}</code>
          </pre>
        </div>
      </section>

      {/* Animation */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Animation</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            All skeletons use a subtle pulse animation to indicate loading state:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice">-</span>
              <span>Opacity oscillates between 100% and 50%</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice">-</span>
              <span>2-second duration for a calm, non-distracting effect</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice">-</span>
              <span>Infinite loop until content loads</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
