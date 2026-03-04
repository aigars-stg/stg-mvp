# STG PRD: Flow 2 — Seller Onboarding Cleanup
**Version:** 1.0
**Date:** 2026-03-04
**Status:** Ready for implementation
**Depends on:** Flow 1 PRD (wallet creation in accept-terms, CountryPrompt enhancement)

---

## 1. Context & Goals

Flow 2 covers the path from "user decides to sell" through seller account activation. The current implementation works but has accumulated dead code, redundant API fields, a silently-buggy country detection flow, and a completion page that adds a dead-end step between onboarding and actually listing a game.

**Goals:**
- Remove dead/orphaned code (4 components, 1 page)
- Fix country-related bugs (silent auto-save, missing validation, NULL-as-LV)
- Simplify the status API (3 identical booleans → 1)
- Remove the completion page — redirect straight to `/sell` with a celebration toast
- Add mobile "Start Selling" entry point
- Clean up UX inconsistencies ("Step 1" label, support email)

**Not in scope:**
- Dashboard content/empty states (deferred — will review separately)
- Tax info page i18n (deferred to post-launch)
- Wallet creation in accept-terms (covered by Flow 1 PRD Section 3.3.2)

---

## 2. Current State Summary

### 2.1 Onboarding Flow
```
Entry: UserMenu "Start Selling" / /sell redirect / Account settings CTA
  → /seller/onboard (auth check, status check, geo-detect + auto-save country, terms form)
  → POST /api/seller/onboarding/accept-terms (upsert seller_profiles, status: 'active')
  → /seller/onboard/complete (static success page — 6 content sections, 226 lines)
  → User clicks "Create Your First Listing" → /sell
```

### 2.2 Key Files
- `app/[locale]/seller/onboard/page.tsx` — onboarding form (280 lines)
- `app/[locale]/seller/onboard/complete/page.tsx` — completion page (226 lines)
- `app/api/seller/onboarding/status/route.ts` — status API
- `app/api/seller/onboarding/accept-terms/route.ts` — accept terms API
- `components/account/SellerCTACard.tsx` — orphaned component
- `components/seller/EarningsSummary.tsx` — orphaned component
- `components/seller/PayoutHistory.tsx` — orphaned component
- `components/seller/Dac7StatusCard.tsx` — orphaned component

### 2.3 Current Data
3 users, all active sellers, all LV, all with wallets (balance €0.00), none have IBAN set.

---

## 3. Changes

### 3.1 Delete Orphaned Components

#### 3.1.1 SellerCTACard

**Delete file:** `components/account/SellerCTACard.tsx`

Exported but never imported anywhere. The account settings page (`/account/settings`) has its own inline seller CTA banner that uses the same `Dashboard.SellerCTA` translation keys — keep those translations, only delete the component file.

#### 3.1.2 EarningsSummary

**Delete file:** `components/seller/EarningsSummary.tsx`

Superseded by wallet-based `WalletBalance` + `WalletTransactions` components used in `EarningsTab`.

**Also remove:** `SellerDashboard.EarningsSummary` translation namespace from `messages/en.json` and `messages/lv.json` if present.

#### 3.1.3 PayoutHistory

**Delete file:** `components/seller/PayoutHistory.tsx`

Superseded by `WithdrawalHistory` component used in `EarningsTab`.

**Also remove:** `SellerDashboard.PayoutHistory` translation namespace from `messages/en.json` and `messages/lv.json` if present.

#### 3.1.4 Dac7StatusCard

**Delete file:** `components/seller/Dac7StatusCard.tsx`

Superseded by `Dac7WarningBanner` component used in `EarningsTab`.

No translation namespace to remove (uses inline strings — itself a minor issue, but not worth fixing for a deleted file).

---

### 3.2 Delete Completion Page & Redirect to /sell

#### 3.2.1 Delete the page

**Delete directory:** `app/[locale]/seller/onboard/complete/`

This page is a dead end visited once. Its educational content (how selling works, tips, earnings info) can be surfaced later in the dashboard empty state or help pages.

#### 3.2.2 Update accept-terms redirect

**Modify file:** `app/[locale]/seller/onboard/page.tsx`

```typescript
// Before (line 151)
router.push('/seller/onboard/complete');

// After
router.push('/sell?welcome=true');
```

#### 3.2.3 Update "already completed" redirect

**Modify file:** `app/[locale]/seller/onboard/page.tsx`

```typescript
// Before (line 110)
if (data.onboarding_completed && data.can_list_items) {
  router.push('/seller/onboard/complete');
  return;
}

// After
if (data.onboarding_completed && data.can_list_items) {
  router.push('/sell');
  return;
}
```

No `?welcome=true` here — this is a returning seller who visits `/seller/onboard` by mistake, not a first-time activation.

#### 3.2.4 Add celebration toast to sell page

**Modify file:** `app/[locale]/sell/page.tsx`

In the inner component that reads `searchParams` (around line 606):

```typescript
import { useToast } from '@/components/common/Toast';

// Inside the component:
const { addToast } = useToast();
const isWelcome = searchParams.get('welcome') === 'true';

useEffect(() => {
  if (isWelcome) {
    addToast('success', t('welcome.sellerActivated'));
    // Clean URL without re-render
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    window.history.replaceState({}, '', url.toString());
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isWelcome]);
```

**New translation key** in `Sell` namespace:
```json
{
  "welcome": {
    "sellerActivated": "You're a seller now — list your first game"
  }
}
```

EN and LV only.

#### 3.2.5 Remove completion page translations

**Modify files:** `messages/en.json`, `messages/lv.json`

Remove the entire `SellerOnboard.complete` namespace (keys: `title`, `subtitle`, `whatYouCanDo`, `howItWorks`, `tips`, `earnings`, `completeSupport`, `cta`).

---

### 3.3 Simplify Status API

**Modify file:** `app/api/seller/onboarding/status/route.ts`

#### 3.3.1 Remove redundant fields

```typescript
// Before
const statusData = {
  seller_status: ...,
  terms_accepted: termsAccepted,
  onboarding_completed: onboardingCompleted,
  can_list_items: canListItems,
  can_create_contact_seller: canCreateContactSeller,  // REMOVE
  can_create_instant_buy: canCreateInstantBuy,          // REMOVE
  has_phone: hasPhone,
  has_payout_info: ...,
  needs_dac7_info: false,                                // REMOVE
};

// After
const statusData = {
  seller_status: sellerProfile?.seller_status || 'not_started',
  terms_accepted: termsAccepted,
  onboarding_completed: onboardingCompleted,
  can_list_items: onboardingCompleted,
  has_phone: hasPhone,
  has_payout_info: !!(sellerProfile?.payout_iban && sellerProfile?.payout_account_holder_name),
};
```

**Removed fields:**
- `can_create_contact_seller` — always identical to `can_list_items`
- `can_create_instant_buy` — always identical to `can_list_items`
- `needs_dac7_info` — hardcoded `false`, never used

#### 3.3.2 Update all consumers

**Modify file:** `app/[locale]/sell/page.tsx`

The sell page currently reads `can_create_contact_seller` and `can_create_instant_buy` from the status API and threads them through `sellerCapabilities`. Replace with `can_list_items`. Transaction method is always `'claim'` (hardcoded in the listing creation API per Flow 3 PRD).

```typescript
// Before (lines 288-295)
const canCreateContactSeller = data.can_create_contact_seller ?? false;
const canCreateInstantBuy = data.can_create_instant_buy ?? false;
setSellerCapabilities({
  canCreateContactSeller,
  canCreateInstantBuy,
  isLoading: false,
});

// After
const canListItems = data.can_list_items ?? false;
setSellerCapabilities({
  canListItems,
  isLoading: false,
});
```

Transaction method is always `'claim'` — Flow 3 PRD removes the TransactionMethodSelector entirely and hardcodes the value.

**Modify file:** `lib/hooks/useListingForm.ts`

```typescript
// Before (lines 120-125)
sellerCapabilities: {
  canCreateContactSeller: boolean;
  canCreateInstantBuy: boolean;
  isLoading: boolean;
};

// After
sellerCapabilities: {
  canListItems: boolean;
  isLoading: boolean;
};
```

Update the `isValid` computed property (lines 262-263):

```typescript
// Before
if (transactionMethod === 'instant_buy' && !sellerCapabilities.canCreateInstantBuy) return false;
if (transactionMethod === 'contact_seller' && !sellerCapabilities.canCreateContactSeller) return false;

// After
if (!sellerCapabilities.canListItems) return false;
```

**Modify file:** `components/sell/phases/MarketPhase.tsx`

```typescript
// Before (lines 28-29)
canCreateContactSeller: boolean;
canCreateInstantBuy: boolean;

// After — remove these props entirely
// Flow 3 PRD removes TransactionMethodSelector and all capability-based props from MarketPhase
```

**Note:** Flow 3 PRD performs a more comprehensive cleanup of MarketPhase (removing the TransactionMethodSelector import/render and relocating the phone prompt). The `canUseInstantBuy` prop to TransactionMethodSelector is also removed because that component is deleted entirely.

**Modify file:** `app/[locale]/seller/onboard/page.tsx`

Update the `OnboardingStatus` interface (line 18):

```typescript
// Before
interface OnboardingStatus {
  seller_status: string;
  terms_accepted: boolean;
  onboarding_completed: boolean;
  can_list_items: boolean;
}

// After — no change needed, it already only uses onboarding_completed and can_list_items
```

---

### 3.4 Remove Silent Country Auto-Save & Use CountryPrompt

The onboarding page currently calls `detectAndSaveCountry()` which silently writes the geo-detected country to the database without user confirmation. This is buggy (VPN/proxy/travel gives wrong country) and inconsistent with the CountryPrompt Variant A pattern designed in Flow 1.

#### 3.4.1 Remove auto-detect-and-save logic

**Modify file:** `app/[locale]/seller/onboard/page.tsx`

Remove the entire `detectAndSaveCountry` function (lines 66-90) and its call in `fetchStatus` (line 121). Also remove the `detectingCountry` state variable and its usage in the loading check (line 149).

#### 3.4.2 Replace inline country selector with CountryPrompt

The onboarding page has its own country selector (flag buttons in a frost-ice box, lines 237-265). Replace this with the enhanced `CountryPrompt` component (from Flow 1 PRD Section 3.5) for a consistent UX.

```typescript
// Before: inline country selector in the onboarding form
<div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-3 sm:p-4 mb-4 -mx-1 sm:mx-0">
  <p className="font-semibold ...">{t('step1.country.title')}</p>
  <div className="flex flex-wrap gap-2">
    {COUNTRY_CODES.map((c) => (
      <button ...>{tCountry(c.code)}</button>
    ))}
  </div>
  <p className="text-xs ...">{t('step1.country.hint')}</p>
</div>

// After: reuse CountryPrompt component
import { CountryPrompt } from '@/components/onboarding';

// Inside the form, where the country selector was:
{!profile?.country && <CountryPrompt variant="inline" />}
{profile?.country && (
  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
    <span className={getCountryFlag(profile.country)} />
    <span>{tCountry(profile.country)}</span>
    <button
      onClick={() => setEditingCountry(true)}
      className="text-frost-ice hover:underline text-xs"
    >
      {t('step1.country.change')}
    </button>
  </div>
)}
```

**Note:** The `CountryPrompt` component (enhanced in Flow 1) already handles geo-detection with user confirmation (Variant A/B). The `variant="inline"` prop may need to be added to CountryPrompt to render without the orange banner wrapper — or the onboarding page can use the existing banner style since it fits the form context.

**Implementation detail:** Claude Code should evaluate whether CountryPrompt needs an `inline` variant prop or if the existing component renders acceptably within the onboarding form layout. The key requirement is: no silent auto-save, user must explicitly confirm their country.

#### 3.4.3 Remove inline country selector code

Remove from `app/[locale]/seller/onboard/page.tsx`:
- `COUNTRY_CODES` array (lines 12-16)
- `savingCountry` state (line 39)
- `handleSelectCountry` function (lines 42-60)
- The inline country selector JSX (lines 237-265)
- `CountryCode` type import (if no longer needed)

---

### 3.5 Fix Country Validation Bugs

#### 3.5.1 Add country check to listing creation API

**Modify file:** `app/api/listings/route.ts`

Add a country check after the seller status validation (after line 98):

```typescript
// After seller_profiles check, before rate limit check:
// Verify seller has a country set
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('country, phone')
  .eq('id', user.id)
  .single();

if (!userProfile?.country) {
  return NextResponse.json(
    {
      error: 'Please set your country before creating a listing.',
      requiresCountry: true,
      settingsUrl: '/account/settings'
    },
    { status: 403 }
  );
}
```

**Optimization:** This query can be combined with the existing phone check (lines 121-126) which already queries `user_profiles.phone`. Move the phone check here and do one query instead of two:

```typescript
// One query for both country and phone
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('country, phone')
  .eq('id', user.id)
  .single();

if (!userProfile?.country) {
  return NextResponse.json({ error: '...', requiresCountry: true, settingsUrl: '/account/settings' }, { status: 403 });
}

// All listings are Claim — phone is always required for shipping labels
if (!userProfile.phone || userProfile.phone.trim() === '') {
  return NextResponse.json({ error: '...', requiresPhone: true, settingsUrl: '/profile/settings' }, { status: 403 });
}
```

#### 3.5.2 Remove LV-only instant buy country logic

**Note:** Flow 3 PRD deletes `TransactionMethodSelector.tsx` entirely and removes `isInstantBuyCountry` from `sell/page.tsx`. The changes below are superseded by Flow 3's more comprehensive cleanup. If Flow 3 runs first, this section can be skipped.

**If implementing independently (Flow 2 before Flow 3):**

**Modify file:** `app/[locale]/sell/page.tsx`

```typescript
// Before (line 301)
const isInstantBuyCountry = profile?.country === 'LV' || !profile?.country;

// After — all Baltic countries can sell (LV, LT, EE)
const isBalticCountry = ['LV', 'LT', 'EE'].includes(profile?.country || '');
```

This removes the LV-only gate. All sellers from LV, LT, and EE can create Claim listings. Sellers without a country must set one first (enforced by Section 3.5.1).

---

### 3.6 Remove "Step 1" Label

**Modify file:** `app/[locale]/seller/onboard/page.tsx`

Remove the step number from the heading:

```tsx
// Before
<h2 className="text-xl sm:text-2xl font-semibold text-polar-night mb-6">
  {t('step1.title')}
</h2>
```

The `step1.title` translation key is "Step 1: Accept seller terms". Either:
- Rename the translation to just "Accept seller terms" (cleaner), or
- Create a new key and keep `step1.*` subkeys for minimal churn

**Recommended:** Keep the `step1.*` key structure to avoid touching every subkey reference, but update the `step1.title` value:

```json
// messages/en.json
"step1": {
  "title": "Accept seller terms",  // was "Step 1: Accept seller terms"
  ...
}

// messages/lv.json
"step1": {
  "title": "Pieņem pārdevēja noteikumus",  // was "1. solis: Pieņem pārdevēja noteikumus"
  ...
}
```

Also remove the numbered circle (step indicator) from the JSX:

```tsx
// Before (lines 198-201)
<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 bg-frost-ice">
  <span className="text-white font-semibold text-base sm:text-lg">1</span>
</div>

// After: remove this entire div
```

---

### 3.7 Add "Start Selling" to Mobile ProfileBottomSheet

**Modify file:** `components/layout/ProfileBottomSheet.tsx`

Currently, desktop `UserMenu` shows "Start Selling" for non-sellers (line 170) but `ProfileBottomSheet` (mobile) does not. Add the same link.

Insert after the non-seller "Saved & Wanted" button (around line 368), within the same `!isActiveSeller` conditional block:

```tsx
{!isActiveSeller && (
  <button
    onClick={() => handleNavigate('/seller/onboard')}
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
  >
    <Store className="w-5 h-5 text-aurora-green" />
    <span className="text-polar-night font-medium">{t('userMenu.startSelling')}</span>
  </button>
)}
```

The `userMenu.startSelling` translation key already exists (used by desktop UserMenu).

**Also:** Ensure the `Store` icon is imported in ProfileBottomSheet (check existing imports).

---

### 3.8 Fix Support Email — Resolved by Deletion

The `sellers@secondturn.games` reference only exists in the completion page (`/seller/onboard/complete/page.tsx` line 202), which is being deleted in Section 3.2. The onboarding page already uses `info@secondturn.games` (line 310). No further changes needed.

---

### 3.9 Clean Up seller_status Type

**Modify file:** `lib/types/seller.ts`

```typescript
// Before (line 42)
seller_status: 'not_started' | 'onboarding' | 'active' | 'suspended';

// After
seller_status: 'not_started' | 'active' | 'suspended';
```

`'onboarding'` is never set or checked anywhere in the codebase. The flow goes directly from no row / `'not_started'` → `'active'`.

Keep `'suspended'` — it's not used yet but is a legitimate future state (e.g., policy violations). Removing it would require re-adding later.

---

### 3.10 Fix Age Requirement: 16+ → 18+

The seller terms legal documents (both EN and LV MDX) already require sellers to be **18 years old** — but the onboarding UI shows 16+. This is a discrepancy. The general platform terms (`terms.mdx`) require 16 for browsing/buying, which is correct as a separate, lower threshold. The onboarding UI needs to match the seller terms.

**Modify files:** `messages/en.json`, `messages/lv.json`

```json
// messages/en.json — SellerOnboard.step1.keyPoints.ageRequirement
// Before
"ageRequirement": "You must be at least <strong>16 years old</strong>"
// After
"ageRequirement": "You must be at least <strong>18 years old</strong>"

// messages/en.json — SellerOnboard.step1.checkbox
// Before
"checkbox": "I confirm I'm 16+, selling personal items, and agree to the"
// After
"checkbox": "I confirm I'm 18+, selling personal items, and agree to the"
```

```json
// messages/lv.json — SellerOnboard.step1.keyPoints.ageRequirement
// Before
"ageRequirement": "Tev jābūt vismaz <strong>16 gadus vecam</strong>"
// After
"ageRequirement": "Tev jābūt vismaz <strong>18 gadus vecam</strong>"

// messages/lv.json — SellerOnboard.step1.checkbox
// Before
"checkbox": "Es apstiprinu, ka esmu 16+, pārdodu personīgas lietas un piekrītu"
// After
"checkbox": "Es apstiprinu, ka esmu 18+, pārdodu personīgas lietas un piekrītu"
```

No code changes needed — the component renders these values from translations.

---

### 3.11 Add Server-Side Country Validation to Accept-Terms

The "Accept seller terms" button is disabled client-side when no country is set, but the API itself doesn't check. A direct POST to `/api/seller/onboarding/accept-terms` succeeds for a user with NULL country, creating an active seller who can't meaningfully use the platform.

**Modify file:** `app/api/seller/onboarding/accept-terms/route.ts`

Add after the `termsVersion` validation:

```typescript
// Verify user has a country set (required for shipping/payment)
const { data: userProfile, error: profileError } = await supabase
  .from('user_profiles')
  .select('country')
  .eq('id', user.id)
  .single();

if (profileError || !userProfile?.country) {
  return NextResponse.json(
    { error: 'Please select your country before becoming a seller.' },
    { status: 400 }
  );
}
```

---

### 3.12 Server-Controlled Terms Version

Currently the client sends `termsVersion: '1.0'` in the POST body and the server stores it as-is. This means the server trusts whatever version string the client provides — a cached or modified client could send any value. When seller terms are updated in the future, there'd be no reliable way to determine which version a seller actually accepted.

**Modify file:** `app/api/seller/onboarding/accept-terms/route.ts`

```typescript
// Add at top of file
const CURRENT_SELLER_TERMS_VERSION = '1.0';

// In the handler — remove client termsVersion parsing, use server constant:
// Before
const { termsVersion } = body;
if (!termsVersion) {
  return NextResponse.json({ error: 'Terms version is required' }, { status: 400 });
}

// After
// Client no longer needs to send termsVersion — server controls it
const termsVersion = CURRENT_SELLER_TERMS_VERSION;
```

And in the upsert:

```typescript
seller_terms_version: CURRENT_SELLER_TERMS_VERSION,  // server-controlled
```

**Also update the client** — the onboarding page currently sends `termsVersion: '1.0'` in the POST body. This can be removed since the server ignores it, but the request still works if it's present (server just doesn't read it). Low priority to clean up client-side.

**Version tracking purpose:** The stored version is for audit/compliance only — knowing which version was in effect when a seller activated. When terms are updated, they apply automatically to all sellers (sellers who disagree can stop using the platform). There is no re-acceptance flow.

---

## 4. Database Migrations

No database migrations needed for Flow 2. All changes are code-only.

(Wallet creation in accept-terms is covered by Flow 1 PRD migration.)

---

## 5. Files Changed — Complete List

### Delete (5 files)
| File | Reason |
|------|--------|
| `components/account/SellerCTACard.tsx` | Orphaned — never imported |
| `components/seller/EarningsSummary.tsx` | Orphaned — superseded by wallet components |
| `components/seller/PayoutHistory.tsx` | Orphaned — superseded by WithdrawalHistory |
| `components/seller/Dac7StatusCard.tsx` | Orphaned — superseded by Dac7WarningBanner |
| `app/[locale]/seller/onboard/complete/page.tsx` | Replaced by redirect to `/sell?welcome=true` |

### Modify (14+ files)
| File | Change |
|------|--------|
| `app/[locale]/seller/onboard/page.tsx` | Remove auto-detect-and-save, remove inline country selector, replace with CountryPrompt, remove step number, update redirects from `/seller/onboard/complete` to `/sell` |
| `app/api/seller/onboarding/status/route.ts` | Remove `can_create_contact_seller`, `can_create_instant_buy`, `needs_dac7_info` |
| `app/api/seller/onboarding/accept-terms/route.ts` | Add server-side country validation, use server-controlled `CURRENT_SELLER_TERMS_VERSION` constant instead of client-sent value |
| `app/api/listings/route.ts` | Add country validation, combine user_profiles query for country + phone |
| `app/[locale]/sell/page.tsx` | Update sellerCapabilities consumption, add welcome toast. **Flow 3 extends:** removes isInstantBuyCountry and transactionMethod form logic |
| `lib/hooks/useListingForm.ts` | Simplify sellerCapabilities type to `{ canListItems, isLoading }` |
| `components/sell/phases/MarketPhase.tsx` | Remove canCreateContactSeller/canCreateInstantBuy props, use canListItems. **Flow 3 extends:** also removes TransactionMethodSelector import and adds phone prompt |
| `components/sell/TransactionMethodSelector.tsx` | **Superseded by Flow 3** (component deleted entirely) |
| `components/layout/ProfileBottomSheet.tsx` | Add "Start Selling" link for non-sellers |
| `lib/types/seller.ts` | Remove `'onboarding'` from seller_status type |
| `messages/en.json` | Remove `SellerOnboard.complete` namespace, update `step1.title`, update age 16→18 in `step1.keyPoints.ageRequirement` and `step1.checkbox`, add `Sell.welcome.sellerActivated`, remove orphaned component namespaces |
| `messages/lv.json` | Same translation changes as en.json |

---

## 6. Translation Keys

### Remove
- `SellerOnboard.complete.*` (entire namespace — 8 top-level keys with deep nesting)
- `SellerDashboard.EarningsSummary.*` (orphaned component — 7 keys)
- Note: `Dashboard.SellerCTA` translations are still used by the account settings page inline CTA banner — do NOT remove
- Note: `PayoutHistory` and `Dac7StatusCard` have no translation namespaces

### Modify
- `SellerOnboard.step1.title` — remove "Step 1: " prefix (both en and lv)
- `SellerOnboard.step1.keyPoints.ageRequirement` — "16 years old" → "18 years old" (both en and lv)
- `SellerOnboard.step1.checkbox` — "16+" → "18+" (both en and lv)

### Add
- `Sell.welcome.sellerActivated` — "You're a seller now — list your first game" (en) / TBD (lv)
- `SellerOnboard.step1.country.change` — "Change" (en) / "Mainīt" (lv) — for the country display after selection

EN and LV only for launch.

---

## 7. Acceptance Criteria

### Dead Code Removal
- [ ] `SellerCTACard` deleted; no broken imports
- [ ] `EarningsSummary` deleted; no broken imports
- [ ] `PayoutHistory` deleted; no broken imports
- [ ] `Dac7StatusCard` deleted; no broken imports
- [ ] Completion page directory deleted; no routes reference it

### Completion Page Removal
- [ ] After accept-terms, user is redirected to `/sell?welcome=true`
- [ ] Sell page shows celebration toast ("You're a seller now — list your first game")
- [ ] Toast appears once; URL param is cleaned after display
- [ ] Visiting `/seller/onboard` as an active seller redirects to `/sell` (no `?welcome`)
- [ ] No remaining references to `/seller/onboard/complete` in codebase

### Status API Simplification
- [ ] `GET /api/seller/onboarding/status` response no longer includes `can_create_contact_seller`, `can_create_instant_buy`, or `needs_dac7_info`
- [ ] Sell page uses `can_list_items` only
- [ ] `sellerCapabilities` in `useListingForm` has shape `{ canListItems: boolean; isLoading: boolean }`
- [ ] All consumers compile without errors

### Country Fixes
- [ ] Onboarding page does NOT auto-save country from geo-detection
- [ ] Onboarding page uses `CountryPrompt` component (with geo-detection confirmation UX from Flow 1)
- [ ] `POST /api/listings` returns 403 if seller has no country set
- [ ] Sellers with no country cannot publish listings (enforced by listing creation API country check)
- [ ] **Flow 3 extends:** `isInstantBuyCountry` removed entirely — all Baltic countries can sell

### UX Fixes
- [ ] Onboarding page heading says "Accept seller terms" (no "Step 1:")
- [ ] Step number circle (1) is removed from onboarding form
- [ ] Mobile ProfileBottomSheet shows "Start Selling" for non-sellers
- [ ] No `sellers@secondturn.games` references remain — all use `info@secondturn.games`

### Age Requirement
- [ ] Onboarding key points show "18 years old" (not 16)
- [ ] Onboarding checkbox reads "I confirm I'm 18+..." (not 16+)
- [ ] Both en and lv translations updated
- [ ] Matches existing seller-terms.mdx legal content (EN: "18 years old", LV: "18 gadus vecs")

### Accept-Terms Hardening
- [ ] `POST /api/seller/onboarding/accept-terms` returns 400 if user has no country set
- [ ] Server uses `CURRENT_SELLER_TERMS_VERSION` constant; client-sent `termsVersion` is ignored
- [ ] `seller_profiles.seller_terms_version` stores the server constant value

### Type Cleanup
- [ ] `seller_status` type no longer includes `'onboarding'`
- [ ] All type references compile

---

## 8. Implementation Order

1. **Delete orphaned components** — safe, no consumers (Section 3.1)
2. **Delete completion page + update redirects** — update onboarding page redirects first, then delete (Sections 3.2.1–3.2.3)
3. **Add celebration toast to sell page** — depends on step 2 (Section 3.2.4)
4. **Simplify status API + update consumers** — touch status route, then sell page, useListingForm, MarketPhase (Section 3.3)
5. **Country selector replacement** — depends on Flow 1 CountryPrompt enhancement being complete (Section 3.4)
6. **Fix country validation bugs** — listing API + accept-terms API + sell page (Sections 3.5, 3.11). Note: TransactionMethodSelector fix superseded by Flow 3 deletion.
7. **UX fixes** — step label, mobile nav, support email, type cleanup (Sections 3.6–3.9)
8. **Age requirement + terms version** — translation updates + accept-terms server constant (Sections 3.10, 3.12)

Steps 1–4 and 7–8 can be done independently of Flow 1. Steps 5–6 depend on Flow 1's CountryPrompt enhancement.

---

## 9. Decisions (Resolved)

1. **Completion page disposition:** Delete entirely. Redirect to `/sell?welcome=true` with celebration toast. Educational content (how selling works, tips) deferred to dashboard empty state improvements.

2. **Country selection UX:** Reuse the enhanced CountryPrompt from Flow 1 instead of the onboarding page's own inline selector. One consistent country selection pattern across the platform.

3. **Status API simplification:** Collapse `can_create_contact_seller` + `can_create_instant_buy` into existing `can_list_items`. Transaction method is always `'claim'` (hardcoded in Flow 3). Country validation happens at listing creation time, not at status check time.

4. **`'onboarding'` seller status:** Remove from type definition. Never set, never checked. Can be re-added if a multi-step onboarding is introduced later.

5. **`'suspended'` seller status:** Keep. Not used yet but is a legitimate future moderation state.

6. **`has_phone` in status response:** Keep for now. Although nothing in the onboarding flow uses it, the sell page reads it to set `hasPhone` state. Removing it would require refactoring the sell page phone handling, which is out of scope.

7. **Age requirement 16 → 18:** The seller terms legal documents (both EN and LV MDX) already require 18. The onboarding UI was showing 16, which was a discrepancy. General platform terms correctly remain at 16 for browsing/buying.

8. **`is_founding_seller` badge logic:** Deferred — will investigate separately as part of a broader badges review.

9. **Terms version control:** Server-side constant. The client no longer controls which version string is stored. Version is tracked for audit/compliance only (which version was in effect at activation). Updated terms apply automatically to all sellers — no re-acceptance flow.
