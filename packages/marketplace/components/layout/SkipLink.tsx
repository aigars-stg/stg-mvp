'use client';

/**
 * SkipLink Component
 *
 * Provides keyboard users with a way to skip navigation and jump directly to main content.
 * The link is visually hidden but appears when focused with the Tab key.
 *
 * WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks)
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[100]
        px-4 py-2
        bg-frost-ice text-snow-white
        font-medium text-sm
        rounded-lg
        focus:outline-none focus:ring-3 focus:ring-frost-ice/50
        transition-all
      "
    >
      Skip to main content
    </a>
  );
}
