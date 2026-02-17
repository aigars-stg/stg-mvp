import { Button } from '@second-turn/design-system';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">
          Second Turn Games Design System
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl mb-8">
          A Nordic-minimalist design system for the Baltic board game marketplace.
          Built on the philosophy that <span className="font-semibold text-frost-ice">&quot;Every game deserves a second turn.&quot;</span>
        </p>
        <div className="flex gap-4">
          <Button variant="primary" size="lg">
            Get Started
          </Button>
          <Button variant="secondary" size="lg">
            View on GitHub
          </Button>
        </div>
      </section>

      {/* Design Principles */}
      <section className="border-t border-border-subtle pt-12">
        <h2 className="text-3xl font-semibold text-polar-night mb-8">
          Design Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-frost-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Trust Through Frost Blue
            </h3>
            <p className="text-text-secondary">
              Primary color is Nordic frost blue (#88C0D0), not green, to avoid greenwashing associations.
              Trust is built through design consistency, not sustainability clichés.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-frost-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              8-Point Grid System
            </h3>
            <p className="text-text-secondary">
              All spacing follows 4px/8px increments for visual harmony. This is fundamental to Nordic design
              and prevents half-pixel rendering issues.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-frost-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Fast & Responsive
            </h3>
            <p className="text-text-secondary">
              Max 200ms for UI transitions, 300ms for page transitions. Baltic users expect snappy interfaces
              from tech leaders like Skype and Wise.
            </p>
          </div>

          <div className="bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <div className="w-12 h-12 bg-frost-ice/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-frost-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Accessibility First
            </h3>
            <p className="text-text-secondary">
              44px minimum touch targets, clear focus states, proper ARIA labels, keyboard navigation.
              Accessibility signals technical competence and inclusivity.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-t border-border-subtle pt-12">
        <h2 className="text-3xl font-semibold text-polar-night mb-6">
          Philosophy
        </h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-8">
          <p className="text-lg text-text leading-relaxed mb-4">
            This design system embodies the <span className="font-semibold">Second Turn philosophy</span>:
            thoughtful curation over endless options, quality over quantity, sustainability through reuse
            rather than disposal.
          </p>
          <p className="text-lg text-text leading-relaxed mb-4">
            The design tokens limit choices not to constrain but to elevate—every decision has been made
            once, correctly, so you can focus on building great experiences.
          </p>
          <p className="text-lg text-text leading-relaxed">
            The <span className="font-semibold">Nordic aesthetic</span> isn&apos;t cold minimalism—it&apos;s warm
            minimalism that respects users&apos; time and intelligence. Every pixel serves purpose. Every component
            earns its place. Every pattern solves real problems.
          </p>
        </div>
      </section>

      {/* Quick Links */}
      <section className="border-t border-border-subtle pt-12">
        <h2 className="text-3xl font-semibold text-polar-night mb-6">
          Explore the System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/tokens/colors"
            className="block bg-bg-elevated p-6 rounded-lg border border-border-subtle hover:border-frost-ice/30 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-polar-night mb-2">
              Design Tokens →
            </h3>
            <p className="text-text-secondary text-sm">
              Colors, spacing, typography, shadows, and animation values
            </p>
          </a>

          <a
            href="/components/button"
            className="block bg-bg-elevated p-6 rounded-lg border border-border-subtle hover:border-frost-ice/30 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-polar-night mb-2">
              Components →
            </h3>
            <p className="text-text-secondary text-sm">
              Button, Card, Badge, Input with live examples
            </p>
          </a>

          <a
            href="/installation"
            className="block bg-bg-elevated p-6 rounded-lg border border-border-subtle hover:border-frost-ice/30 hover:shadow-md transition-all"
          >
            <h3 className="text-lg font-semibold text-polar-night mb-2">
              Installation →
            </h3>
            <p className="text-text-secondary text-sm">
              Get started with the design system in your project
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
