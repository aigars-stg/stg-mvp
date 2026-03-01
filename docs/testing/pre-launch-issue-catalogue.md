# Pre-Launch Issue Catalogue

**Testing period:** 2026-03-01
**Method:** Code review (Pass 1) + Playwright walkthroughs (Pass 2, Days A–C)
**Test environment:** localhost:3000 (`pnpm dev:marketplace`)
**Tester:** Claude Code (automated Playwright walkthrough)

---

## Summary

| Severity | Count |
|----------|-------|
| P0-Bug / P0-UX | 0 confirmed |
| P1-Bug | 6 |
| P1-UX | 6 |
| P2-UX | 4 |
| P2-Polish | 4 |
| Resolved | 1 |

**Launch recommendation:** No confirmed P0 blockers found. 4 P1-Bugs require fixes before launch. P1-UX issues reduce quality but don't block core flows.

---

## P1 — Must Fix Before Launch

### [F-020] P1-Bug — Seller order notifications silently fail

**Flow:** Notifications
**File:** `packages/marketplace/lib/services/checkout.ts:202`, DB constraint
**Reproduce:** Complete any wallet-only checkout or EveryPay callback → check seller notifications
**Expected:** Seller receives `new_order` notification in `/notifications`
**Actual:** DB `notifications` table has a `CHECK` constraint that allows only: `outbid`, `auction_won`, `auction_expired`, `second_chance`, `payment_reminder`, `auction_ending`, `wanted_match`. The type `new_order` is not in the constraint — every insert silently fails with a constraint violation.
**Fix:** Add `new_order` (and any other missing types like `order_accepted`, `order_shipped`) to the constraint.

---

### [F-021] P1-Bug — Notification click navigates to wrong URL

**Flow:** Notifications
**File:** `packages/marketplace/app/[locale]/notifications/page.tsx` (notification click handler)
**Reproduce:** Trigger any notification with `data.listing_id` → click the notification
**Expected:** Navigate to `/game/{bgg_game_id}` or `/orders/{order_id}`
**Actual:** Navigates to `/game/{listing_uuid}` — the UUID is used as the BGG game ID path segment → "Game Not Found"
**Fix:** Notification data should store `bgg_game_id` (integer) or `order_id` and route accordingly.

---

### [F-018] P1-Bug — System message "Shipping label created" always fires

**Flow:** Seller accepts order
**File:** `packages/marketplace/app/api/seller/orders/[id]/accept/route.ts` (system message insert)
**Reproduce:** Accept an order where Unisend label generation fails (fake terminal ID) → check conversation
**Expected:** System message should reflect actual label outcome ("Seller accepted" vs "Label generated")
**Actual:** System message hardcodes "Seller accepted the order. Shipping label created." regardless of whether `label_error` is set in DB. Buyer is misled.
**Fix:** Conditionally set system message content based on `labelGenerated` result.

---

### [F-002] P1-Bug — Silent email failure after EveryPay callback

**Flow:** EveryPay callback → order creation
**File:** `packages/marketplace/app/api/webhooks/everypay/callback/route.ts:185`
**Reproduce:** Complete EveryPay payment → check whether buyer/seller receive order emails
**Expected:** Email delivery failure should be logged and/or retried
**Actual:** Email sending uses `.catch(() => {})` — failures are completely silent. No retry, no alerting.
**Note:** Could not fully verify in dev (EveryPay sandbox requires HTTPS). Confirmed by code review.
**Fix:** At minimum, log the failure with `console.error`. Consider a retry queue or dead-letter mechanism.

---

### [F-015] P1-Bug — `seller_terms_accepted_at` null for pre-existing sellers

**Flow:** Seller dashboard, order acceptance
**File:** DB: `seller_profiles` table
**Reproduce:** Query `SELECT user_id, seller_terms_accepted_at FROM seller_profiles WHERE seller_terms_accepted_at IS NULL`
**Expected:** All active sellers should have `seller_terms_accepted_at` set
**Actual:** Sellers created via admin/SQL bypass (e.g. test seeding) have `NULL`. New sellers going through onboarding correctly get the timestamp set.
**Fix:** Backfill: `UPDATE seller_profiles SET seller_terms_accepted_at = created_at WHERE seller_terms_accepted_at IS NULL AND seller_status = 'active'`

---

### [F-001] P1-UX — After sign-in, user does not return to intended destination

**Flow:** Authentication
**File:** `packages/marketplace/app/[locale]/auth/signin/page.tsx:18`
**Reproduce:** Visit `/cart` while unauthenticated → click "Sign in" → complete auth → observe landing page
**Expected:** Return to `/cart`
**Actual:** All unauthenticated redirects push `?redirect=/cart` (e.g. `checkout/page.tsx:193`, `cart/page.tsx:98`). The `/auth/signin` shim reads `params.get('redirectTo')` — different param name. User lands at `/` after sign-in.
**Fix:** Standardise on one param name. Either change all push sites to use `redirectTo=` or change the signin page to read `redirect=`.

---

### [F-016] P1-UX — Raw EveryPay API error shown as page heading

**Flow:** Checkout → payment failure
**File:** `packages/marketplace/app/[locale]/checkout/page.tsx:453`
**Reproduce:** Trigger a payment failure (e.g. from localhost, EveryPay rejects `customer_url`)
**Expected:** A friendly, human-readable error message
**Actual:** The raw API error string (e.g. "Validation failed: customer_url is invalid") is passed through and rendered as the H1 page title via `title={error || t('errorTitle')}`.
**Fix:** Map known EveryPay error codes to friendly messages. Only show the raw error in logs.

---

### [F-017] P1-UX — Checkout form destroyed on payment error (no retry)

**Flow:** Checkout → payment failure
**File:** `packages/marketplace/app/[locale]/checkout/page.tsx:448`
**Reproduce:** Same as F-016 — trigger any payment error
**Expected:** Error shown inline, form stays accessible, user can edit and retry
**Actual:** `if (!user || !basket || error)` replaces the entire form with a full-page error state. The user must use the browser back button to retry. Terminal selection, contact details are lost.
**Fix:** Show the error as an inline alert above the Pay button rather than replacing the form. Keep form state.

---

### [F-014] P1-UX — "Profile loading error" flash on account settings

**Flow:** Account settings
**File:** `packages/marketplace/app/[locale]/account/settings/page.tsx`
**Reproduce:** Navigate to `/account/settings` → observe first ~2 seconds
**Expected:** Loading spinner or skeleton, then profile data
**Actual:** "Profile Loading Error" message briefly appears then auto-recovers. Caused by `setLoading(false)` firing in AuthContext before profile data is fetched on slow connections.
**Fix:** Ensure loading state remains true until both auth and profile are resolved.

---

### [F-003] P1-UX — Conversation list stale for up to 60 seconds

**Flow:** Messaging
**File:** `packages/marketplace/components/messaging/ConversationList.tsx:47-48`
**Reproduce:** User A sends a new message to User B → open User B's `/messages` tab that was already loaded
**Expected:** New conversation/message appears promptly (like MessageThread which uses Realtime)
**Actual:** `setInterval(fetchConversations, 60000)` — the conversation list polls every 60 seconds. New messages from other users may not appear for up to a minute.
**Fix:** Subscribe to Supabase Realtime `postgres_changes` on `messages` table filtered by `receiver_id`, same pattern as `MessageThread`.

---

### [F-008] P1-UX — BGG game edition not auto-selected during listing creation

**Flow:** Listing creation
**File:** `packages/marketplace/app/[locale]/sell/page.tsx`, `lib/hooks/useListingForm.ts`
**Reproduce:** Search for a game that has multiple BGG editions → observe selection step
**Expected:** If only one edition exists, auto-select it and advance. If multiple, show a clear selector.
**Actual:** User must manually select from a list of BGG results without clear guidance on which edition to pick. No auto-advance for single-edition games.
**Fix:** Auto-select if only one result. For multiple results, add edition year and image to aid selection.

---

## P2 — Should Fix Before or Shortly After Launch

### [F-019] P2-UX — Terminal selector loads all 519 locations at once

**Flow:** Checkout, Account settings
**File:** `packages/marketplace/components/checkout/TerminalSelector.tsx` (or equivalent)
**Reproduce:** Open terminal selector
**Expected:** Search/filter or grouped by city, lazy loading
**Actual:** Full list of 519 Unisend terminals loaded and rendered simultaneously. No search box. Scrolling through 519 items to find your terminal is impractical.
**Fix:** Add a text search/filter input. Group by city. Consider loading only the user's country's terminals by default.

---

### [F-022] P2-UX — New user name auto-set to email prefix, no prompt to fix

**Flow:** New user enrollment
**File:** `packages/marketplace/lib/auth/AuthContext.tsx` (user creation), `app/[locale]/auth/page.tsx`
**Reproduce:** Sign up as a new user → observe nav avatar and account settings
**Expected:** User prompted to set their display name on first login
**Actual:** `full_name` is set to the email prefix (e.g. "newplayer.test" for `newplayer.test@example.com`). The email-derived name appears in the nav, on listings, and in order communications until the user discovers account settings.
**Fix:** Add a first-login welcome modal or redirect to account settings with a prompt to complete the profile. At minimum, set `full_name` to an empty string and show a placeholder in the UI.

---

### [F-007] P2-UX — No draft listings management UI

**Flow:** Listing creation
**File:** `packages/marketplace/app/[locale]/my-listings/page.tsx`
**Reproduce:** Start a listing but don't publish → navigate to `/my-listings`
**Expected:** Drafts tab or section showing saved-but-unpublished listings
**Actual:** No draft management visible. Users who save drafts cannot find or complete them. Only published/saved/sold tabs visible.
**Fix:** Add a "Drafts" tab to `/my-listings`. Alternatively, show a banner on the sell page when a draft is detected.

---

### [F-005] P0-UX — Success page timeout message may be unhelpful

**Flow:** Checkout success
**File:** `packages/marketplace/app/[locale]/checkout/success/page.tsx:173`
**Reproduce:** Wait for the success page polling to time out (order not found within polling window)
**Expected:** Clear actionable message: "Check your email for confirmation" or "Contact support"
**Actual:** `errors.timeout` translation key — content not verified during testing (EveryPay flow couldn't complete from localhost).
**Status:** **Unverified** — requires staging environment test with real EveryPay payment.
**Note:** Downgraded from P0 to P2 pending staging verification.

---

## P2-Polish — Low Priority

### [F-010] P2-Polish — "1 items" grammar error in cart

**Flow:** Cart / checkout
**File:** Cart badge or cart page header
**Reproduce:** Add exactly 1 item to cart
**Expected:** "1 item" (singular)
**Actual:** "Shopping cart, 1 items" — no pluralisation logic
**Fix:** `{count === 1 ? 'item' : 'items'}` or use i18n plural forms.

---

### [F-011] P2-Polish — Product photo images missing LCP `priority` prop

**Flow:** Browse, game detail
**File:** Game card and listing photo components
**Reproduce:** Open browser dev tools → check console warnings
**Actual:** Console: "Image with src … was detected as the Largest Contentful Paint image but not marked priority". Impacts Core Web Vitals / SEO score.
**Fix:** Add `priority` prop to the first image in listing cards on browse/game pages.

---

### [F-012] P2-Polish — Logo SVG aspect ratio console warnings

**Flow:** All pages
**File:** Nav logo `<Image>` component
**Reproduce:** Open any page, check console
**Actual:** "Image with src '/images/logo_nav.svg' has either width or height modified, but not the other. This may result in an unexpected aspect ratio."
**Fix:** Set explicit matching `width` and `height` on the logo `<Image>`, or use `fill` with a constrained parent.

---

### [F-023] P2-Polish — Country buttons in seller onboarding lack `aria-pressed`

**Flow:** Seller onboarding
**File:** `packages/marketplace/app/[locale]/seller/onboard/page.tsx:246-252`
**Reproduce:** Inspect country selector buttons with accessibility tools
**Actual:** Visual selection (blue background) is CSS-only. No `aria-pressed` attribute set on selected button. Screen reader users cannot determine which country is selected.
**Fix:** Add `aria-pressed={profile?.country === c.code}` to each country button.

---

## Resolved

### [F-006] RESOLVED — Seller earnings preview in listing form

**Original concern:** No commission/estimated earnings shown in listing creation form
**Actual:** Earnings preview IS present on the sell page — shows "You receive €X.XX (after 10% commission)" below the price input. No action needed.

---

## Not Tested (Requires Staging)

| Issue | Reason |
|-------|--------|
| EveryPay E2E payment (full callback flow) | `http://localhost:3000` rejected by EveryPay — requires HTTPS staging URL |
| Checkout success page timeout copy (F-005) | Depends on EveryPay flow completing |
| Seller/buyer order emails delivery | Requires real email inboxes to verify Resend delivery |
| OAuth (Google/Facebook) flow | Not in scope for localhost testing |

---

## Flow Coverage Summary

| Flow | Status | Critical Gaps |
|------|--------|---------------|
| 1. Authentication (new + existing user) | ✅ Fully walked | None |
| 2. Listing creation | ✅ Fully walked | F-008 (edition UX) |
| 3. Browse & game detail | ✅ Fully walked | None |
| 4. Checkout — EveryPay payment | ⚠️ Partial | Cannot test E2E from localhost (F-016, F-017) |
| 5. EveryPay callback → order creation | ⚠️ Code review only | Requires staging |
| 6. Seller accepts order + label generation | ✅ Fully walked | F-018 (system message) |
| 7. Buyer order list + order detail | ✅ Fully walked | None |
| 8. Seller onboarding | ✅ Fully walked | F-023 (aria) |
| 9. Checkout — wallet-only payment | ⚠️ Code review only | Requires wallet balance |
| 10. Messaging (thread + real-time) | ✅ Mostly walked | F-003 (ConversationList polling, 2-browser test not done) |
| 11. Seller dashboard (orders tab) | ✅ Fully walked | None |
| 12. Account settings | ✅ Fully walked | F-014 (loading flash) |
| 13. Notifications | ✅ Fully walked | F-020 (constraint), F-021 (nav URL) |

---

## Recommended Fix Order

1. **F-020** — Add `new_order` to notifications constraint (1 migration, 5 min)
2. **F-021** — Fix notification click URL (store order_id, not listing UUID)
3. **F-001** — Standardise redirect param name (`redirect` → `redirectTo`)
4. **F-018** — Conditional system message on label generation outcome
5. **F-016 + F-017** — Friendly error handling + inline error, keep form state
6. **F-015** — Backfill `seller_terms_accepted_at` for existing sellers
7. **F-003** — Replace ConversationList polling with Realtime subscription
8. **F-002** — Add error logging to email failures in callback route
9. **F-014** — Fix account settings auth race condition (loading state)
10. **F-008** — Improve BGG edition selection UX
11. P2 items — schedule for sprint after launch
