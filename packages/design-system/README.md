# Second Turn Games Design System

A Nordic-minimalist design system for the Baltic board game marketplace.

## Philosophy

This design system embodies the "Every game deserves a second turn" philosophy through thoughtful design decisions:

- **Trust through frost blue** - Primary color is Nordic frost blue (#88C0D0), not green, to avoid greenwashing associations
- **8-point grid system** - All spacing follows 4px/8px increments for visual harmony and prevents half-pixel rendering
- **Subtle elevation** - Shadows use Nordic polar night colors at low opacity, never dramatic Material Design style
- **Fast animations** - Max 200ms for UI, 300ms for page transitions (Baltic expectation for snappy interfaces)
- **Accessibility first** - 44px minimum touch targets, clear focus states, proper ARIA labels

## Installation

```bash
pnpm add @second-turn/design-system
```

## Usage

### Importing Components

```tsx
import { Button, Card, Badge, Input } from '@second-turn/design-system';

function GameListing() {
  return (
    <Card variant="interactive">
      <Badge variant="veryGood">✨ Very Good</Badge>
      <h3>Catan</h3>
      <Button variant="primary">Buy Now</Button>
    </Card>
  );
}
```

### Importing Tokens

```tsx
import { colors, spacing, typography } from '@second-turn/design-system/tokens';

// Use tokens directly in your styles
const customStyle = {
  color: colors.frost.ice,
  padding: spacing[4],
  fontSize: typography.fontSize.lg,
};
```

### Importing Styles

In your root component or main CSS file:

```tsx
import '@second-turn/design-system/styles';
```

## Design Tokens

### Colors

- **Frost (Primary)**: Trust-building blues from the Nord palette
  - `frost.ice` (#88C0D0) - Primary CTAs
  - `frost.polar` (#81A1C1) - Hover states
  - `frost.arctic` (#5E81AC) - Verification badges

- **Aurora (Accents)**: Used sparingly for semantic meaning
  - `aurora.orange` (#D08770) - Urgency, hot deals
  - `aurora.green` (#A3BE8C) - Success states only
  - `aurora.red` (#BF616A) - Errors
  - `aurora.yellow` (#EBCB8B) - Warnings

- **Condition Grades**: Special colors for used game conditions
  - Like New, Very Good, Good, Acceptable, For Parts

### Spacing

8-point grid system: 0, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

### Typography

- **Font Family**: Inter (technical credibility + excellent readability)
- **Sizes**: 12px, 14px, 16px, 18px, 20px, 24px, 30px, 36px, 48px
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Shadows

Subtle Nordic elevation using polar night colors (not dramatic Material Design):
- `xs`: Minimal depth
- `sm`: Resting cards
- `md`: Hover states
- `lg`: Modals
- `xl`: Important overlays

## Components

### Button

Trust-building primary actions with frost blue, urgency actions with orange accent.

```tsx
<Button variant="primary" size="md">Buy Game</Button>
<Button variant="accent" loading>Processing...</Button>
<Button variant="secondary" leftIcon={<HeartIcon />}>Save</Button>
```

### Card

Container for game listings and content blocks with Nordic subtle shadows.

```tsx
<Card variant="interactive" onClick={handleClick}>
  <CardHeader>
    <CardTitle>Game Title</CardTitle>
    <CardDescription>Designer • Year</CardDescription>
  </CardHeader>
  <CardContent>Details...</CardContent>
</Card>
```

### Badge

Condition indicators and trust signals with friendly, non-judgmental colors.

```tsx
<Badge variant="veryGood">✨ Very Good</Badge>
<Badge variant="trust" icon={<CheckIcon />}>Verified</Badge>
```

### Input

Form inputs with clear labels, error states, and 44px touch targets.

```tsx
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  error="Invalid email address"
/>
```

## Icons

This design system uses [Griddy Icons](https://griddyicons.com) - a free, open-source icon library with 1.5px strokes designed at 24x24px for a refined, Nordic-minimalist aesthetic.

### Installation

Icons are provided by `griddy-icons`:

```bash
pnpm add griddy-icons
```

### Usage

```tsx
import { Heart, Star, ShoppingBag } from 'griddy-icons';

// Basic usage
<Heart size={24} />

// Filled variant (for toggles like wishlists)
<Heart size={24} filled />

// With Tailwind classes
<Heart className="w-5 h-5 text-frost-ice" />
```

### Common Icons

| Icon | Usage |
|------|-------|
| `Heart` | Wishlist/favorites |
| `Star` | Ratings |
| `ShoppingBag` | Cart/purchase |
| `Package` | Listings/games |
| `LocationPin` | Location display |
| `Time` | Time/schedule |
| `CheckCircle` | Success states |
| `AlertCircle` | Warning states |

### Filled States

Use the `filled` prop for toggle states:

```tsx
<Heart filled={isWishlisted} className={isWishlisted ? 'text-aurora-red' : 'text-text-muted'} />
<Star filled={rating >= star} className={rating >= star ? 'text-aurora-orange' : 'text-text-muted'} />
```

### Size Guidelines

- `14-16px`: Inline with text (use sparingly, 1.5px stroke can look thin)
- `20-24px`: Standard UI icons
- `32-48px`: Feature highlights, empty states

## Development

```bash
# Build the design system
pnpm build

# Watch mode for development
pnpm dev

# Type check
pnpm type-check
```

## Design Principles

1. **Consistency is Trust** - Every button looks identical, every card follows the same pattern
2. **Performance Equals Professionalism** - Snappy interfaces (Baltic tech standards)
3. **Accessibility Builds Trust** - Proper semantic HTML, ARIA, keyboard navigation
4. **8-Point Grid Religious** - All spacing divisible by 4px for visual harmony

## License

MIT
