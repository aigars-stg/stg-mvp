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
- €2 flat-rate shipping via Unisend parcel lockers
- Buyer-pays-fees model (6% + €0.50 service fee)