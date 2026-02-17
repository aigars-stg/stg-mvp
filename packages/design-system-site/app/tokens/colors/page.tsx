import { colors } from '@second-turn/design-system/tokens';
import { ColorSwatch } from '@/components/ColorSwatch';
import { Button } from '@second-turn/design-system';

export default function ColorsPage() {
  return (
    <div className="space-y-16">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">
          Color System
        </h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Our color palette is inspired by Nordic minimalism with trust-building blues
          at its core. These colors establish credibility while maintaining the warmth
          essential to community marketplaces.
        </p>
      </section>

      {/* Nordic Frost - Brand Colors */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Nordic Frost - Primary Brand Colors
        </h2>
        <p className="text-text-secondary mb-6">
          Blue is the foundation of trust in our marketplace. These frost colors
          communicate reliability, security, and technical competence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ColorSwatch
            name="ice"
            value={colors.frost.ice}
            usage="Primary CTAs, trust badges, focus states"
          />
          <ColorSwatch
            name="polar"
            value={colors.frost.polar}
            usage="Hover states, active navigation"
          />
          <ColorSwatch
            name="arctic"
            value={colors.frost.arctic}
            usage="Verification badges, pressed states"
          />
          <ColorSwatch
            name="ocean"
            value={colors.frost.ocean}
            usage="Dark accents, secondary emphasis"
          />
        </div>
      </section>

      {/* Aurora - Accent Colors */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Aurora - Accent Colors
        </h2>
        <p className="text-text-secondary mb-6">
          Aurora colors add energy and meaning to specific interface states.
          Use sparingly for maximum impact.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ColorSwatch
            name="orange"
            value={colors.aurora.orange}
            usage="Hot deals, urgency, time-sensitive"
          />
          <ColorSwatch
            name="green"
            value={colors.aurora.green}
            usage="Success states only"
          />
          <ColorSwatch
            name="red"
            value={colors.aurora.red}
            usage="Errors, rare items, collectibles"
          />
          <ColorSwatch
            name="yellow"
            value={colors.aurora.yellow}
            usage="Warnings, attention needed"
          />
        </div>
      </section>

      {/* Condition Badge Colors */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Condition Grades
        </h2>
        <p className="text-text-secondary mb-6">
          Special color combinations designed to make used game condition grades
          feel friendly and approachable rather than judgmental.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(colors.condition).map(([grade, colorSet]) => (
            <div key={grade} className="space-y-2">
              <div
                className="h-16 rounded-2xl border flex items-center justify-center font-medium text-sm"
                style={{
                  backgroundColor: colorSet.bg,
                  color: colorSet.text,
                  borderColor: colorSet.border,
                }}
              >
                {grade.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="text-xs text-text-muted text-center font-mono">
                {colorSet.bg}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Usage Guidelines
        </h2>
        <div className="space-y-6">
          {/* Guideline 1 */}
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Always use frost.ice for primary CTAs
            </h3>
            <p className="text-text-secondary mb-4">
              This is your signature color. It builds trust and should be the most prominent blue in any interface.
            </p>
            <div className="bg-bg-secondary p-4 rounded-md">
              <Button variant="primary">Primary Action</Button>
            </div>
          </div>

          {/* Guideline 2 */}
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Limit aurora.orange to urgency only
            </h3>
            <p className="text-text-secondary mb-4">
              Orange signals deals and time-sensitive actions. Overuse dilutes its power.
            </p>
            <div className="bg-bg-secondary p-4 rounded-md">
              <div className="bg-aurora-orange/10 border border-aurora-orange/30 px-4 py-2 rounded-md inline-block">
                <span className="text-aurora-orange font-semibold">⚡ Hot Deal - 24h Only</span>
              </div>
            </div>
          </div>

          {/* Guideline 3 */}
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Avoid green sustainability clichés
            </h3>
            <p className="text-text-secondary mb-4">
              Only use aurora.green for success states, never as primary brand color. Let the circular economy
              speak through actions, not color.
            </p>
            <div className="bg-bg-secondary p-4 rounded-md">
              <div className="flex items-center gap-2 text-aurora-green">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Game added to collection</span>
              </div>
            </div>
          </div>

          {/* Guideline 4 */}
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don&apos;t use multiple primary colors together
            </h3>
            <p className="text-text-secondary mb-4">
              Mixing frost.ice with aurora colors creates visual confusion. Choose one primary action per context.
            </p>
            <div className="bg-bg-secondary p-4 rounded-md flex gap-3">
              <Button variant="primary">Correct</Button>
              <Button variant="secondary">Alternative</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette Reference */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Complete Palette Reference
        </h2>
        <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Polar Night */}
            <div>
              <h3 className="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">
                Polar Night (Darks)
              </h3>
              <div className="space-y-2">
                {Object.entries(colors.polar).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border border-border-subtle"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <div className="font-mono text-sm">{value}</div>
                      <div className="text-xs text-text-muted">{name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Snow Storm */}
            <div>
              <h3 className="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">
                Snow Storm (Lights)
              </h3>
              <div className="space-y-2">
                {Object.entries(colors.snow).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border border-border-subtle"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <div className="font-mono text-sm">{value}</div>
                      <div className="text-xs text-text-muted">{name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
