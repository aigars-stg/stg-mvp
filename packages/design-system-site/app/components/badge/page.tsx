import { Badge } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function BadgePage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Badge</h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Badges communicate status, condition, and trust signals. Our badge system uses carefully
          designed color combinations that make used game conditions feel approachable rather than
          inferior. The 24px pill shape creates friendly warmth within Nordic minimalism.
        </p>
      </section>

      {/* Condition Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Condition Grades</h2>
        <p className="text-text-secondary mb-6">
          These are the most important badges in the marketplace. Each condition uses colors that
          feel friendly and non-judgmental—we're describing used games, not grading exams.
        </p>

        <ComponentDemo title="All Condition Grades" description="Use emojis to add warmth and visual recognition.">
          <div className="flex flex-wrap gap-3">
            <Badge variant="likeNew">📦 Like New</Badge>
            <Badge variant="veryGood">✨ Very Good</Badge>
            <Badge variant="good">🎲 Good</Badge>
            <Badge variant="acceptable">🔧 Acceptable</Badge>
            <Badge variant="forParts">⚙️ For Parts</Badge>
          </div>
        </ComponentDemo>

        <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle mt-6">
          <h3 className="font-semibold text-polar-night mb-4">Condition Descriptions</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge variant="likeNew" size="sm">📦 Like New</Badge>
              <p className="text-text-secondary">Pristine, barely touched. All components present and in perfect condition.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="veryGood" size="sm">✨ Very Good</Badge>
              <p className="text-text-secondary">Minor wear only. Box may show shelf wear but components are excellent.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="good" size="sm">🎲 Good</Badge>
              <p className="text-text-secondary">Visible wear but fully playable. All components intact and functional.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="acceptable" size="sm">🔧 Acceptable</Badge>
              <p className="text-text-secondary">Significant wear. May have repairs or replacements but still playable.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="forParts" size="sm">⚙️ For Parts</Badge>
              <p className="text-text-secondary">Incomplete or damaged. Useful for replacement components or crafting.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Semantic Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Trust & Semantic Badges</h2>

        <ComponentDemo title="Trust Badges" description="Use frost blue for verification and trust signals.">
          <div className="flex flex-wrap gap-3">
            <Badge variant="trust">✓ Verified Seller</Badge>
            <Badge variant="trust" icon={
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            }>Verified</Badge>
          </div>
        </ComponentDemo>

        <ComponentDemo title="Semantic Badges" description="Success, warning, and error states.">
          <div className="flex flex-wrap gap-3">
            <Badge variant="success">Payment Confirmed</Badge>
            <Badge variant="warning">Low Stock</Badge>
            <Badge variant="error">Sold Out</Badge>
          </div>
        </ComponentDemo>

        <ComponentDemo title="Neutral Badges" description="Default and outlined for general labeling.">
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Strategy</Badge>
            <Badge variant="default">Family Game</Badge>
            <Badge variant="outline">3-4 Players</Badge>
            <Badge variant="outline">60-120 min</Badge>
          </div>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo title="All Sizes" description="Use size based on context and visual hierarchy.">
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="veryGood" size="sm">Small</Badge>
            <Badge variant="veryGood" size="md">Medium</Badge>
            <Badge variant="veryGood" size="lg">Large</Badge>
          </div>
        </ComponentDemo>
      </section>

      {/* Marketplace Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Usage</h2>

        <ComponentDemo title="Game Card with Badges" description="Typical badge usage in game listings.">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle max-w-md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-polar-night mb-1">Pandemic Legacy: Season 1</h3>
                <p className="text-sm text-text-secondary">Matt Leacock • 2015</p>
              </div>
              <Badge variant="likeNew">📦 Like New</Badge>
            </div>

            <p className="text-text-secondary text-sm mb-4">
              Complete campaign game with all components sealed. Box shows minimal wear from storage.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="default" size="sm">Cooperative</Badge>
              <Badge variant="default" size="sm">Campaign</Badge>
              <Badge variant="outline" size="sm">2-4 Players</Badge>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <Badge variant="trust" size="sm">✓ Verified</Badge>
                <span className="text-sm text-text-secondary">Posted 2 hours ago</span>
              </div>
              <span className="text-xl font-bold text-polar-night">€45.00</span>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Always include condition badge on game listings
            </h3>
            <p className="text-text-secondary">
              Condition is the most important information for used game buyers. Make it prominent
              and impossible to miss. Use the large size for hero images.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use emojis for condition grades
            </h3>
            <p className="text-text-secondary">
              The emojis (📦✨🎲🔧⚙️) add warmth and help users quickly recognize conditions at a glance.
              They make used games feel friendlier, not lesser-than.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Limit badge usage to avoid clutter
            </h3>
            <p className="text-text-secondary">
              Don't badge everything. 2-3 badges per card is plenty. More than that creates visual
              noise and dilutes their meaning. Every badge should communicate something important.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't use green for sustainability messaging
            </h3>
            <p className="text-text-secondary">
              Reserve aurora green for success states only. The circular economy speaks through
              actions (selling used games) not through color-coded virtue signaling.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import { Badge } from '@second-turn/design-system';

function GameCard({ game, seller }) {
  return (
    <div>
      {/* Condition - Most important */}
      <Badge variant={game.condition}>{game.conditionLabel}</Badge>

      {/* Trust signals */}
      {seller.verified && (
        <Badge variant="trust" size="sm">✓ Verified</Badge>
      )}

      {/* Game categories - Use sparingly */}
      <div className="flex gap-2">
        {game.categories.slice(0, 3).map(cat => (
          <Badge key={cat} variant="default" size="sm">
            {cat}
          </Badge>
        ))}
      </div>
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
            <h3 className="font-semibold text-polar-night mb-2">Text Contrast</h3>
            <p className="text-text-secondary">
              All badge color combinations meet WCAG AA contrast requirements. Text remains readable
              even for users with color vision deficiencies.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Don't Rely on Color Alone</h3>
            <p className="text-text-secondary">
              Icons and text labels supplement color. Screen reader users hear "Like New" not just
              a color. Emojis provide visual reinforcement beyond hue.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Non-Interactive</h3>
            <p className="text-text-secondary">
              Badges are informational, not interactive. They don't receive keyboard focus or
              trigger actions. Use buttons if clicking should do something.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
