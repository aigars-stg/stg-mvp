# Project Context

## Overview
Second Turn Games - Nordic-minimalist peer-to-peer board game marketplace for the Baltic region (Latvia, Lithuania, Estonia). "Every game deserves a second turn."

## Tech Stack
- Next.js 14 App Router with TypeScript
- Supabase for database, auth, and storage
- Stripe Connect Express for payments
- Tailwind CSS with custom design system (@second-turn/design-system)
- Deployed on Vercel
- pnpm monorepo

## Monorepo Structure
- `packages/marketplace` - Main Next.js application
- `packages/design-system` - Shared component library and tokens
- `packages/design-system-site` - Design system documentation

## Commands
Run from repo root:
- `pnpm dev:marketplace` - Start marketplace dev server (localhost:3000)
- `pnpm build:ds` - Build design system (required before marketplace)
- `pnpm build:marketplace` - Production build
- `pnpm lint` - Run ESLint across all packages
- `pnpm type-check` - TypeScript validation

## Code Style
- Use ES modules (import/export)
- Prefer Server Components; use 'use client' only when needed
- Path alias: `@/*` maps to package root
- Follow existing patterns in codebase

## Date & Time Formatting
Always use the centralized utilities from `@/lib/date-utils` for consistent European formatting:
- `formatDate(date)` → `31.08.2026` (dd.MM.yyyy) - for full dates
- `formatDateShort(date)` → `31.08` (dd.MM) - for compact/recent dates
- `formatTime(date)` → `14:30` (HH:mm, 24-hour) - for time only
- `formatDateTime(date)` → `31.08.2026 14:30` - for timestamps
- `formatMessageTime(date)` → smart relative time for messaging

Never use `toLocaleDateString()`, `toLocaleTimeString()`, or `toLocaleString()` directly.
Never use 12-hour time format (AM/PM).

## Brand Voice
- Welcoming, straightforward, playful, trustworthy
- "Pre-loved" not "used" or "secondhand"
- No exclamation marks in UI copy
- See `/docs` for full brand guidelines

## Key Files
- `packages/marketplace/middleware.ts` - Auth and i18n routing
- `packages/marketplace/lib/supabase/` - Database clients
- `packages/marketplace/app/` - Next.js App Router pages

## Supported Languages
English (default), Latvian (lv), Lithuanian (lt), Estonian (et)

## Important Notes
- Always build design-system before marketplace: `pnpm build:ds`
- Supabase RLS policies control data access

## Payment Model

### Pricing (all VAT-inclusive)
- **Shipping**: €2.00 flat rate (Latvia preview, Unisend parcel lockers)
- **Service fee**: 6% + €0.50 (buyer pays)
- **Seller receives**: Item asking price only (after order completion)

### Delayed Payout Flow
Platform uses **separate charges with delayed transfers** (not destination charges):
1. Buyer pays → funds held by platform
2. Seller ships → tracking uploaded
3. Buyer receives → delivery confirmed
4. 2-day dispute window passes → order auto-completes
5. Payout service transfers funds to seller

### Order Status State Machine
```
pending_seller → confirmed → shipped → delivered → completed → paid_out
                    ↓           ↓          ↓
                cancelled   cancelled   disputed → resolved (completed OR refunded)
```

### Key Pricing File
`packages/marketplace/lib/pricing/constants.ts` - Centralized pricing constants

## MCP Servers

The following MCP servers are configured for this project:

| Server | Purpose | Auth Required |
|--------|---------|---------------|
| `supabase` | Database queries, migrations, type generation | `SUPABASE_ACCESS_TOKEN` |
| `stripe` | Connect accounts, payments, transfers | `STRIPE_SECRET_KEY` |
| `filesystem` | Direct file access | None |
| `sequential-thinking` | Complex problem-solving | None |
| `context7` | Library documentation lookup | None |
| `playwright` | Browser automation and testing | None |

## Custom Slash Commands

| Command | Description |
|---------|-------------|
| `/db` | Query Supabase database with natural language |
| `/deploy` | Deploy to Vercel with pre-flight checks |
| `/translate` | Add or update translations across locales |
| `/stripe-status` | Check Stripe Connect account status |
| `/prd` | Access or create PRD documents |

## Hooks (Auto-Running)

- **PreToolUse**: Warns before destructive operations (rm -rf, DROP TABLE, git reset --hard)
- **PostToolUse**: Suggests verification after file changes (type-check, translation consistency)
- **SessionStart**: Loads project context (git status, build reminders)