import { Button } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function ButtonPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Button</h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Buttons are the primary way users take actions in the interface.
          Our button system provides clear visual hierarchy through variants
          while maintaining Nordic minimalism through restrained styling.
        </p>
      </section>

      {/* Variants */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Variants</h2>

        <ComponentDemo
          title="Primary"
          description="Trust actions like login, purchase, and main CTAs. Uses frost.ice for maximum trust."
        >
          <Button variant="primary">Primary Button</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Secondary"
          description="Alternative actions like cancel, back, or secondary paths."
        >
          <Button variant="secondary">Secondary Button</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Accent"
          description="Urgency actions like 'Buy Now' or limited-time offers."
        >
          <Button variant="accent">Accent Button</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Ghost"
          description="Subtle actions that don't need visual prominence."
        >
          <Button variant="ghost">Ghost Button</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Danger"
          description="Destructive actions that require user caution."
        >
          <Button variant="danger">Delete Item</Button>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo
          title="All Sizes"
          description="Buttons sized for different contexts and touch targets."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small (36px)</Button>
            <Button size="md">Medium (44px)</Button>
            <Button size="lg">Large (48px)</Button>
          </div>
        </ComponentDemo>
      </section>

      {/* With Icons */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Icons</h2>

        <ComponentDemo
          title="Icon Placement"
          description="Add icons to provide visual context for actions."
        >
          <div className="flex flex-wrap gap-4">
            <Button
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            >
              Search Games
            </Button>
            <Button
              rightIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              }
            >
              Continue
            </Button>
            <Button
              variant="accent"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            >
              Add to Cart
            </Button>
          </div>
        </ComponentDemo>
      </section>

      {/* States */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">States</h2>

        <ComponentDemo
          title="Loading State"
          description="Show progress for asynchronous actions."
        >
          <Button loading>Processing...</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Disabled State"
          description="Indicate unavailable actions."
        >
          <Button disabled>Disabled Button</Button>
        </ComponentDemo>

        <ComponentDemo
          title="Full Width"
          description="Span the full width of the container."
        >
          <Button fullWidth>Full Width Button</Button>
        </ComponentDemo>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use primary for main page actions
            </h3>
            <p className="text-text-secondary">
              Every page should have one clear primary action. This guides users toward the intended flow.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use accent sparingly for urgency
            </h3>
            <p className="text-text-secondary">
              The orange accent should be reserved for time-sensitive or high-value actions. Overuse diminishes its impact.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't use multiple primary buttons together
            </h3>
            <p className="text-text-secondary">
              If you have multiple actions, use primary for the main action and secondary for alternatives.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't make buttons too small
            </h3>
            <p className="text-text-secondary">
              Always use at least 'md' size (44px) for touch targets. Use 'sm' only in dense interfaces where touch isn't primary.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import { Button } from '@second-turn/design-system';

function GameListing() {
  return (
    <div className="flex gap-3">
      <Button
        variant="primary"
        onClick={handlePurchase}
        loading={isPurchasing}
      >
        Buy Now
      </Button>

      <Button
        variant="secondary"
        leftIcon={<HeartIcon />}
        onClick={handleSaveForLater}
      >
        Save for Later
      </Button>
    </div>
  );
}`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Navigation</h3>
            <p className="text-text-secondary">
              All buttons are keyboard accessible via Tab navigation. Press Enter or Space to activate.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus States</h3>
            <p className="text-text-secondary">
              Buttons show a visible focus ring (3px frost.ice at 30% opacity) when focused via keyboard.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Touch Targets</h3>
            <p className="text-text-secondary">
              All buttons meet the minimum 44px touch target size recommended by WCAG for accessibility.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Loading States</h3>
            <p className="text-text-secondary">
              When loading, buttons are disabled and aria-busy is set to true to inform assistive technology.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
