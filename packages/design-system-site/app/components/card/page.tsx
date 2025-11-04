import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function CardPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Card</h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Cards are containers for game listings, content blocks, and grouped information. Our card
          system provides variants for different interaction patterns while maintaining the Nordic
          minimalist aesthetic with 12px border radius and subtle shadows.
        </p>
      </section>

      {/* Variants */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Variants</h2>

        <ComponentDemo
          title="Standard"
          description="Most cards—game listings, content blocks, informational panels."
        >
          <Card variant="standard">
            <CardHeader>
              <CardTitle>Catan</CardTitle>
              <CardDescription>Klaus Teuber • 1995</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-text-secondary">
                Trade, build, and settle the island of Catan in this modern classic strategy game.
              </p>
            </CardContent>
          </Card>
        </ComponentDemo>

        <ComponentDemo
          title="Elevated"
          description="Important cards—featured games, highlighted content, hero sections."
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Featured Game</CardTitle>
              <CardDescription>Editor's Pick</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-text-secondary">
                This week's featured listing with excellent condition and rare expansion.
              </p>
            </CardContent>
          </Card>
        </ComponentDemo>

        <ComponentDemo
          title="Interactive"
          description="Clickable cards that navigate—game listings, seller profiles."
        >
          <Card variant="interactive" className="cursor-pointer">
            <CardHeader>
              <CardTitle>Wingspan</CardTitle>
              <CardDescription>Elizabeth Hargrave • 2019</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-text-secondary">
                Click to view details. Notice the frost ice border on hover.
              </p>
            </CardContent>
          </Card>
        </ComponentDemo>

        <ComponentDemo
          title="Outlined"
          description="Subtle cards—filter panels, sidebars, secondary content."
        >
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-text-secondary">
                Search filters, category selectors, and other supporting UI.
              </p>
            </CardContent>
          </Card>
        </ComponentDemo>
      </section>

      {/* Padding Options */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Padding Options</h2>

        <ComponentDemo
          title="All Padding Sizes"
          description="Control internal spacing based on content density."
        >
          <div className="space-y-4">
            <Card padding="sm">
              <p className="text-sm">Small padding (12px) - Compact content</p>
            </Card>
            <Card padding="md">
              <p className="text-sm">Medium padding (16px) - Standard</p>
            </Card>
            <Card padding="lg">
              <p className="text-sm">Large padding (24px) - Comfortable breathing room</p>
            </Card>
            <Card padding="none" className="border border-border-subtle">
              <div className="p-4 bg-snow-stormLight">
                <p className="text-sm">No padding - Use for image cards with custom padding</p>
              </div>
            </Card>
          </div>
        </ComponentDemo>
      </section>

      {/* Sub-components */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Card Sub-components</h2>

        <ComponentDemo
          title="Complete Card Structure"
          description="Use sub-components for consistent layout across the marketplace."
        >
          <Card variant="standard" className="max-w-md">
            <CardHeader>
              <CardTitle>Ticket to Ride: Europe</CardTitle>
              <CardDescription>Alan R. Moon • 2005 • 2-5 players</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-text-secondary mb-4">
                Build railway routes across Europe. This edition includes all original components
                and the expansion. Box shows light wear, cards are pristine.
              </p>
              <div className="flex gap-2">
                <Badge variant="veryGood">✨ Very Good</Badge>
                <Badge variant="trust">✓ Verified Seller</Badge>
              </div>
            </CardContent>
            <CardFooter className="pt-6 justify-between">
              <span className="text-2xl font-bold text-polar-night">€32.00</span>
              <Button variant="primary">Buy Now</Button>
            </CardFooter>
          </Card>
        </ComponentDemo>
      </section>

      {/* Marketplace Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Usage</h2>

        <ComponentDemo
          title="Game Listing Card"
          description="The most common card pattern in Second Turn Games."
        >
          <Card variant="interactive" padding="none" className="max-w-sm">
            {/* Image */}
            <div className="aspect-[3/4] bg-snow-stormLight flex items-center justify-center text-text-muted relative">
              [Game Cover Image]
              <div className="absolute top-3 left-3">
                <Badge variant="likeNew">📦 Like New</Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg text-polar-night">Azul</h3>
                <p className="text-sm text-text-secondary">Michael Kiesling • 2017</p>
              </div>

              <p className="text-2xl font-bold text-polar-night">€28.00</p>

              <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                <div className="w-8 h-8 rounded-full bg-frost-ice/20 flex items-center justify-center text-frost-arctic font-semibold text-sm">
                  A
                </div>
                <div className="text-sm">
                  <div className="font-medium text-polar-night">Anna K.</div>
                  <div className="text-text-muted">Riga, Latvia</div>
                </div>
              </div>
            </div>
          </Card>
        </ComponentDemo>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use interactive variant for clickable cards
            </h3>
            <p className="text-text-secondary">
              The interactive variant shows a frost ice border on hover, signaling clickability.
              This maintains our trust color for all interactive elements.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Maintain 24px gaps between cards
            </h3>
            <p className="text-text-secondary">
              Use gap-6 (24px) between cards in grids. This follows the internal vs external
              spacing rule—16px padding inside cards, 24px gaps between them.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use padding="none" for image cards
            </h3>
            <p className="text-text-secondary">
              When cards contain images, use padding="none" and apply padding only to the text
              content section. This lets images extend to card edges for visual impact.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't nest cards inside cards
            </h3>
            <p className="text-text-secondary">
              Card nesting creates confusing hierarchy and breaks the elevation system. Use
              sections within a card instead of nested cards.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import { Card, CardHeader, CardTitle, CardDescription,
         CardContent, CardFooter } from '@second-turn/design-system';

function GameCard({ game }) {
  return (
    <Card variant="interactive" padding="none" onClick={handleClick}>
      <img src={game.image} alt={game.title} className="aspect-[3/4]" />

      <div className="p-4 space-y-3">
        <CardHeader>
          <CardTitle>{game.title}</CardTitle>
          <CardDescription>{game.designer} • {game.year}</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-2xl font-bold">{game.price}</p>
        </CardContent>
      </div>
    </Card>
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
            <h3 className="font-semibold text-polar-night mb-2">Interactive Cards</h3>
            <p className="text-text-secondary">
              When using variant="interactive", ensure the entire card is keyboard accessible.
              Wrap in a button or link, or add tabIndex and keyboard handlers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Semantic Structure</h3>
            <p className="text-text-secondary">
              CardTitle uses an h3 element by default. This creates proper heading hierarchy
              when cards appear in lists. Use semantic HTML—don't rely on styling alone.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus States</h3>
            <p className="text-text-secondary">
              Interactive cards show the standard 3px frost ice focus ring when tabbed to via
              keyboard. Ensure this ring is visible against your background colors.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
