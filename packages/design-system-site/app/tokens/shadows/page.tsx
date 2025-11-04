export default function ShadowsPage() {
  return (
    <div className="space-y-12">
      {/* Introduction */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Shadows & Elevation</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-polar-nightMedium leading-relaxed">
            Nordic design uses subtle shadows rather than dramatic Material Design elevation.
            Our shadows create just enough separation to establish hierarchy without feeling prominent.
            This restraint is fundamental to the minimalist aesthetic—we suggest depth through whispers, not shouts.
          </p>
          <p className="text-polar-nightMedium leading-relaxed mt-4">
            Every shadow in the system uses <strong>polar.night</strong> at varying opacity levels,
            ensuring consistency across the interface. Shadows always accompany transitions using our
            200ms timing so elevation changes feel smooth rather than sudden.
          </p>
        </div>
      </section>

      {/* Elevation Scale */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Elevation Levels</h2>
        <div className="space-y-8">
          {/* Elevation 0 */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-xl font-medium text-polar-night">Elevation 0</h3>
              <span className="text-sm font-mono text-polar-nightMedium">shadow-none</span>
            </div>
            <p className="text-polar-nightMedium mb-4">
              Flat elements with no shadow, sitting directly on the background.
              Use for inline content that doesn't need visual separation.
            </p>
            <div className="bg-snow-stormLightest p-8 rounded-lg">
              <div className="bg-snow-white p-6 rounded-lg max-w-md">
                <div className="h-3 w-32 bg-polar-nightDark/20 rounded mb-3"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-polar-nightDark/10 rounded"></div>
              </div>
            </div>
          </div>

          {/* Elevation 1 */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-xl font-medium text-polar-night">Elevation 1</h3>
              <span className="text-sm font-mono text-polar-nightMedium">shadow-sm</span>
              <span className="text-xs px-2 py-1 bg-frost-ice/10 text-frost-arctic rounded">Resting</span>
            </div>
            <p className="text-polar-nightMedium mb-4">
              Subtle shadow for resting cards and standard containers. Creates minimal depth—just enough
              to establish the element as a distinct surface. This is the most common elevation for content cards.
            </p>
            <div className="bg-snow-stormLightest p-8 rounded-lg">
              <div className="bg-snow-white shadow-sm p-6 rounded-lg max-w-md transition-shadow duration-200">
                <div className="h-3 w-32 bg-polar-nightDark/20 rounded mb-3"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-polar-nightDark/10 rounded"></div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-frost-ice/5 border border-frost-ice/20 rounded text-sm text-polar-nightMedium">
              <strong className="text-polar-night">Usage:</strong> Game listing cards, seller profile cards,
              form containers, navigation headers
            </div>
          </div>

          {/* Elevation 2 */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-xl font-medium text-polar-night">Elevation 2</h3>
              <span className="text-sm font-mono text-polar-nightMedium">shadow-md</span>
              <span className="text-xs px-2 py-1 bg-frost-ice/10 text-frost-arctic rounded">Hover/Active</span>
            </div>
            <p className="text-polar-nightMedium mb-4">
              Slightly deeper shadow for hover states and active interactive elements. Signals that an element
              can be interacted with and responds to user attention. The transition from elevation 1 to 2
              should always be smooth with our 200ms timing.
            </p>
            <div className="bg-snow-stormLightest p-8 rounded-lg">
              <div className="bg-snow-white shadow-md p-6 rounded-lg max-w-md transition-shadow duration-200">
                <div className="h-3 w-32 bg-polar-nightDark/20 rounded mb-3"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-polar-nightDark/10 rounded"></div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-frost-ice/5 border border-frost-ice/20 rounded text-sm text-polar-nightMedium">
              <strong className="text-polar-night">Usage:</strong> Cards on hover, active buttons,
              draggable elements being moved, expandable panels when open
            </div>
          </div>

          {/* Elevation 3 */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-xl font-medium text-polar-night">Elevation 3</h3>
              <span className="text-sm font-mono text-polar-nightMedium">shadow-lg</span>
              <span className="text-xs px-2 py-1 bg-frost-ice/10 text-frost-arctic rounded">Elevated</span>
            </div>
            <p className="text-polar-nightMedium mb-4">
              Prominent shadow for modals, dropdowns, and popovers that need clear separation from base content.
              This elevation communicates that the element is temporarily on top of the normal UI flow.
            </p>
            <div className="bg-snow-stormLightest p-8 rounded-lg">
              <div className="bg-snow-white shadow-lg p-6 rounded-lg max-w-md transition-shadow duration-200">
                <div className="h-3 w-32 bg-polar-nightDark/20 rounded mb-3"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-polar-nightDark/10 rounded"></div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-frost-ice/5 border border-frost-ice/20 rounded text-sm text-polar-nightMedium">
              <strong className="text-polar-night">Usage:</strong> Dropdown menus, autocomplete suggestions,
              date pickers, modal dialogs, tooltip popovers
            </div>
          </div>

          {/* Elevation 4 */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-xl font-medium text-polar-night">Elevation 4</h3>
              <span className="text-sm font-mono text-polar-nightMedium">shadow-xl</span>
              <span className="text-xs px-2 py-1 bg-aurora-orange/10 text-aurora-orange rounded">Critical</span>
            </div>
            <p className="text-polar-nightMedium mb-4">
              Maximum elevation reserved for critical notifications and toasts that demand immediate attention.
              Use sparingly—this elevation level should feel exceptional when it appears.
            </p>
            <div className="bg-snow-stormLightest p-8 rounded-lg">
              <div className="bg-snow-white shadow-xl p-6 rounded-lg max-w-md transition-shadow duration-200">
                <div className="h-3 w-32 bg-polar-nightDark/20 rounded mb-3"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-full bg-polar-nightDark/10 rounded mb-2"></div>
                <div className="h-2 w-3/4 bg-polar-nightDark/10 rounded"></div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-aurora-orange/5 border border-aurora-orange/20 rounded text-sm text-polar-nightMedium">
              <strong className="text-polar-night">Usage:</strong> Toast notifications, critical alerts,
              system-level dialogs, full-screen overlays
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Do */}
          <div className="border-2 border-success rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
              <h3 className="text-lg font-semibold text-polar-night">Do</h3>
            </div>
            <ul className="space-y-3 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Transition smoothly between adjacent elevation levels (1 → 2 on hover)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Always pair shadow changes with our 200ms transition duration</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Use elevation 1 as your default for cards and containers</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Reserve elevation 4 for truly critical moments requiring user attention</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Match elevation semantics—modals should always use elevation 3</span>
              </li>
            </ul>
          </div>

          {/* Don't */}
          <div className="border-2 border-error rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-error rounded-full flex items-center justify-center text-white text-sm font-bold">✗</div>
              <h3 className="text-lg font-semibold text-polar-night">Don't</h3>
            </div>
            <ul className="space-y-3 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Jump from elevation 1 to 4—the transition feels jarring and sudden</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Use shadows without transitions—sudden changes break the Nordic calm</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Apply elevation 4 to common elements like navigation or cards</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Create custom shadow values—use only the defined elevation levels</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Layer multiple elevated elements at the same level—create clear hierarchy</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Practical Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Practical Example: Interactive Card</h2>
        <p className="text-polar-nightMedium mb-6">
          A game listing card demonstrates elevation transitions in practice. At rest, it uses elevation 1
          for subtle separation. On hover, it transitions to elevation 2 over 200ms, signaling interactivity.
          This gentle elevation change invites exploration without demanding attention.
        </p>
        <div className="bg-snow-stormLightest p-8 rounded-lg">
          <div className="max-w-sm bg-snow-white shadow-sm hover:shadow-md rounded-xl overflow-hidden transition-shadow duration-200 cursor-pointer">
            <div className="h-48 bg-polar-nightDark/10"></div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-polar-night mb-2">Settlers of Catan</h3>
              <div className="flex gap-2 mb-3">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-condition-veryGood-bg text-condition-veryGood-text border border-condition-veryGood-border">
                  Very Good
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-frost-ice/10 text-frost-arctic border border-frost-ice/30">
                  Verified Seller
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-polar-night">€32</span>
                <span className="text-sm text-polar-nightMedium line-through">€45</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-polar-nightMedium mt-4 italic">
          Hover over the card above to see the elevation transition from level 1 to level 2.
        </p>
      </section>

      {/* Dark Mode Architecture */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Dark Mode Elevation (Future)</h2>
        <div className="p-6 bg-polar-nightDark/5 border border-polar-nightDark/20 rounded-lg">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            In dark mode, Baltic design patterns shift from shadow-based elevation to surface-color-based elevation.
            Higher elevation means slightly lighter surface colors rather than deeper shadows, because shadows
            are less visible against dark backgrounds.
          </p>
          <p className="text-polar-nightMedium leading-relaxed">
            This architectural principle is documented now but not implemented yet. When we add dark mode support,
            each elevation level will map to both a shadow value (for light mode) and a surface lightness value
            (for dark mode). The semantic meanings remain consistent—elevation 3 modals still feel prominently
            separated, just through lighter surfaces instead of stronger shadows.
          </p>
        </div>
      </section>

      {/* Technical Reference */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Technical Reference</h2>
        <div className="bg-polar-night rounded-lg p-6 overflow-x-auto">
          <pre className="text-snow-stormLightest text-sm">
{`// Shadow token definitions
export const shadows = {
  sm: '0 1px 2px 0 rgba(46, 52, 64, 0.05)',      // Elevation 1
  md: '0 4px 6px -1px rgba(46, 52, 64, 0.1)',    // Elevation 2
  lg: '0 10px 15px -3px rgba(46, 52, 64, 0.1)',  // Elevation 3
  xl: '0 20px 25px -5px rgba(46, 52, 64, 0.15)', // Elevation 4
  none: 'none',                                   // Elevation 0
};

// Usage in Tailwind
<div className="shadow-sm">          {/* Elevation 1 */}
<div className="shadow-md">          {/* Elevation 2 */}
<div className="shadow-lg">          {/* Elevation 3 */}
<div className="shadow-xl">          {/* Elevation 4 */}

// With transitions
<div className="shadow-sm hover:shadow-md transition-shadow duration-200">
  Game card that lifts on hover
</div>`}
          </pre>
        </div>
      </section>
    </div>
  );
}
