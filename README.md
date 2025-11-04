# Second Turn Games

> **"Every game deserves a second turn."**

A Nordic-minimalist board game marketplace for the Baltic region. This monorepo contains the complete design system foundation and documentation site.

## Project Philosophy

Second Turn Games connects board game enthusiasts in the Baltic region with pre-loved games, emphasizing **trust, transparency, and the circular economy** without sustainability preaching. The design embraces **Nordic minimalism with warm touches**, creating a technically precise yet approachable marketplace that makes buying used games feel smart rather than thrifty.

## Project Structure

```
second-turn-games/
├── packages/
│   ├── design-system/          # Component library and design tokens
│   ├── design-system-site/     # Documentation site (localhost:3003)
│   └── marketplace/            # Marketplace application (localhost:3000)
├── package.json                # Root workspace configuration
└── pnpm-workspace.yaml        # pnpm workspace definition
```

## Phase 1: Design System Foundation ✅

This phase is **complete** and includes:

### Design Tokens
- **Colors**: Nordic frost blues, aurora accents, condition grades
- **Spacing**: 8-point grid system (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px)
- **Typography**: Inter font family with semantic type scales
- **Shadows**: Subtle Nordic elevation (not dramatic Material Design)
- **Border Radius**: Moderate warmth (8px-12px for most UI)
- **Animation**: Fast & responsive (max 200ms for UI, 300ms for page transitions)

### Components
- **Button**: Primary (frost blue), Accent (orange), Secondary, Ghost, Danger variants
- **Card**: Interactive, Elevated, Standard, Outlined with sub-components
- **Badge**: Condition indicators (Like New, Very Good, Good, Acceptable, For Parts) + trust badges
- **Input**: Form inputs with labels, error states, icons, 44px touch targets

### Technologies
- **Monorepo**: pnpm workspaces
- **Build**: Vite + TypeScript
- **Styling**: Tailwind CSS v3.4 extended with custom tokens
- **Components**: React 18 + class-variance-authority
- **Documentation**: Next.js 14 with App Router
- **Font**: Inter (Google Fonts)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd stg-mvp

# Install all dependencies
pnpm install

# Build the design system
pnpm build:ds
```

### Development Commands

```bash
# Start both marketplace and design system together (RECOMMENDED)
pnpm dev
# This starts:
# - Marketplace at http://localhost:3000
# - Design System docs at http://localhost:3003

# Or start them individually:
pnpm dev:marketplace  # Start marketplace only (port 3000)
pnpm dev:site         # Start design system site only (port 3003)

# Build commands
pnpm build            # Build all packages
pnpm build:ds         # Build design system only
pnpm build:site       # Build documentation site only
pnpm build:marketplace # Build marketplace only

# Quality checks
pnpm type-check       # Type check all packages
pnpm lint             # Lint all packages
```

### Quick Start

```bash
pnpm install
pnpm build:ds
pnpm dev
```

Then visit:
- **Marketplace**: [http://localhost:3000](http://localhost:3000)
- **Design System**: [http://localhost:3003](http://localhost:3003)

## Design Principles

### 1. Trust Through Frost Blue
Primary color is Nordic frost blue (#88C0D0), **not green**, to avoid greenwashing associations. Blue builds trust through design consistency, not sustainability clichés.

### 2. 8-Point Grid System
All spacing follows 4px/8px increments for visual harmony. This is fundamental to Nordic design and prevents half-pixel rendering issues.

### 3. Subtle Elevation
Shadows use Nordic polar night colors at low opacity. Never dramatic Material Design style—restraint builds sophistication.

### 4. Fast & Responsive
Max 200ms for UI transitions, 300ms for page transitions. Baltic users expect snappy interfaces from regional tech leaders like Skype and Wise.

### 5. Accessibility First
- 44px minimum touch targets
- Clear focus states (3px frost blue ring at 30% opacity)
- Proper semantic HTML and ARIA labels
- Keyboard navigation support

## Key Design Decisions

### Why Frost Blue (Not Green)?
Green triggers greenwashing skepticism in circular economy contexts. Nordic frost blue communicates trust, security, and technical competence without preaching sustainability.

### Why 8-Point Grid (Not 4px)?
8-point grids are fundamental to Nordic design and prevent half-pixel rendering issues. All component heights align to the grid for visual harmony.

### Why Inter Font?
Inter provides technical credibility and excellent readability across all weights (400, 500, 600, 700). It's the perfect blend of professional and approachable.

### Why Moderate Border Radius?
8-12px radius provides warmth without childishness. Too rounded feels unprofessional; too sharp feels cold. We hit the Nordic sweet spot.

### Why Subtle Shadows?
Dramatic shadows feel dated. Subtle Nordic polar night colors at low opacity (5-20%) create just enough depth to establish hierarchy without distraction.

## Using the Design System

### In a React Project

```bash
pnpm add @second-turn/design-system
```

```tsx
import { Button, Card, Badge } from '@second-turn/design-system';
import '@second-turn/design-system/styles';

function GameListing() {
  return (
    <Card variant="interactive">
      <Badge variant="veryGood">✨ Very Good</Badge>
      <h3>Catan</h3>
      <p>€25</p>
      <Button variant="primary">Buy Now</Button>
    </Card>
  );
}
```

### Accessing Design Tokens

```tsx
import { colors, spacing, typography } from '@second-turn/design-system/tokens';

const customStyle = {
  color: colors.frost.ice,
  padding: spacing[4],
  fontSize: typography.fontSize.lg,
};
```

## Applications

### Marketplace (http://localhost:3000)
The main Second Turn Games marketplace application with:
- **Home page** with Nordic-minimalist design
- **Browse page** with advanced filters (condition, price, location, verified sellers)
- **Game detail pages** with image galleries, seller profiles, reviews, and escrow protection
- **Listing creation** (coming soon)
- Full integration with the design system

### Design System Documentation (http://localhost:3003)
Interactive documentation site with:
- **Component examples** with live previews and code snippets
- **Design tokens** (colors, spacing, typography, shadows)
- **Usage guidelines** and accessibility best practices
- **Design philosophy** explaining every decision

Both sites include cross-navigation links for easy switching during development.

## Next Phases

### Phase 2-3: Marketplace-Specific Patterns (Coming Soon)
- GameCard composite component
- Seller profile pattern
- Condition display system
- Search and filter patterns

### Phase 4-6: Backend & Full Marketplace (Future)
- Node.js backend with PostgreSQL
- BoardGameGeek API integration
- Stripe payment processing
- Search and filtering
- User authentication
- Listing management

## Contributing

This project follows these standards:
- **TypeScript** for type safety
- **ESLint** for code quality
- **Semantic versioning** for releases
- **Conventional commits** for changelog generation

## License

MIT

---

Built with Nordic minimalism and warm touches. **Every game deserves a second turn.**
