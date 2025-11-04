# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the design system
pnpm build:ds

# Start both applications
pnpm dev
```

## Running Applications

After running `pnpm dev`, you'll have access to both applications:

### 🛒 Marketplace
**URL**: http://localhost:3000

The main Second Turn Games marketplace application.

**Pages:**
- `/` - Home page with hero and features
- `/browse` - Browse games with filters (condition, price, location, etc.)
- `/games/[id]` - Game detail page with photos, reviews, seller profile
- `/sell/new` - Listing creation (coming soon)

**Key Features:**
- Advanced filtering (condition, price range, location, verified sellers)
- Image galleries with lightbox
- Seller profiles with ratings and reviews
- Trust signals throughout (escrow protection, verification badges)
- Responsive design (mobile, tablet, desktop)

---

### 🎨 Design System Documentation
**URL**: http://localhost:3003

Interactive documentation for the design system.

**Sections:**
- **Getting Started** - Introduction and installation
- **Design Tokens** - Colors, typography, spacing, shadows
- **Components** - Button, Card, Badge, Input, Select, Checkbox, Modal

**Each component page includes:**
- Live interactive examples
- Code snippets
- Props documentation
- Accessibility guidelines
- Usage best practices

---

## Cross-Navigation

Both applications include links to each other:

**From Marketplace:**
- Header: "Design System ↗" link (top right)
- Footer: "Design System →" link (Company section)

**From Design System:**
- Sidebar: "← View Marketplace" button (top of sidebar)

---

## Development Workflow

### Working on the Design System

```bash
# Make changes to packages/design-system/src/
# The design system needs to be rebuilt after changes

pnpm build:ds

# The marketplace will hot-reload with the new design system build
```

### Working on the Marketplace

```bash
# Make changes to packages/marketplace/
# Hot reload is automatic - just save and refresh
```

### Working on Design System Documentation

```bash
# Make changes to packages/design-system-site/
# Hot reload is automatic - just save and refresh
```

---

## Port Configuration

- **Marketplace**: Port 3000 (default Next.js port)
- **Design System**: Port 3003 (automatically chosen to avoid conflicts)

If you need to change ports, edit the respective `package.json` files:
- `packages/marketplace/package.json` - Add `-p PORT` to dev script
- `packages/design-system-site/package.json` - Add `-p PORT` to dev script

---

## Common Tasks

### Add a New Component

1. Create component in `packages/design-system/src/components/`
2. Export from `packages/design-system/src/index.ts`
3. Rebuild: `pnpm build:ds`
4. Create documentation page in `packages/design-system-site/app/components/`
5. Add to sidebar in `packages/design-system-site/app/layout.tsx`

### Update Design Tokens

1. Edit `packages/design-system/src/tokens/`
2. Rebuild: `pnpm build:ds`
3. Update Tailwind configs in both marketplace and design-system-site
4. Document changes in design-system-site token pages

### Test Marketplace Pages

1. Start both servers: `pnpm dev`
2. Visit marketplace at http://localhost:3000
3. Test user flows:
   - Home → Browse → Filter → Game Detail
   - Click "Design System" link to verify components
   - Test responsive behavior (mobile, tablet, desktop)

---

## Troubleshooting

### Port Already in Use

If ports 3000 or 3003 are in use:

```bash
# Kill all node processes (Windows)
taskkill /F /IM node.exe

# Or find and kill specific port (Windows)
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]
```

### Design System Changes Not Reflecting

```bash
# Rebuild the design system
pnpm build:ds

# If still not working, restart the dev server
# Press Ctrl+C to stop, then run pnpm dev again
```

### TypeScript Errors

```bash
# Run type check across all packages
pnpm type-check

# Check specific package
cd packages/marketplace
pnpm type-check
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Monorepo Root                        │
│                   (pnpm workspace)                      │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌──────▼─────────┐  ┌───▼──────────┐
│   design-    │  │  design-system-│  │  marketplace │
│   system     │  │     site       │  │              │
│              │  │                │  │              │
│ Components   │  │ Documentation  │  │ Main App     │
│ + Tokens     │  │ (port 3003)    │  │ (port 3000)  │
│              │  │                │  │              │
│ Vite Build   │  │ Next.js 14     │  │ Next.js 14   │
└──────────────┘  └────────────────┘  └──────────────┘
       │                  │                    │
       │                  │                    │
       └──────────imports─┴────────imports─────┘
                 (@second-turn/design-system)
```

---

## Best Practices

### Component Development

- Always use design system components in marketplace
- Never create custom styled components - extend design system instead
- Follow 8-point grid for all spacing
- Use design tokens for colors, never hardcode hex values

### Git Workflow

- Commit design system changes separately from marketplace changes
- Run `pnpm build:ds` before committing if design system changed
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.

### Performance

- Keep component bundle sizes small
- Lazy load images and heavy components
- Test on slow 3G network simulation
- Aim for <200ms UI transitions

---

## Next Steps

### Immediate
- [ ] Add placeholder images for game cards
- [ ] Implement listing creation flow (Page 3)
- [ ] Add more mock games to browse page
- [ ] Create seller dashboard concept

### Short Term
- [ ] Backend API design
- [ ] Database schema
- [ ] Authentication flow
- [ ] Payment integration research

### Long Term
- [ ] BoardGameGeek API integration
- [ ] Image upload and processing
- [ ] Search and recommendations
- [ ] Mobile app considerations

---

Built with Nordic minimalism. **Every game deserves a second turn.**
