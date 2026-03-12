# Project Context

## Overview
Second Turn Games - Nordic-minimalist peer-to-peer board game marketplace for the Baltic region (Latvia, Lithuania, Estonia). "Every game deserves a second turn."

## Tech Stack
- Next.js 14 App Router with TypeScript
- Supabase for database, auth, and storage
- EveryPay (Swedbank) for payments + platform wallet system
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
- `pnpm test` - Run Vitest test suite (marketplace)
- `pnpm lint` - Run ESLint across all packages
- `pnpm type-check` - TypeScript validation

## Testing
- Framework: Vitest with React Testing Library (config in `packages/marketplace/vitest.config.ts`)
- Test files co-located with source: `pricing.ts` → `pricing.test.ts`
- Convention: `describe` per function, `it` per behavior
- Current coverage: pricing, date-utils, validation (pure logic, no mocking)
- Use `vi.useFakeTimers()` for time-dependent tests; always `vi.useRealTimers()` in `afterEach`
- Run tests before committing changes to `lib/services/` or `lib/validation/`

## Code Style
- Use ES modules (import/export)
- Prefer Server Components; use 'use client' only when needed
- Path alias: `@/*` maps to package root
- Follow existing patterns in codebase

## Date & Time Formatting
Always use the centralized utilities from `@/lib/date-utils` for consistent European formatting:
- `formatDate(date)` → `31.08.2026` (dd.MM.yyyy) - for full dates
- `formatDateShort(date)` → `31.08` (dd.MM) - for compact/recent dates
- `formatTime(date, locale?)` → `14:30` (en) / `14.30` (lv) - 24-hour time with locale-aware separator
- `formatDateTime(date, locale?)` → `31.08.2026 14:30` (en) / `31.08.2026 14.30` (lv) - for timestamps
- `formatMessageTime(date, locale?)` → smart relative time (locale-aware time separator)

Time-formatting functions accept an optional `locale` parameter. Latvian uses dots (14.30), all other locales use colons (14:30). In components, pass `useLocale()` from `next-intl`.

Never use `toLocaleDateString()`, `toLocaleTimeString()`, or `toLocaleString()` directly.
Never use 12-hour time format (AM/PM).

## Layout Standards
- Page containers: `max-w-7xl mx-auto px-4 sm:px-6`
- Focused/form pages: `max-w-4xl mx-auto px-4 sm:px-6`
- Page vertical padding: `py-6` (standard content pages)
- Homepage sections: `py-8 sm:py-10 lg:py-12`
- Collection sections: `py-6 sm:py-8`
- Card image heights: `h-40 sm:h-44 lg:h-48`
- H1 page headings: `text-2xl sm:text-3xl font-bold`
- H2 section headings: `text-xl sm:text-2xl font-semibold`
- Borders: `border` (1px) by default; `border-2` only for selected/active states
- Shadows: `shadow-sm` (resting) → `shadow-md` (hover) → `shadow-lg` (dropdowns) → `shadow-xl` (modals/sheets)
- Colors: Never hardcode hex values — use Tailwind design token classes (e.g., `bg-aurora-orange`, `text-frost-ice`)

## Brand Voice
- Welcoming, straightforward, playful, trustworthy
- "Pre-loved" not "used" or "secondhand"
- No exclamation marks in UI copy
- See `/docs/STG-Brand-Voice-Guide.md` for communication style
- See `/docs/STG-Brand-Strategy.md` for purpose, values, and positioning

## Key Files
- `packages/marketplace/middleware.ts` - Auth and i18n routing
- `packages/marketplace/lib/supabase/` - Database clients
- `packages/marketplace/app/` - Next.js App Router pages

## Supported Languages
English (default), Latvian (lv)
<!-- Future: Lithuanian (lt), Estonian (et) — routing and translation files not yet implemented -->

## Shared Components

Always use these — do not write inline equivalents:

| Pattern | Component | Import |
|---------|-----------|--------|
| User / seller display | `UserInfoCard` | `@/components/user` |
| Order items list | `OrderItemsList` | `@/components/order-detail` |
| Game / product thumbnail | `ListingThumbnail` | `@second-turn/design-system` |
| Country flag | `CountryDisplay` | `@second-turn/design-system` |
| Section card wrapper | `Card` | `@second-turn/design-system` |
| Condition badge | `Badge` | `@second-turn/design-system` |
| User avatar | `Avatar` | `@second-turn/design-system` |
| Price formatting | `formatPrice` / `formatCentsToCurrency` | `@/lib/services/pricing` |

## Important Notes
- Always build design-system before marketplace: `pnpm build:ds`
- Supabase RLS policies control data access

## Payment Model

### Pricing (all VAT-inclusive)
- **Shipping**: Route-based pricing (Unisend parcel lockers, Baltic region)
- **Buyer pays**: Item price + shipping only (no service fee)
- **Seller commission**: 10% flat on item price (deducted from earnings)
- **Seller receives**: 90% of item price, credited to platform wallet

### Payment Flow (EveryPay + Wallet)
1. Buyer clicks Pay → server calculates total (items + shipping)
2. If buyer has wallet balance → debit wallet first
3. Remaining amount (if any) → EveryPay payment (cards + bank links)
4. If wallet covers full amount → no EveryPay, instant order creation
5. On EveryPay callback → order created, wallet debited

### Wallet & Withdrawals
- Seller wallet credited when order completes (after 2-day dispute window)
- Wallet uses INTEGER cents for precision
- Sellers request withdrawals → staff processes manually via bank transfer
- IBAN collected at first withdrawal, not during onboarding

### Order Status State Machine
```
pending_seller → accepted → shipped → delivered → completed
                    ↓           ↓          ↓
                cancelled   cancelled   disputed → resolved (completed OR refunded)
```

### Refund Policy
- Refunds available only before order completion (pre-wallet-credit)
- EveryPay portion refunded via API, wallet portion credited back to buyer
- After completion: sales are final

### Key Files
- `packages/marketplace/lib/pricing/constants.ts` - Centralized pricing constants
- `packages/marketplace/lib/services/` - Service layer (pricing, wallet, checkout, order, refund, withdrawal)
- `packages/marketplace/lib/everypay/` - EveryPay API client and types
- `packages/marketplace/lib/validation/` - Zod validation schemas

## MCP Servers

The following MCP servers are configured for this project:

| Server | Purpose | Auth Required |
|--------|---------|---------------|
| `supabase` | Database queries, migrations, type generation | `SUPABASE_ACCESS_TOKEN` |
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
| `/wallet-status` | Check wallet and payment status |
| `/prd` | Access or create PRD documents |
| `/tech-debt` | Run structured technical debt scan with prioritized findings |

## Hooks (Auto-Running)

- **PreToolUse**: Warns before destructive operations (rm -rf, DROP TABLE, git reset --hard)
- **PostToolUse**: Suggests verification after file changes (type-check, translation consistency)
- **SessionStart**: Loads project context (git status, build reminders)