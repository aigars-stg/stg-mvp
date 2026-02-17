import { spacing, semanticSpacing } from '@second-turn/design-system/tokens';

export default function SpacingPage() {
  return (
    <div className="space-y-16">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">
          Spacing & Grid System
        </h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Our 8-point grid system creates visual harmony through mathematical consistency. All
          spacing values are divisible by 4px, with primary values at 8px intervals. This prevents
          half-pixel rendering and creates the breathing room essential to Nordic minimalism.
        </p>
      </section>

      {/* Why 8-Point Grid */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Why 8-Point Grid?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-3">
              Mathematical Harmony
            </h3>
            <p className="text-text-secondary">
              When everything aligns to the same underlying structure, the result feels ordered and
              calm. Like the golden ratio in classical architecture, the 8-point grid creates
              rhythm users feel but don&apos;t consciously notice.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-3">
              Prevents Half-Pixels
            </h3>
            <p className="text-text-secondary">
              Modern displays use subpixel rendering. Values divisible by 8 (or at minimum 4)
              ensure elements render crisply without blur. This is fundamental to Nordic design
              precision.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-3">
              Scalable System
            </h3>
            <p className="text-text-secondary">
              From 4px tight spacing to 96px hero sections, the grid scales predictably. Designers
              and developers can make spacing decisions confidently knowing everything will align.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-3">
              Touch Target Friendly
            </h3>
            <p className="text-text-secondary">
              44px minimum touch targets (8×5.5) and 48px comfortable targets (8×6) align perfectly
              to the grid. Accessibility and design consistency reinforce each other.
            </p>
          </div>
        </div>
      </section>

      {/* Base Scale */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Base Spacing Scale
        </h2>
        <p className="text-text-secondary mb-6">
          Our core spacing values progress from 4px (tight) to 96px (maximum). Use these as building
          blocks for all layout decisions.
        </p>

        <div className="bg-bg-elevated rounded-lg border border-border-subtle overflow-hidden">
          {Object.entries(spacing).map(([key, value]) => {
            const pixels = parseInt(value) * 16; // Convert rem to px
            return (
              <div key={key} className="border-b border-border-subtle last:border-0 p-6 flex items-center gap-8">
                <div className="w-24">
                  <div className="text-lg font-mono font-semibold text-polar-night">
                    spacing[{key}]
                  </div>
                  <div className="text-sm text-text-muted">
                    {value} ({pixels}px)
                  </div>
                </div>
                <div className="flex-1">
                  <div
                    className="bg-frost-ice h-8 rounded"
                    style={{ width: value }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Semantic Spacing */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Semantic Spacing
        </h2>
        <p className="text-text-secondary mb-6">
          Pre-defined spacing for common use cases ensures consistency across the marketplace.
        </p>

        <div className="grid grid-cols-1 gap-6">
          {/* Card Spacing */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Card Spacing</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">cardPadding</span>
                <span className="text-text-secondary">{semanticSpacing.cardPadding} (16px)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">cardPaddingSmall</span>
                <span className="text-text-secondary">{semanticSpacing.cardPaddingSmall} (12px)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">cardGap</span>
                <span className="text-text-secondary">{semanticSpacing.cardGap} (24px between cards)</span>
              </div>
            </div>
          </div>

          {/* Section Spacing */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Section Spacing</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">sectionGap</span>
                <span className="text-text-secondary">{semanticSpacing.sectionGap} (48px major sections)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">sectionGapSmall</span>
                <span className="text-text-secondary">{semanticSpacing.sectionGapSmall} (32px related sections)</span>
              </div>
            </div>
          </div>

          {/* Component Internal */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Component Internal Spacing</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">buttonPaddingX / buttonPaddingY</span>
                <span className="text-text-secondary">16px / 8px</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">inputPaddingX / inputPaddingY</span>
                <span className="text-text-secondary">12px / 8px</span>
              </div>
            </div>
          </div>

          {/* Touch Targets */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Touch Targets (Accessibility)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">minTouchTarget</span>
                <span className="text-text-secondary">44px (WCAG minimum)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">comfortableTouchTarget</span>
                <span className="text-text-secondary">48px (recommended)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Internal vs External Spacing */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Internal vs External Spacing Rule
        </h2>
        <p className="text-text-secondary mb-6">
          Internal padding should never exceed external gaps. This creates natural containment
          and prevents visual confusion about what belongs together.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Correct Example */}
          <div>
            <div className="mb-3">
              <span className="inline-block px-3 py-1 bg-aurora-green/10 text-aurora-green text-sm font-medium rounded-full border border-aurora-green/30">
                ✓ Correct
              </span>
            </div>
            <div className="bg-frost-ice/5 border-2 border-frost-ice/30 rounded-lg p-6 space-y-6">
              <div className="bg-bg-elevated rounded-lg p-4 border border-border-subtle">
                <h4 className="font-semibold text-polar-night mb-2">Catan</h4>
                <p className="text-sm text-text-secondary">Card with 16px padding</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-4 border border-border-subtle">
                <h4 className="font-semibold text-polar-night mb-2">Wingspan</h4>
                <p className="text-sm text-text-secondary">Card with 16px padding</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mt-2">
              16px card padding, 24px gap between cards. External &gt; Internal creates clear separation.
            </p>
          </div>

          {/* Incorrect Example */}
          <div>
            <div className="mb-3">
              <span className="inline-block px-3 py-1 bg-aurora-red/10 text-aurora-red text-sm font-medium rounded-full border border-aurora-red/30">
                ✗ Incorrect
              </span>
            </div>
            <div className="bg-aurora-red/5 border-2 border-aurora-red/30 rounded-lg p-6 space-y-3">
              <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
                <h4 className="font-semibold text-polar-night mb-2">Catan</h4>
                <p className="text-sm text-text-secondary">Card with 24px padding</p>
              </div>
              <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
                <h4 className="font-semibold text-polar-night mb-2">Wingspan</h4>
                <p className="text-sm text-text-secondary">Card with 24px padding</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mt-2">
              24px card padding, 12px gap between cards. Internal &gt; External creates confusion.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Grid Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          8-Point Grid Visualization
        </h2>
        <p className="text-text-secondary mb-6">
          This grid overlay shows the 8px intervals. Every element should align to these lines.
        </p>

        <div className="relative bg-bg-elevated rounded-lg border border-border-subtle overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="none" stroke="rgba(136, 192, 208, 0.15)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative p-8 space-y-6">
            <h3 className="text-xl font-semibold text-polar-night">
              Ticket to Ride: Europe
            </h3>
            <p className="text-base text-polar-night" style={{ lineHeight: 1.5 }}>
              Build railway routes across Europe in this modern classic. Perfect for families
              and strategy enthusiasts alike. This edition includes all expansions and is in
              excellent condition.
            </p>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-frost-ice text-polar-night rounded-md font-medium">
                Add to Cart
              </button>
              <button className="px-4 py-2 bg-snow-white text-polar-night border-2 border-border rounded-md font-medium">
                Save for Later
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-muted mt-4">
          Notice how every element—heading height, text line height, spacing between paragraphs,
          button heights—all snap perfectly to the 8px grid lines.
        </p>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Usage Guidelines
        </h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Always use spacing values from the scale
            </h3>
            <p className="text-text-secondary mb-4">
              Never use arbitrary values like 17px or 23px. These create visual disharmony and
              break the grid. If you need something in between, round up to the next increment.
            </p>
            <div className="flex gap-4 items-center">
              <code className="text-sm bg-frost-ice/10 px-3 py-1 rounded border border-frost-ice/30">
                ✓ gap-6 (24px)
              </code>
              <code className="text-sm bg-aurora-red/10 px-3 py-1 rounded border border-aurora-red/30">
                ✗ gap-[23px]
              </code>
            </div>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Increase spacing at larger breakpoints
            </h3>
            <p className="text-text-secondary mb-4">
              On mobile, use spacing[4] (16px) page margins. On tablet, use spacing[6] (24px).
              On desktop, use spacing[8] (32px). Larger screens need more breathing room.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use consistent spacing within component families
            </h3>
            <p className="text-text-secondary mb-4">
              All form inputs should use the same internal padding. All cards should use the same
              internal padding. Consistency builds familiarity and trust.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don&apos;t cram content without breathing room
            </h3>
            <p className="text-text-secondary mb-4">
              Nordic minimalism requires generous spacing. If elements feel cramped, increase the
              gap to the next grid increment. White space is not wasted space—it creates calm.
            </p>
          </div>
        </div>
      </section>

      {/* Practical Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Practical Spacing Examples
        </h2>

        <div className="space-y-8">
          {/* Game Card Example */}
          <div>
            <h3 className="text-lg font-semibold text-polar-night mb-4">Game Card Spacing</h3>
            <div className="bg-bg-elevated rounded-lg border border-border-subtle p-0 overflow-hidden max-w-sm">
              <div className="bg-snow-stormLight h-48 flex items-center justify-center text-text-muted">
                [Game Image]
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-lg text-polar-night">Azul</h4>
                  <p className="text-sm text-text-secondary">Michael Kiesling • 2017</p>
                </div>
                <p className="text-2xl font-bold text-polar-night">€28.00</p>
                <button className="w-full px-4 py-2 bg-frost-ice text-polar-night rounded-md font-medium">
                  View Details
                </button>
              </div>
            </div>
            <div className="mt-3 text-sm text-text-muted space-y-1">
              <p>• Image section: full width, no padding</p>
              <p>• Card content: 16px padding (spacing[4])</p>
              <p>• Elements within card: 12px vertical gaps (spacing[3])</p>
              <p>• Button: full width, 44px touch target height</p>
            </div>
          </div>

          {/* Form Example */}
          <div>
            <h3 className="text-lg font-semibold text-polar-night mb-4">Form Spacing</h3>
            <div className="bg-bg-elevated rounded-lg border border-border-subtle p-6 max-w-md">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Email</label>
                  <input
                    type="email"
                    className="w-full h-11 px-3 py-2 rounded-md border-2 border-border bg-bg-elevated"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                  <input
                    type="password"
                    className="w-full h-11 px-3 py-2 rounded-md border-2 border-border bg-bg-elevated"
                    placeholder="••••••••"
                  />
                </div>
                <button className="w-full h-11 px-4 py-2 bg-frost-ice text-polar-night rounded-md font-medium">
                  Sign In
                </button>
              </div>
            </div>
            <div className="mt-3 text-sm text-text-muted space-y-1">
              <p>• Form container: 24px padding (spacing[6])</p>
              <p>• Fields: 24px vertical gaps (spacing[6])</p>
              <p>• Label to input: 6px gap (spacing[1.5])</p>
              <p>• Input height: 44px (accessibility minimum)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
