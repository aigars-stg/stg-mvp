# Pre-Launch Audit Report

**Date**: 2026-03-12
**Branch**: staging
**Server**: localhost:3001

---

## Executive Summary

The STG marketplace is in **good shape for launch** with strong fundamentals in payment security, auth, error handling, and SEO. There are no blocking issues. The findings below are categorized by priority.

| Priority | Count | Description |
|----------|-------|-------------|
| P0 (blocker) | 0 | None |
| P1 (fix before launch) | 4 | Security hardening, missing translations |
| P2 (fix soon after launch) | 8 | UX polish, validation gaps, infra cleanup |
| P3 (nice to have) | 5 | Loading states, rate limiting, documentation |

---

## Phase 0: Build & Automated Checks

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm build:marketplace` | **PASS** | Clean build, no errors |
| `pnpm test` (Vitest) | **PASS** | 7 suites, 55 tests, 0 failures |
| `pnpm lint` | **PASS** | No lint errors |
| `pnpm type-check` | **PASS** | No type errors |

## Phase 0: Database Health

| Check | Result | Notes |
|-------|--------|-------|
| RLS enabled on all tables | **PASS** | All tables have RLS + policies |
| Views with security_invoker | **PASS** | All 8 views use `security_invoker=true` |
| RPC functions exist | **PASS** | All 8 expected functions present |
| FK indexes | **WARN** | 2 missing: `platform_documents.original_document_id`, `seller_reviews.reported_by` |
| Edge Functions | **PASS** | 12 deployed, all ACTIVE |

---

## Phase 1: Page Rendering (52 pages)

### Public Pages (16 tested)

| Page | Status | Notes |
|------|--------|-------|
| `/` (homepage) | **PASS** | Hero, CTAs, country picker, footer all render |
| `/browse` | **PASS** | Filters, sort, game cards render correctly |
| `/game/418576` | **PASS** | Loading skeleton → game detail renders |
| `/profile/:id` | **PASS** | Seller profile renders |
| `/auth`, `/auth/signin`, `/auth/signup` | **PASS** | Auth forms render |
| `/help`, `/help/buying`, `/help/selling` | **PASS** | MDX content renders |
| `/legal`, `/legal/terms`, `/legal/privacy` | **PASS** | MDX legal content renders |
| `/legal/cookie-policy` | **FAIL** | 404 — correct slug is `/legal/cookies` |
| `/sell` | **PASS** | Correctly redirects to auth (307) |
| `/play` | **PASS** | Play section renders |
| `/offline` | **PASS** | Offline fallback page renders |
| `/unsubscribed` | **PASS** | Unsubscribe confirmation renders |

### Locale Routing

| Page | Status | Notes |
|------|--------|-------|
| `/lv`, `/lv/browse` | **PASS** | Full LV translation renders correctly |
| `/lt`, `/lt/browse` | **FAIL** | 404 — LT locale not implemented |
| `/et`, `/et/browse` | **FAIL** | 404 — ET locale not implemented |

> **Note**: LT/ET are not configured in `i18n/routing.ts` (comment says "Future: lt, et"). CLAUDE.md claims 4 supported languages but only EN and LV are implemented. This is a documentation issue, not a code bug.

### 404 Handling

| Check | Result |
|-------|--------|
| `/nonexistent-page` returns 404 | **PASS** |
| Custom not-found.tsx exists (root + locale) | **PASS** |

### Protected Route Redirects (unauthenticated)

| Page | Redirect | Status |
|------|----------|--------|
| `/orders` | → `/auth?redirectTo=%2Forders` | **PASS** |
| `/checkout` | → `/auth?redirectTo=%2Fcheckout` | **PASS** |
| `/account` | → `/auth?redirectTo=%2Faccount` | **PASS** |
| `/seller/dashboard` | → `/auth?redirectTo=%2Fseller%2Fdashboard` | **PASS** |
| `/my-listings` | → `/auth?redirectTo=%2Fmy-listings` | **PASS** |
| `/messages` | → `/auth?redirectTo=%2Fmessages` | **PASS** |
| `/notifications` | → `/auth?redirectTo=%2Fnotifications` | **PASS** |
| `/seller/orders` | → `/auth?redirectTo=%2Fseller%2Forders` | **PASS** |
| `/seller/transactions` | → `/auth?redirectTo=%2Fseller%2Ftransactions` | **PASS** |
| `/seller/settings` | → `/auth?redirectTo=%2Fseller%2Fsettings` | **PASS** |
| `/cart` | No redirect (renders empty cart) | **PASS** (intentional) |
| `/wanted` | No redirect (public listing) | **PASS** (intentional) |

### Console Errors

All pages rendered with **0 console errors**. Warnings are only Next.js image optimization hints (missing width/height on some images).

---

## Phase 2: Security Audit

### Authentication & Authorization

| Check | Result | Notes |
|-------|--------|-------|
| Middleware protects auth routes | **PASS** | All buyer/seller routes redirect to auth |
| Staff layout enforces `isStaff` | **PASS** | Layout + API both check staff role |
| Staff API routes use `requireStaffAuth()` | **PASS** | All staff/admin API routes verified |
| Open redirect prevention | **PASS** | `redirectTo` validated to start with `/`, not `//` |
| OAuth callback cookie handling | **PASS** | PKCE verifier cookies preserved during callbacks |

**P1 — `/staff` not in middleware `protectedRoutes`**: Staff routes are protected at the layout level, but adding `/staff` to middleware would provide defense-in-depth.

**P1 — `/api/auth/cleanup-deleted-accounts` fails-open**: If `CRON_SECRET` env var is unset, auth check is skipped entirely. Other cron routes correctly throw if `CRON_SECRET` is missing.

### API Security

| Check | Result | Notes |
|-------|--------|-------|
| All write APIs require auth | **PASS** | Verified across all route handlers |
| Service role key isolated | **PASS** | Only used in cron jobs, staff routes, webhooks |
| Env vars properly scoped | **PASS** | No sensitive values in `NEXT_PUBLIC_*` |
| `.env.local` in `.gitignore` | **PASS** | Not tracked |

**P2 — `/api/orders/by-session/[sessionId]`**: Has optional auth — if Supabase RLS blocks anon access this is fine, but the intent should be explicit `requireAuth()`.

### Input Validation

| Check | Result | Notes |
|-------|--------|-------|
| Checkout flow (Zod) | **PASS** | `checkoutSessionSchema` validates all input |
| Withdrawal requests (Zod) | **PASS** | `withdrawalRequestSchema` |
| Seller IBAN (Zod) | **PASS** | `sellerIbanSchema` |

**P2 — Several routes use manual validation instead of Zod**: Staff/admin routes (`withdrawals`, `disputes/resolve`, `refund`), `feedback`, `listings questions`, `messages`, `wanted`. These are all auth-protected but lack the rigor of Zod schemas.

### Payment Security

| Check | Result | Notes |
|-------|--------|-------|
| Server-side amount calculation | **PASS** | Cart fetched server-side, amount not from client |
| Callback amount verification | **PASS** | `expectedChargeCents` compared on callback |
| Payment status verified with EveryPay API | **PASS** | Not trusting query params alone |
| Idempotency (no double-processing) | **PASS** | `processed_at` check prevents re-processing |
| Auto-refund on order creation failure | **PASS** | EveryPay charge voided if order creation fails |

### XSS / CSRF

| Check | Result | Notes |
|-------|--------|-------|
| `dangerouslySetInnerHTML` safe | **PASS** | Only used for JSON-LD and developer-controlled i18n |
| User content properly escaped | **PASS** | All user content goes through React default escaping |

---

## Phase 3: i18n Audit

### Translation Coverage

| Check | Result | Notes |
|-------|--------|-------|
| EN keys | 2505 leaf keys | Baseline |
| LV keys | 2495 leaf keys | 14 missing, 4 orphaned |
| LT keys | **N/A** | Not implemented (future) |
| ET keys | **N/A** | Not implemented (future) |

**P1 — 14 Missing LV Translation Keys** (user-facing):
- `GameDetail.filter.buy`, `.contact`, `.contactSeller`, `.instantBuy`
- `Sell.preview.contactSeller`, `.instantBuy`
- `SellerDashboard.WithdrawalHistory.*` (7 keys: title, viewAll, noWithdrawals, noWithdrawalsHint, status.completed/pending/processing/rejected)

**P2 — 4 Orphaned LV Keys** (exist in LV but not EN):
- `SellerDashboard.BalanceCard.availableForPayout`, `.heldUntilDelivery`, `.ordersInTransitPlural`, `.ordersInTransitSingular`

### Hardcoded English Strings

**P1 — User-facing hardcoded strings** (~15 locations):
- Loading states: `my-listings/page.tsx`, `wanted/new/page.tsx`, `TerminalSelectorWithMap.tsx`
- Error headings: `seller/tax-info/page.tsx`, `orders/[id]/review/page.tsx`
- Placeholders: `seller/tax-info/page.tsx` ("John Smith", "Riga"), `orders/[id]/review/page.tsx`, `DisputeResponseForm.tsx`
- Button titles: `account/settings/page.tsx`, `EmailChange.tsx`, `PreferredTerminalSection.tsx`
- Search: `MobileSearchButton.tsx` ("Search for board games...")

**P3 — Staff pages**: All 11 staff pages are 100% English. Acceptable for internal tools.

---

## Phase 4: Infrastructure & Edge Cases

### Service Worker

| Check | Result | Notes |
|-------|--------|-------|
| Offline fallback configured | **PASS** | `/offline` page registered as fallback |
| Caching strategies | **PASS** | NetworkFirst for pages, CacheFirst for assets |

**P2 — `sw.js` and `sw.js.map` committed to git**: These are build artifacts with hardcoded hashes. Should be in `.gitignore`.

### Error Boundaries

| Check | Result |
|-------|--------|
| `global-error.tsx` (root) | **PASS** — Sentry reporting, inline styles |
| `error.tsx` (locale) | **PASS** — i18n, Sentry, retry actions |
| `not-found.tsx` (root + locale) | **PASS** — Both exist with proper UI |

### Loading States

| Check | Result | Notes |
|-------|--------|-------|
| `game/[bgg_id]/loading.tsx` | **PASS** | Skeleton UI |
| `NextTopLoader` (global) | **PASS** | Progress bar during navigation |

**P3 — Missing `loading.tsx`** for: `/browse`, `/orders`, `/messages`, `/checkout`, `/seller/orders`, `/my-listings`

### SEO & Metadata

| Check | Result | Notes |
|-------|--------|-------|
| Title, description, keywords | **PASS** | i18n-aware metadata |
| OpenGraph tags | **PASS** | Title, description, locale, type |
| JSON-LD structured data | **PASS** | WebSite + Organization |
| `robots.ts` | **PASS** | Private routes disallowed |
| `sitemap.ts` | **PASS** | Dynamic with listings + alternates |

**P3 — No OG image**: Social sharing will have no preview image. Consider adding `opengraph-image.tsx`.

### Image Optimization

| Check | Result |
|-------|--------|
| Remote patterns configured | **PASS** — BGG + Supabase storage |

### Rate Limiting

| Check | Result | Notes |
|-------|--------|-------|
| Auth routes | **PASS** | signIn limiter |
| Write endpoints (checkout, messages, listings, reviews, feedback) | **PASS** | Individual limiters |

**P3 — Missing rate limiting on public read APIs**: `/api/games/search`, `/api/games/route`, `/api/geo/detect`, `/api/shipping/terminals`, `/api/profile/[id]`. Global limiter exists but is not applied at middleware level.

### Cron Jobs

| Route | Auth | Result |
|-------|------|--------|
| `expire-reservations` | Bearer CRON_SECRET | **PASS** |
| `sync-tracking` | Bearer CRON_SECRET | **PASS** |
| `complete-delivered-orders` | Bearer CRON_SECRET | **PASS** |
| `expire-seller-deadlines` | Bearer CRON_SECRET | **PASS** |

### Redirect Rules

| Check | Result |
|-------|--------|
| Legacy `?section=` → clean URLs | **PASS** |
| Locale-prefixed legacy routes | **PASS** |
| Staff transactions rename | **PASS** |
| Seller profile migration | **PASS** |

---

## Priority Action Items

### P1 — Fix Before Launch

1. **Add `/staff` to middleware `protectedRoutes`** — Defense-in-depth for admin routes
2. **Fix `cleanup-deleted-accounts` cron auth** — Should throw if `CRON_SECRET` is unset (fail-closed)
3. **Add 14 missing LV translations** — GameDetail filters + WithdrawalHistory keys
4. **Internationalize hardcoded strings** — At minimum: loading states, error headings, search placeholder

### P2 — Fix Soon After Launch

5. **Add explicit `requireAuth()` to `/api/orders/by-session`** — Remove optional auth ambiguity
6. **Add Zod validation to remaining API routes** — Staff/admin routes, feedback, messages, wanted
7. **Add missing FK indexes** — `platform_documents.original_document_id`, `seller_reviews.reported_by`
8. **Add `sw.js` and `sw.js.map` to `.gitignore`** — Build artifacts should not be committed
9. **Clean up 4 orphaned LV translation keys** — BalanceCard keys
10. **Fix `/legal/cookie-policy` reference** — Ensure any links use `/legal/cookies` (correct slug)
11. **Update CLAUDE.md** — Change "Supported Languages" to reflect only EN and LV are live
12. **Service role usage in checkout** — Consider scoping down to anon client where possible

### P3 — Nice to Have

13. **Add `loading.tsx` skeletons** for browse, orders, messages, checkout, seller pages
14. **Add OG image** for social sharing previews
15. **Add rate limiting to public read APIs** — search, games, geo, shipping, profile
16. **Verify cron schedules in Vercel dashboard** — Ensure all 4 crons are actually scheduled
17. **Add global rate limiter at middleware level** — Currently only per-route opt-in

---

## Overall Assessment

**Launch readiness: READY with minor fixes**

The codebase demonstrates strong engineering practices:
- Payment flow is thoroughly secured (server-side amounts, callback verification, idempotency, auto-refund)
- Auth is well-implemented with proper RLS, middleware, and API-level checks
- Error boundaries and SEO are comprehensive
- No XSS or environment variable exposure risks

The P1 items are straightforward fixes (1-2 hours of work) that should be addressed before go-live. The P2 items can follow in the first week post-launch.
