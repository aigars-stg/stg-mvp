import { typography, semanticTypography } from '@second-turn/design-system/tokens';

export default function TypographyPage() {
  return (
    <div className="space-y-16">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">
          Typography
        </h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Our typography system uses Inter exclusively for both technical credibility and excellent
          readability across all weights. Every size aligns to the 4px grid, and line heights are
          chosen to create perfect vertical rhythm on the 8-point grid.
        </p>
      </section>

      {/* Font Family */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Font Family
        </h2>
        <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
                Primary (Inter)
              </p>
              <p className="text-3xl font-normal text-polar-night mb-2" style={{ fontFamily: 'Inter' }}>
                The quick brown fox jumps over the lazy dog
              </p>
              <p className="text-sm text-text-secondary font-mono">
                {typography.fontFamily.primary}
              </p>
            </div>

            <div className="pt-6 border-t border-border-subtle">
              <p className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
                Monospace (JetBrains Mono, Fira Code)
              </p>
              <p className="text-xl font-mono text-polar-night mb-2">
                const game = &#123; title: "Catan", price: 25 &#125;;
              </p>
              <p className="text-sm text-text-secondary font-mono">
                {typography.fontFamily.mono}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Heading Scale */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Heading Scale
        </h2>
        <p className="text-text-secondary mb-6">
          Headings use semibold to bold weights with tight letter spacing for Nordic precision.
          These create clear hierarchy without shouting.
        </p>

        <div className="space-y-8">
          {/* H1 */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h1 className="text-3xl font-bold text-polar-night mb-3" style={{ letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Settlers of Catan Board Game
            </h1>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-3xl</span>
              <span>•</span>
              <span className="font-mono">font-bold (700)</span>
              <span>•</span>
              <span className="font-mono">30px / 1.2</span>
              <span>•</span>
              <span>H1 - Page headings</span>
            </div>
          </div>

          {/* H2 */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h2 className="text-2xl font-semibold text-polar-night mb-3" style={{ letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Available Games in Your Region
            </h2>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-2xl</span>
              <span>•</span>
              <span className="font-mono">font-semibold (600)</span>
              <span>•</span>
              <span className="font-mono">24px / 1.2</span>
              <span>•</span>
              <span>H2 - Section headings</span>
            </div>
          </div>

          {/* H3 */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h3 className="text-xl font-semibold text-polar-night mb-3" style={{ lineHeight: 1.375 }}>
              Strategy Games Collection
            </h3>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-xl</span>
              <span>•</span>
              <span className="font-mono">font-semibold (600)</span>
              <span>•</span>
              <span className="font-mono">20px / 1.375</span>
              <span>•</span>
              <span>H3 - Subsection headings</span>
            </div>
          </div>

          {/* H4 */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <h4 className="text-lg font-semibold text-polar-night mb-3" style={{ lineHeight: 1.375 }}>
              Game Condition Details
            </h4>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-lg</span>
              <span>•</span>
              <span className="font-mono">font-semibold (600)</span>
              <span>•</span>
              <span className="font-mono">18px / 1.375</span>
              <span>•</span>
              <span>H4 - Card headings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body Text */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Body Text
        </h2>
        <p className="text-text-secondary mb-6">
          Body text uses regular weight at 16px minimum for comfortable reading. Line height of
          1.5 creates perfect 24px spacing that aligns to the 8-point grid.
        </p>

        <div className="space-y-6">
          {/* Body Large */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-lg text-polar-night mb-4" style={{ lineHeight: 1.625 }}>
              This board game is in excellent condition with all original components included.
              The box shows minor shelf wear but all cards are pristine and unpunched.
              Perfect for new players discovering Euro-style strategy games.
            </p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-lg</span>
              <span>•</span>
              <span className="font-mono">font-normal (400)</span>
              <span>•</span>
              <span className="font-mono">18px / 1.625</span>
              <span>•</span>
              <span>Large body - Emphasized content</span>
            </div>
          </div>

          {/* Body Regular */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-base text-polar-night mb-4" style={{ lineHeight: 1.5 }}>
              Second Turn Games connects Baltic board game enthusiasts with pre-loved games.
              Every listing includes detailed photos and honest condition descriptions.
              Buy with confidence knowing sellers are verified and transactions are protected.
            </p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-base</span>
              <span>•</span>
              <span className="font-mono">font-normal (400)</span>
              <span>•</span>
              <span className="font-mono">16px / 1.5</span>
              <span>•</span>
              <span>Body - Default text size (NEVER go smaller for main content)</span>
            </div>
          </div>

          {/* Body Small */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-sm text-polar-night mb-4" style={{ lineHeight: 1.5 }}>
              Listing posted 3 hours ago • Viewed 47 times • Located in Tallinn, Estonia
            </p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-sm</span>
              <span>•</span>
              <span className="font-mono">font-normal (400)</span>
              <span>•</span>
              <span className="font-mono">14px / 1.5</span>
              <span>•</span>
              <span>Small - Metadata, captions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Special Cases */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Special Cases
        </h2>

        <div className="space-y-6">
          {/* Price */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-2xl font-bold text-polar-night mb-3">€25.00</p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-2xl</span>
              <span>•</span>
              <span className="font-mono">font-bold (700)</span>
              <span>•</span>
              <span className="font-mono">24px / 1</span>
              <span>•</span>
              <span>Price - No line height, stands alone</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-sm text-text-secondary mb-3">Klaus Teuber • 1995 • 3-4 players • 60-120 min</p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-sm</span>
              <span>•</span>
              <span className="font-mono">font-normal (400)</span>
              <span>•</span>
              <span className="font-mono">text-secondary</span>
              <span>•</span>
              <span>Metadata - Game details, timestamps</span>
            </div>
          </div>

          {/* Label */}
          <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
            <p className="text-sm font-medium text-polar-night mb-3" style={{ letterSpacing: '0.01em' }}>
              CONDITION GRADE
            </p>
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-mono">text-sm</span>
              <span>•</span>
              <span className="font-mono">font-medium (500)</span>
              <span>•</span>
              <span className="font-mono">letter-spacing: wide</span>
              <span>•</span>
              <span>Labels - Form labels, categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Usage Guidelines
        </h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Never use less than 16px for main content
            </h3>
            <p className="text-text-secondary mb-4">
              16px is the minimum readable size. Smaller text strains eyes and fails accessibility
              standards. Reserve 14px for metadata only, and 12px for rare legal text.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Maintain 1.5 line height for body text
            </h3>
            <p className="text-text-secondary mb-4">
              At 16px font size, 1.5 line height creates 24px vertical spacing—perfect alignment
              to the 8-point grid. This breathing room makes long-form content comfortable to read.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use tight letter spacing for headlines
            </h3>
            <p className="text-text-secondary mb-4">
              Headlines at -0.01em to -0.02em feel crisp and Nordic. This subtle tightening creates
              visual density appropriate for text that commands attention.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't use too many font weights
            </h3>
            <p className="text-text-secondary mb-4">
              Stick to regular (400) for body, medium (500) for subtle emphasis, semibold (600) for
              headings, and bold (700) for prices. More weights create visual noise.
            </p>
          </div>
        </div>
      </section>

      {/* Font Weight Scale */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Font Weight Scale
        </h2>
        <div className="bg-bg-elevated rounded-lg p-8 border border-border-subtle">
          <div className="space-y-6">
            <div>
              <p className="text-2xl font-normal text-polar-night mb-1">
                Regular (400) - Body text and descriptions
              </p>
              <p className="text-sm text-text-muted">Most readable for long-form content</p>
            </div>

            <div>
              <p className="text-2xl font-medium text-polar-night mb-1">
                Medium (500) - Subtle emphasis and labels
              </p>
              <p className="text-sm text-text-muted">Adds weight without boldness</p>
            </div>

            <div>
              <p className="text-2xl font-semibold text-polar-night mb-1">
                Semibold (600) - Headings and important UI elements
              </p>
              <p className="text-sm text-text-muted">Commands attention while staying approachable</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-polar-night mb-1">
                Bold (700) - Prices and strong emphasis
              </p>
              <p className="text-sm text-text-muted">Maximum emphasis for critical information</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vertical Rhythm Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">
          Vertical Rhythm & 8-Point Grid Alignment
        </h2>
        <p className="text-text-secondary mb-6">
          When type sizes and line heights align to the 8-point grid, they create natural harmony
          with spacing and layout. This example shows perfect vertical rhythm:
        </p>

        <div className="bg-bg-elevated rounded-lg p-8 border-2 border-frost-ice/20">
          <h2 className="text-2xl font-semibold text-polar-night mb-3">
            Wingspan: European Expansion
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Elizabeth Hargrave • 2019 • 1-5 players • 40-70 min
          </p>
          <p className="text-base text-polar-night mb-6" style={{ lineHeight: 1.5 }}>
            Add birds from Europe to your wildlife preserve in this gorgeous engine-building game.
            The expansion introduces new bird cards, bonus cards, and end-of-round goals that integrate
            seamlessly with the base game. Perfect condition with all tokens included.
          </p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-polar-night">€32.00</p>
            <p className="text-sm text-text-muted">Posted 2 hours ago • Riga, Latvia</p>
          </div>
        </div>

        <p className="text-sm text-text-muted mt-4">
          Notice how every element aligns: 24px heading line height (8×3), 8px spacing after metadata,
          24px body line height (8×3), 24px spacing before price row. Everything clicks into the grid.
        </p>
      </section>
    </div>
  );
}
