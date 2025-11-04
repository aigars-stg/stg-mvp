# Getting Started with Second Turn Games Design System

This guide will help you start using the Second Turn Games design system in your projects.

## Quick Start

### 1. Install Dependencies

```bash
# From the root of the monorepo
pnpm install
```

### 2. Build the Design System

```bash
# Build the design system package
pnpm build:ds
```

### 3. Start the Documentation Site

```bash
# Run the design system site
pnpm dev:site
```

Visit [http://localhost:3000](http://localhost:3000) to explore the design system documentation.

## Project Structure

```
second-turn-games/
├── packages/
│   ├── design-system/          # The component library
│   │   ├── src/
│   │   │   ├── tokens/         # Design tokens (colors, spacing, etc.)
│   │   │   ├── components/     # React components
│   │   │   ├── styles/         # Global styles
│   │   │   └── index.ts        # Main export
│   │   └── dist/               # Built files (after pnpm build:ds)
│   │
│   ├── design-system-site/     # Documentation site
│   │   ├── app/                # Next.js pages
│   │   ├── components/         # Site-specific components
│   │   └── public/             # Static assets
│   │
│   └── marketplace/            # Future marketplace app
```

## Using the Design System

### Import Components

```tsx
import { Button, Card, Badge, Input } from '@second-turn/design-system';

function MyComponent() {
  return (
    <Card variant="elevated">
      <Badge variant="veryGood">✨ Very Good</Badge>
      <h3>Board Game Title</h3>
      <Button variant="primary">Buy Now</Button>
    </Card>
  );
}
```

### Import Design Tokens

```tsx
import { colors, spacing, typography } from '@second-turn/design-system/tokens';

// Use tokens in your styles
const myStyles = {
  color: colors.frost.ice,
  padding: spacing[4],
  fontSize: typography.fontSize.lg,
};
```

### Import Styles

Make sure to import the design system styles in your root component:

```tsx
import '@second-turn/design-system/styles';
```

## Available Components

### Button
Trust-building primary actions with frost blue.

```tsx
<Button variant="primary" size="md">
  Buy Game
</Button>

<Button variant="accent" loading>
  Processing...
</Button>

<Button variant="secondary" leftIcon={<Icon />}>
  Save for Later
</Button>
```

**Variants**: `primary`, `secondary`, `accent`, `ghost`, `danger`
**Sizes**: `sm` (36px), `md` (44px), `lg` (48px)

### Card
Container for game listings and content blocks.

```tsx
<Card variant="interactive" padding="md">
  <CardHeader>
    <CardTitle>Catan</CardTitle>
    <CardDescription>Klaus Teuber • 1995</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Trade, build, settle!</p>
  </CardContent>
</Card>
```

**Variants**: `standard`, `elevated`, `interactive`, `outlined`
**Padding**: `none`, `sm`, `md`, `lg`

### Badge
Condition indicators and trust signals.

```tsx
<Badge variant="likeNew">📦 Like New</Badge>
<Badge variant="trust" icon={<CheckIcon />}>Verified</Badge>
```

**Variants**: `trust`, `likeNew`, `veryGood`, `good`, `acceptable`, `forParts`, `success`, `warning`, `error`, `default`, `outline`

### Input
Form inputs with labels and error states.

```tsx
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

## Design Tokens Reference

### Colors

```tsx
import { colors } from '@second-turn/design-system/tokens';

// Primary trust colors
colors.frost.ice        // #88C0D0 - Primary CTAs
colors.frost.polar      // #81A1C1 - Hover states
colors.frost.arctic     // #5E81AC - Verification

// Accent colors
colors.aurora.orange    // #D08770 - Urgency
colors.aurora.green     // #A3BE8C - Success
colors.aurora.red       // #BF616A - Errors
colors.aurora.yellow    // #EBCB8B - Warnings
```

### Spacing

```tsx
import { spacing } from '@second-turn/design-system/tokens';

spacing[0]   // 0
spacing[1]   // 4px
spacing[2]   // 8px
spacing[3]   // 12px
spacing[4]   // 16px
spacing[6]   // 24px
spacing[8]   // 32px
spacing[12]  // 48px
spacing[16]  // 64px
```

### Typography

```tsx
import { typography } from '@second-turn/design-system/tokens';

typography.fontSize.xs      // 12px
typography.fontSize.sm      // 14px
typography.fontSize.base    // 16px
typography.fontSize.lg      // 18px
typography.fontSize.xl      // 20px
typography.fontSize['2xl']  // 24px
typography.fontSize['3xl']  // 30px
```

## Development Commands

```bash
# Root workspace commands
pnpm dev              # Start design system site
pnpm build            # Build all packages
pnpm type-check       # Type check all packages
pnpm lint             # Lint all packages

# Design system commands
pnpm dev:ds           # Watch mode for design system
pnpm build:ds         # Build design system package

# Documentation site commands
pnpm dev:site         # Start Next.js dev server
pnpm build:site       # Build documentation site
```

## Key Design Principles

### 1. Trust Through Frost Blue
Use frost.ice (#88C0D0) for all primary CTAs. This builds trust without greenwashing.

### 2. 8-Point Grid
All spacing follows 4px/8px increments. All component heights align to the grid.

### 3. Accessibility First
- Minimum 44px touch targets
- Clear focus states (3px frost blue ring)
- Proper ARIA labels and keyboard navigation

### 4. Subtle Elevation
Use shadows sparingly. Nordic restraint builds sophistication.

### 5. Fast Animations
Max 200ms for UI, 300ms for page transitions. Baltic users expect snappy interfaces.

## Common Patterns

### Game Listing Card

```tsx
<Card variant="interactive" padding="none">
  <div className="aspect-[3/4] bg-snow-stormLight">
    <img src={gameImage} alt={title} />
    <Badge variant="veryGood">✨ Very Good</Badge>
  </div>
  <div className="p-4">
    <h3 className="font-semibold text-lg">{title}</h3>
    <p className="text-sm text-text-secondary">{designer} • {year}</p>
    <p className="text-2xl font-bold">€{price}</p>
    <Button variant="primary" fullWidth>Buy Now</Button>
  </div>
</Card>
```

### Form with Validation

```tsx
<form>
  <Input
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    error={emailError}
  />

  <Input
    label="Password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    helperText="At least 8 characters"
  />

  <Button variant="primary" fullWidth type="submit">
    Sign In
  </Button>
</form>
```

## Next Steps

1. **Explore the documentation** at [http://localhost:3000](http://localhost:3000)
2. **Browse design tokens** to understand the color system, spacing, and typography
3. **Try components** in the interactive examples
4. **Read usage guidelines** for best practices
5. **Build your first feature** using the design system

## Need Help?

- Check the [full README](./README.md) for project philosophy
- Review the [implementation spec](./second-turn-games-implementation.md) for detailed guidance
- Browse the documentation site for component examples
- Explore the codebase in `packages/design-system/src/` for implementation details

---

**Remember**: Every game deserves a second turn. Build with care, trust, and Nordic minimalism.
