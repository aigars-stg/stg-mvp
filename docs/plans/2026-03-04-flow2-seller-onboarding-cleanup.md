# Flow 2: Seller Onboarding Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up seller onboarding dead code, simplify status API, fix country bugs, remove completion page, add mobile nav entry point, and fix age requirement.

**Architecture:** Code-only changes (no DB migrations). Delete orphaned components first, then simplify API layer, then update consumers, then UX fixes. All paths relative to `packages/marketplace/`.

**Tech Stack:** Next.js 14 App Router, Supabase, next-intl, Tailwind CSS

**Depends on:** Flow 1 (completed) — CountryPrompt with geo-detection, wallet creation in accept-terms

---

## Context

The seller onboarding flow works but has accumulated dead code (4 orphaned components, 1 dead-end completion page), redundant API fields (`can_create_contact_seller`/`can_create_instant_buy` always equal `can_list_items`), a silently-buggy country auto-save, and a UI showing 16+ instead of 18+ for age requirement. The status API returns 3 identical booleans that can be collapsed into 1.

---

## Task 1: Delete Orphaned Components

**Files:**
- Delete: `components/account/SellerCTACard.tsx`
- Delete: `components/seller/EarningsSummary.tsx`
- Delete: `components/seller/PayoutHistory.tsx`
- Delete: `components/seller/Dac7StatusCard.tsx`
- Modify: `messages/en.json` — remove `SellerDashboard.EarningsSummary` namespace (lines 2663-2671)
- Modify: `messages/lv.json` — remove `SellerDashboard.EarningsSummary` namespace (lines 2667-2675) and `SellerDashboard.PayoutHistory` namespace (lines 2676-2688)

**Step 1:** Delete the 4 component files.

**Step 2:** Verify no imports remain:
```bash
grep -r "SellerCTACard\|EarningsSummary\|PayoutHistory\|Dac7StatusCard" --include="*.ts" --include="*.tsx" packages/marketplace/ | grep -v "node_modules"
```
Expected: 0 matches (the components only reference themselves)

Note: `Dashboard.SellerCTA` translation keys are used by the account settings page inline CTA — do NOT remove those translations.

**Step 3:** Remove orphaned translation namespaces from en.json:
- Remove `SellerDashboard.EarningsSummary` object (7 keys, lines 2663-2671)

**Step 4:** Remove orphaned translation namespaces from lv.json:
- Remove `SellerDashboard.EarningsSummary` object (7 keys, lines 2667-2675)
- Remove `SellerDashboard.PayoutHistory` object (lines 2676-2688)

Note: en.json has no `PayoutHistory` namespace (already cleaned up). lv.json has both.

**Step 5:** Run `pnpm type-check`

---

## Task 2: Delete Completion Page & Update Redirects

**Files:**
- Modify: `app/[locale]/seller/onboard/page.tsx` — update 2 redirects
- Delete: `app/[locale]/seller/onboard/complete/` (entire directory)
- Modify: `messages/en.json` — remove `SellerOnboard.complete` namespace (lines 2093-2158)
- Modify: `messages/lv.json` — remove `SellerOnboard.complete` namespace (lines 2093-2158)

**Step 1:** Edit `app/[locale]/seller/onboard/page.tsx`:

Change line 110 (already-active redirect):
```typescript
// Before
router.push('/seller/onboard/complete');
// After
router.push('/sell');
```

Change line 151 (post-accept redirect):
```typescript
// Before
router.push('/seller/onboard/complete');
// After
router.push('/sell?welcome=true');
```

**Step 2:** Delete `app/[locale]/seller/onboard/complete/` directory.

**Step 3:** Remove `SellerOnboard.complete` namespace from en.json (the entire `"complete": { ... }` object inside SellerOnboard, lines 2093-2158).

**Step 4:** Remove `SellerOnboard.complete` namespace from lv.json (same structure, lines 2093-2158).

**Step 5:** Verify no remaining references:
```bash
grep -r "onboard/complete" --include="*.ts" --include="*.tsx" packages/marketplace/
```
Expected: 0 matches

**Step 6:** Run `pnpm type-check`

---

## Task 3: Add Celebration Toast to Sell Page

**Files:**
- Modify: `app/[locale]/sell/page.tsx` — add welcome toast in `CreateModeSellContent` (around line 1100)
- Modify: `messages/en.json` — add `Sell.welcome.sellerActivated` key
- Modify: `messages/lv.json` — add `Sell.welcome.sellerActivated` key

**Step 1:** Edit `app/[locale]/sell/page.tsx`. In the `CreateModeSellContent` function (starts ~line 1095), add the welcome toast. This component already has `searchParams` (line 1110) and `useTranslations('Sell.page')` (line 1100).

Add import at top of file:
```typescript
import { useToast } from '@/components/common/Toast';
```

Inside `CreateModeSellContent`, after the existing `searchParams` usage (~line 1166), add:
```typescript
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

Note: `t` is already bound to `useTranslations('Sell.page')` at line 1100. The `welcome.sellerActivated` key goes in the `Sell.page` namespace (since `t = useTranslations('Sell.page')`). Actually, looking again — `t` is for `'Sell.page'` so the translation key must be `Sell.page.welcome.sellerActivated`. Let me correct: the key in the JSON should be nested under `Sell > page > welcome > sellerActivated`.

**Step 2:** Add translation key to en.json. Find the `Sell.page` namespace and add inside it:
```json
"welcome": {
  "sellerActivated": "You're a seller now — list your first game"
}
```

**Step 3:** Add translation key to lv.json:
```json
"welcome": {
  "sellerActivated": "Tu tagad esi pārdevējs — ievieto savu pirmo spēli"
}
```

**Step 4:** Run `pnpm type-check`

---

## Task 4: Simplify Status API

**Files:**
- Modify: `app/api/seller/onboarding/status/route.ts`

**Step 1:** Edit `app/api/seller/onboarding/status/route.ts`. Replace the capability computation and response (lines 38-58) with:

```typescript
const onboardingCompleted = termsAccepted && isActive;

const statusData = {
  seller_status: sellerProfile?.seller_status || 'not_started',
  terms_accepted: termsAccepted,
  onboarding_completed: onboardingCompleted,
  can_list_items: onboardingCompleted,
  has_phone: hasPhone,
  has_payout_info: !!(sellerProfile?.payout_iban && sellerProfile?.payout_account_holder_name),
};
```

Removed fields: `can_create_contact_seller`, `can_create_instant_buy`, `needs_dac7_info`.

**Step 2:** Run `pnpm type-check`

---

## Task 5: Update Status API Consumers — Sell Page & Listing Form

**Files:**
- Modify: `app/[locale]/sell/page.tsx` — update `useSharedSellLogic` (lines 278-325)
- Modify: `lib/hooks/useListingForm.ts` — simplify sellerCapabilities type (lines 120-125, 197-201, 252-266)

**Step 1:** Edit `lib/hooks/useListingForm.ts`.

Change the type definition (lines 120-125):
```typescript
// Before
sellerCapabilities: {
  canCreateContactSeller: boolean;
  canCreateInstantBuy: boolean;
  isLoading: boolean;
};
setSellerCapabilities: (value: { canCreateContactSeller: boolean; canCreateInstantBuy: boolean; isLoading: boolean }) => void;

// After
sellerCapabilities: {
  canListItems: boolean;
  isLoading: boolean;
};
setSellerCapabilities: (value: { canListItems: boolean; isLoading: boolean }) => void;
```

Change the state initialization (lines 197-201):
```typescript
// Before
const [sellerCapabilities, setSellerCapabilities] = useState({
  canCreateContactSeller: false,
  canCreateInstantBuy: false,
  isLoading: true,
});

// After
const [sellerCapabilities, setSellerCapabilities] = useState({
  canListItems: false,
  isLoading: true,
});
```

Change the `canSubmit` helper (lines 261-263):
```typescript
// Before
if (transactionMethod === 'instant_buy' && !sellerCapabilities.canCreateInstantBuy) return false;
if (transactionMethod === 'contact_seller' && !sellerCapabilities.canCreateContactSeller) return false;

// After
if (!sellerCapabilities.canListItems) return false;
```

**Step 2:** Edit `app/[locale]/sell/page.tsx`. In `useSharedSellLogic`, update the `fetchSellerCapabilities` function (lines 278-325):

```typescript
// Before (lines 288-296)
const canCreateContactSeller = data.can_create_contact_seller ?? false;
const canCreateInstantBuy = data.can_create_instant_buy ?? false;

setHasPhone(data.has_phone ?? true);

setSellerCapabilities({
  canCreateContactSeller,
  canCreateInstantBuy,
  isLoading: false,
});

// After
const canListItems = data.can_list_items ?? false;

setHasPhone(data.has_phone ?? true);

setSellerCapabilities({
  canListItems,
  isLoading: false,
});
```

Update the initial transaction method logic (lines 299-306):
```typescript
// Before
if (!hasSetInitialListingType.current) {
  hasSetInitialListingType.current = true;
  const isInstantBuyCountry = profile?.country === 'LV' || !profile?.country;
  setFormData((prev) => ({
    ...prev,
    transactionMethod: (canCreateInstantBuy && isInstantBuyCountry) ? 'instant_buy' : 'contact_seller',
  }));
}

// After
if (!hasSetInitialListingType.current) {
  hasSetInitialListingType.current = true;
  setFormData((prev) => ({
    ...prev,
    transactionMethod: 'claim',
  }));
}
```

Update error handling blocks (lines 308-319) similarly:
```typescript
// Before
setSellerCapabilities({
  canCreateContactSeller: false,
  canCreateInstantBuy: false,
  isLoading: false,
});

// After
setSellerCapabilities({
  canListItems: false,
  isLoading: false,
});
```
(Apply this change to both the `!response.ok` block and the `catch` block.)

**Step 3:** Run `pnpm type-check` — this will likely show errors in MarketPhase props. Fix in next task.

---

## Task 6: Update MarketPhase Props

**Files:**
- Modify: `components/sell/phases/MarketPhase.tsx` — simplify props
- Modify: `app/[locale]/sell/page.tsx` — update MarketPhase call site (~line 1574)

**Step 1:** Edit `components/sell/phases/MarketPhase.tsx`.

Update `MarketPhaseProps` interface (lines 27-31):
```typescript
// Before
sellerCapabilities: {
  canCreateContactSeller: boolean;
  canCreateInstantBuy: boolean;
  isLoading: boolean;
};
sellerCountry: string | null | undefined;
onUpgradeClick: () => void;

// After
sellerCapabilities: {
  canListItems: boolean;
  isLoading: boolean;
};
```

Remove `sellerCountry` and `onUpgradeClick` from the props interface.

Update function parameters (line 46-57) to remove `sellerCountry` and `onUpgradeClick`.

Update the TransactionMethodSelector rendering (lines 66-82). Replace the entire `{!sellerCapabilities.isLoading && (` block with nothing — the TransactionMethodSelector is being rendered but with the simplified capabilities, it should just show the default claim method. Since Flow 3 deletes TransactionMethodSelector entirely, for now just remove the capability-specific props:

```tsx
{!sellerCapabilities.isLoading && (
  <Card padding="md">
    <TransactionMethodSelector
      value={formData.transactionMethod}
      onChange={(method) =>
        setFormData((prev) => ({ ...prev, transactionMethod: method }))
      }
      canUseInstantBuy={false}
      sellerCountry={null}
      onUpgradeClick={() => {}}
      hasPhone={hasPhone}
      phoneValue={sellerPhone || ''}
      onPhoneChange={onPhoneChange}
      defaultCountry={defaultCountry}
    />
  </Card>
)}
```

Note: We pass hardcoded `canUseInstantBuy={false}` and `sellerCountry={null}` since these will be removed entirely by Flow 3. This avoids changing TransactionMethodSelector's interface (which Flow 3 deletes).

**Step 2:** Update the MarketPhase call site in `app/[locale]/sell/page.tsx` (~line 1574):

```tsx
// Before
<MarketPhase
  formData={formData}
  setFormData={setFormData}
  onAdvance={advanceToNextPhase}
  isPhaseComplete={isCurrentPhaseComplete}
  sellerCapabilities={sellerCapabilities}
  sellerCountry={profile?.country}
  onUpgradeClick={() => router.push('/seller/dashboard?tab=earnings')}
  hasPhone={shared.hasPhone}
  sellerPhone={shared.sellerPhone}
  onPhoneChange={(phone) => shared.setSellerPhone(phone)}
  defaultCountry={(profile?.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode}
/>

// After
<MarketPhase
  formData={formData}
  setFormData={setFormData}
  onAdvance={advanceToNextPhase}
  isPhaseComplete={isCurrentPhaseComplete}
  sellerCapabilities={sellerCapabilities}
  hasPhone={shared.hasPhone}
  sellerPhone={shared.sellerPhone}
  onPhoneChange={(phone) => shared.setSellerPhone(phone)}
  defaultCountry={(profile?.country && ['LV', 'LT', 'EE'].includes(profile.country) ? profile.country : 'LV') as CountryCode}
/>
```

**Step 3:** Also check if MarketPhase is used in the EditModeSellContent. Search for `MarketPhase` in the file — if it's used there too, update that call site similarly.

**Step 4:** Run `pnpm type-check`

---

## Task 7: Country Fixes — Onboarding Page

**Files:**
- Modify: `app/[locale]/seller/onboard/page.tsx`

This task removes the silent auto-save country logic and the inline country selector, replacing them with the CountryPrompt component from Flow 1.

**Step 1:** Remove dead code from `app/[locale]/seller/onboard/page.tsx`:

- Remove `COUNTRY_CODES` array (lines 12-16)
- Remove `savingCountry` state (line 35)
- Remove `detectingCountry` state (line 32)
- Remove `handleSelectCountry` function (lines 38-58)
- Remove `detectAndSaveCountry` function (lines 61-88)
- Remove `detectAndSaveCountry()` call in `fetchStatus` (line 116)
- Remove `detectingCountry` from loading check (line 159)
- Remove `CountryCode` type import (line 10)

**Step 2:** Add CountryPrompt import:
```typescript
import { CountryPrompt } from '@/components/onboarding';
```

**Step 3:** Replace the inline country selector JSX (lines 237-268) with:
```tsx
{/* Country Selection */}
{!profile?.country && <CountryPrompt />}
{profile?.country && (
  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
    <span className={`fi fi-${profile.country.toLowerCase()}`} />
    <span>{tCountry(profile.country)}</span>
  </div>
)}
```

The CountryPrompt component already handles geo-detection with user confirmation (Variant A/B) and renders in an orange banner style that fits the form context.

**Step 4:** Remove the `tCountry` import if no longer needed. Actually, it's still needed for the country display when country is already set, so keep it.

**Step 5:** Run `pnpm type-check`

---

## Task 8: Country Validation in APIs

**Files:**
- Modify: `app/api/seller/onboarding/accept-terms/route.ts` — add country validation + server-controlled terms version
- Modify: `app/api/listings/route.ts` — add country check, combine user_profiles query

**Step 1:** Edit `app/api/seller/onboarding/accept-terms/route.ts`.

Add constant at top of file:
```typescript
const CURRENT_SELLER_TERMS_VERSION = '1.0';
```

After the existing `termsVersion` validation (line 14-19), add country check:
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

Replace the client-sent `termsVersion` with server constant. Change:
```typescript
// Before
const body = await request.json();
const { termsVersion } = body;

if (!termsVersion) {
  return NextResponse.json(
    { error: 'Terms version is required' },
    { status: 400 }
  );
}
```
to:
```typescript
// Server controls terms version — client value is ignored
const termsVersion = CURRENT_SELLER_TERMS_VERSION;
```

Keep `request.json()` parsing only if needed for other fields. If `termsVersion` was the only field, the `body` parsing can be removed entirely.

Update the upsert to use the constant:
```typescript
seller_terms_version: CURRENT_SELLER_TERMS_VERSION,
```

**Step 2:** Edit `app/api/listings/route.ts`. Replace the phone-only check (lines 119-137) with a combined country + phone check:

```typescript
// Verify seller has a country and phone set
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

// All listings are Claim — phone is always required for shipping labels
if (!userProfile.phone || userProfile.phone.trim() === '') {
  return NextResponse.json(
    {
      error: 'Phone number required for listings. Please add your phone number in your profile settings.',
      requiresPhone: true,
      settingsUrl: '/profile/settings'
    },
    { status: 403 }
  );
}
```

This replaces the `if (transactionMethod === 'instant_buy')` conditional phone check — all listings now require phone since they're all Claim type.

**Step 3:** Run `pnpm type-check`

---

## Task 9: UX Fixes — Step Label, Mobile Nav, Types

**Files:**
- Modify: `app/[locale]/seller/onboard/page.tsx` — remove step number heading and circle
- Modify: `components/layout/ProfileBottomSheet.tsx` — add "Start Selling" for non-sellers
- Modify: `lib/types/seller.ts` — remove `'onboarding'` from seller_status type
- Modify: `messages/en.json` — update `step1.title`
- Modify: `messages/lv.json` — update `step1.title`

**Step 1:** Edit `messages/en.json` — change `SellerOnboard.step1.title`:
```json
// Before
"title": "Step 1: Accept seller terms"
// After
"title": "Accept seller terms"
```

**Step 2:** Edit `messages/lv.json` — change `SellerOnboard.step1.title`:
```json
// Before
"title": "1. solis: Pieņem pārdevēja noteikumus"
// After
"title": "Pieņem pārdevēja noteikumus"
```

**Step 3:** Edit `app/[locale]/seller/onboard/page.tsx` — remove the step number circle. Remove lines 198-201:
```tsx
<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex-shrink-0 bg-frost-ice">
  <span className="text-white font-semibold text-base sm:text-lg">1</span>
</div>
```

Also update the wrapping `<div className="flex items-start gap-3 sm:gap-4">` — since the circle is gone, the flex layout with gap is no longer needed. Simplify the structure by removing the flex wrapper so the content renders directly.

**Step 4:** Edit `components/layout/ProfileBottomSheet.tsx`. Add "Start Selling" button for non-sellers.

After the non-seller "Saved & Wanted" button (line 367), inside the `!isActiveSeller` else-branch, add before the closing `)}`:
```tsx
<button
  onClick={() => handleNavigate('/seller/onboard')}
  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors"
>
  <Store className="w-5 h-5 text-aurora-green" />
  <span className="text-polar-night font-medium">{t('userMenu.startSelling')}</span>
</button>
```

The `Store` icon is already imported (line 7 of ProfileBottomSheet.tsx). The `userMenu.startSelling` translation key already exists (used by desktop UserMenu).

**Step 5:** Edit `lib/types/seller.ts` — remove `'onboarding'` from the union type (line 42):
```typescript
// Before
seller_status: 'not_started' | 'onboarding' | 'active' | 'suspended';
// After
seller_status: 'not_started' | 'active' | 'suspended';
```

**Step 6:** Run `pnpm type-check`

---

## Task 10: Age Requirement Fix (16 → 18)

**Files:**
- Modify: `messages/en.json` — update `SellerOnboard.step1.keyPoints.ageRequirement` and `step1.checkbox`
- Modify: `messages/lv.json` — same changes

**Step 1:** Edit `messages/en.json`:

Change `SellerOnboard.step1.keyPoints.ageRequirement` (line 2075):
```json
// Before
"ageRequirement": "You must be at least <strong>16 years old</strong>"
// After
"ageRequirement": "You must be at least <strong>18 years old</strong>"
```

Change `SellerOnboard.step1.checkbox` (line 2084):
```json
// Before
"checkbox": "I confirm I'm 16+, selling personal items, and agree to the"
// After
"checkbox": "I confirm I'm 18+, selling personal items, and agree to the"
```

**Step 2:** Edit `messages/lv.json`:

Change `SellerOnboard.step1.keyPoints.ageRequirement` (line 2075):
```json
// Before
"ageRequirement": "Tev jābūt vismaz <strong>16 gadus vecam</strong>"
// After
"ageRequirement": "Tev jābūt vismaz <strong>18 gadus vecam</strong>"
```

Change `SellerOnboard.step1.checkbox` (line 2084):
```json
// Before
"checkbox": "Es apstiprinu, ka esmu 16+, pārdodu personīgas lietas un piekrītu"
// After
"checkbox": "Es apstiprinu, ka esmu 18+, pārdodu personīgas lietas un piekrītu"
```

**Step 3:** Run `pnpm type-check`

---

## Verification

After all tasks complete:

```bash
# Type check
pnpm type-check

# Tests
pnpm test

# Build
pnpm build:ds && pnpm build:marketplace

# Verify dead code removed
grep -r "SellerCTACard" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "EarningsSummary" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "PayoutHistory" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "Dac7StatusCard" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "onboard/complete" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "can_create_contact_seller\|can_create_instant_buy\|needs_dac7_info" --include="*.ts" --include="*.tsx" packages/marketplace/  # → 0
grep -r "'onboarding'" --include="*.ts" packages/marketplace/lib/types/seller.ts  # → 0
```

**Manual checks:**
- [ ] 4 orphaned components deleted; no broken imports
- [ ] Completion page deleted; no routes reference it
- [ ] After accept-terms, redirects to `/sell?welcome=true`
- [ ] Sell page shows celebration toast, URL cleaned after display
- [ ] Visiting `/seller/onboard` as active seller redirects to `/sell`
- [ ] Status API no longer returns `can_create_contact_seller`, `can_create_instant_buy`, `needs_dac7_info`
- [ ] `sellerCapabilities` in useListingForm has shape `{ canListItems: boolean; isLoading: boolean }`
- [ ] Onboarding page does NOT auto-save country
- [ ] Onboarding page uses CountryPrompt component
- [ ] `POST /api/listings` returns 403 if no country
- [ ] `POST /api/seller/onboarding/accept-terms` returns 400 if no country
- [ ] Server uses `CURRENT_SELLER_TERMS_VERSION`, ignores client value
- [ ] Heading says "Accept seller terms" (no "Step 1:")
- [ ] Step number circle removed
- [ ] Mobile ProfileBottomSheet shows "Start Selling" for non-sellers
- [ ] Age requirement shows 18 (not 16) in both en and lv
- [ ] `seller_status` type is `'not_started' | 'active' | 'suspended'` (no `'onboarding'`)
