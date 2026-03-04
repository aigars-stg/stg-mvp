# Flow 3: Listing Creation Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all Contact Seller code paths, rename `instant_buy` → `claim`, delete 5 orphaned components/pages, fix auction transaction_method bug, simplify the type system, and relocate the phone prompt to MarketPhase.

**Architecture:** DB migration first (rename data), then delete dead components, then simplify the listing creation API (hardcode `claim`), then remove contact_seller from display/API consumers, then type system cleanup. All paths relative to `packages/marketplace/`.

**Tech Stack:** Next.js 14 App Router, Supabase, next-intl, Tailwind CSS

**Depends on:** Flow 2 (completed) — simplified status API, country validation in accept-terms, universal phone+country check in listings API

---

## Context

All STG listings are now platform-handled (EveryPay payment + Unisend T2T shipping). The codebase still carries Contact Seller infrastructure: a transaction method selector, conditional rendering in 6+ display components, cart blocking logic, legacy type helpers, and a dedicated help page. The `instant_buy` transaction method is being renamed to `claim`. All sellers from LV/LT/EE can create listings (the LV-only gate is removed).

Current DB state: 15 listings, all `transaction_method='instant_buy'`, `listing_type='instant_buy'`. Zero contact_seller. Zero auctions.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/115_flow3_claim_migration.sql`

**Step 1:** Verify current data via Supabase MCP:

```sql
SELECT transaction_method, listing_type, count(*) FROM listings GROUP BY 1, 2;
```
Expected: all rows are `instant_buy` / `instant_buy`.

**Step 2:** Apply migration via Supabase MCP. Order matters — update data before constraints:

```sql
-- 1. Migrate existing data: instant_buy → claim
UPDATE listings SET transaction_method = 'claim' WHERE transaction_method = 'instant_buy';
UPDATE listings SET listing_type = 'claim' WHERE listing_type = 'instant_buy';

-- 2. Drop old constraints and add new ones
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_transaction_method_check;
ALTER TABLE listings ADD CONSTRAINT listings_transaction_method_check
  CHECK (transaction_method = 'claim');

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('claim', 'auction'));

-- 3. Set default
ALTER TABLE listings ALTER COLUMN transaction_method SET DEFAULT 'claim';
```

**Step 3:** Verify migration:

```sql
SELECT transaction_method, listing_type, count(*) FROM listings GROUP BY 1, 2;
```
Expected: all rows are `claim` / `claim`.

---

## Task 2: Delete Orphaned Components

**Files:**
- Delete: `components/sell/ListingTypeSelector.tsx` (176 lines)
- Delete: `components/sell/PricingShipping.tsx` (167 lines)
- Delete: `components/sell/AuctionSettings.tsx` (97 lines)
- Delete: `components/sell/TransactionMethodSelector.tsx` (163 lines)

**Step 1:** Delete all 4 files.

**Step 2:** Verify no imports remain:
```bash
grep -r "ListingTypeSelector\|PricingShipping\|AuctionSettings\|TransactionMethodSelector" --include="*.ts" --include="*.tsx" packages/marketplace/ | grep -v "node_modules"
```
Expected: Only `MarketPhase.tsx` references `TransactionMethodSelector` — that import will be cleaned up in Task 4.

**Step 3:** Run `pnpm type-check` — expect errors from MarketPhase importing the deleted TransactionMethodSelector. That's fine, we fix it in Task 4.

---

## Task 3: Simplify Listing Creation API

**Files:**
- Modify: `app/api/listings/route.ts`

This task hardcodes `transaction_method = 'claim'`, removes legacy branching, and fixes the auction bug.

**Step 1:** Replace lines 26-70 (the entire transaction method/pricing format branching + validation) with:

```typescript
// All listings are Claim — server controls transaction method
const transactionMethod = 'claim';
const pricingFormat = body.pricingFormat === 'auction' ? 'auction' : 'fixed_price';

// Validate pricing format
if (!['fixed_price', 'auction'].includes(pricingFormat)) {
  return NextResponse.json(
    { error: 'Invalid pricing format' },
    { status: 400 }
  );
}

// Derive listing_type for backwards compatibility
const listingType = pricingFormat === 'auction' ? 'auction' : 'claim';
```

This removes:
- The `transactionMethod` / `pricingFormat` parsing from `body.transactionMethod` / `body.listingType` (lines 28-51)
- The `['contact_seller', 'instant_buy'].includes(transactionMethod)` validation (lines 54-59)
- The legacy `listingType` conversion for `body.listingType` (lines 35-46)

**Step 2:** Remove the `TransactionMethod` import from the file header (line 8). Keep `PricingFormat` if it's still used.

**Step 3:** The phone+country check is already universal from Flow 2 (lines 119-147). No changes needed there.

**Step 4:** In the GET handler, update the response mapping. Change line 477:
```typescript
// Before
transaction_method: row.transaction_method || (row.listing_type === 'instant_buy' ? 'instant_buy' : 'contact_seller'),
// After
transaction_method: row.transaction_method || 'claim',
```

And line 475:
```typescript
// Before
listing_type: row.listing_type || 'instant_buy',
// After
listing_type: row.listing_type || 'claim',
```

**Step 5:** Run `pnpm type-check`

---

## Task 4: Update MarketPhase — Remove TransactionMethodSelector, Add Phone Prompt

**Files:**
- Modify: `components/sell/phases/MarketPhase.tsx`
- Modify: `messages/en.json`
- Modify: `messages/lv.json`

**Step 1:** Read current `MarketPhase.tsx`. Remove the `TransactionMethodSelector` import and the entire block that renders it (lines 61-77).

**Step 2:** Add phone prompt directly in MarketPhase. Before the ConditionSelector block, add:

```tsx
{/* Phone prompt — required for shipping labels */}
{!hasPhone && onPhoneChange && (
  <div className="bg-snow-white border border-border rounded-lg p-3 sm:p-4">
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-aurora-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Phone className="w-4 h-4 text-aurora-orange" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-sm font-medium text-polar-night">
            {tSections('phone.label')}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {tSections('phone.description')}
          </p>
        </div>
        <PhoneInput
          value={sellerPhone || ''}
          onChange={onPhoneChange}
          compact
          defaultCountry={defaultCountry}
          id="seller-phone-inline"
        />
      </div>
    </div>
  </div>
)}
```

**Step 3:** Add the necessary imports at the top of MarketPhase:
```typescript
import { PhoneInput } from '@/components/common/PhoneInput';
import { Phone } from '@/lib/icons';
```

**Step 4:** Add a `tSections` translation hook:
```typescript
const tSections = useTranslations('Sell.sections');
```

**Step 5:** Clean up MarketPhase props — remove `canUseInstantBuy` and any TransactionMethodSelector-specific props. The remaining phone-related props (`hasPhone`, `sellerPhone`, `onPhoneChange`, `defaultCountry`) are already on the interface from Flow 2.

**Step 6:** Add translation keys to `messages/en.json` — inside `Sell` namespace, add:
```json
"sections": {
  "phone": {
    "label": "Phone number needed for shipping",
    "description": "Unisend parcel lockers need your phone number to create shipping labels. This will be saved to your profile."
  }
}
```

**Step 7:** Add translation keys to `messages/lv.json`:
```json
"sections": {
  "phone": {
    "label": "Piegādei nepieciešams tālruņa numurs",
    "description": "Unisend pakomātiem nepieciešams tavs tālruņa numurs, lai izveidotu sūtījuma uzlīmes. Tas tiks saglabāts tavā profilā."
  }
}
```

**Step 8:** Run `pnpm type-check`

---

## Task 5: Remove Contact Seller from Display Components

**Files:**
- Modify: `components/listing/ListingCard.tsx`
- Modify: `components/game/OfferCard.tsx`
- Modify: `components/browse/AggregatedGameCard.tsx`
- Modify: `components/listing/StatusChangeModal.tsx`
- Modify: `components/sell/ListingPreviewSidebar.tsx`

**Step 1:** Edit `ListingCard.tsx`:
- Remove `isContactSellerListing` import (line 8)
- Remove the contact_seller badge overlay (lines 177-182, the `{isContactSellerListing(listing) && (...)}` block)
- Remove the `!isContactSellerListing(listing)` guard around shipping info (line ~312) — always show shipping info
- Remove `MessageSquare` from imports if no longer used

**Step 2:** Edit `OfferCard.tsx`:
- Remove `isContactSellerListing` import (line 13)
- Remove the `handleContactSeller` function if only used in the contact_seller branch (lines 195-235)
- Simplify the desktop footer ternary (line ~717) — remove the `isContactSellerListing` branch, keep only the "Add to Cart" button
- Simplify the mobile footer ternary (line ~849) — same change
- Remove the "Contact Seller Notice" block (lines 789-798)
- Remove `Handshake` from imports if no longer used

**Step 3:** Edit `AggregatedGameCard.tsx`:
- Remove the `contact_seller_count` icon block (lines 105-109, the Handshake icon)
- Rename `instant_buy_count` references to `claim_count` in the tooltip text (or keep `instant_buy_count` to match the type for now — we rename the type in Task 8)

**Step 4:** Edit `StatusChangeModal.tsx`:
- Remove `ListingType` import (line 5)
- Remove `listingType` prop (line 16-17)
- Remove `isContactSeller` derivation (line 30) and all conditional rendering based on it (lines 36-45)
- Always use the Claim variant for sold confirmation icon and description

**Step 5:** Edit `ListingPreviewSidebar.tsx`:
- Remove the contact_seller branch in the "Sale type" section (lines 249-264)
- Simplify to always show a single label based on `pricingFormat` only (Fixed Price or Auction)
- Remove `MessageSquare` from imports if no longer used

**Step 6:** Run `pnpm type-check`

---

## Task 6: Remove Contact Seller from API Routes

**Files:**
- Modify: `app/api/cart/route.ts`
- Modify: `app/api/games/route.ts`
- Modify: `app/api/games/[id]/offers/route.ts`

**Step 1:** Edit `cart/route.ts`:
- Remove the contact_seller blocking check (lines 89-107). Remove the query that fetches `listing_type, transaction_method` just for this check. All listings are now cartable.

**Step 2:** Edit `games/route.ts`:
- Remove `contactSellerCount` counter (line 300)
- Remove `isContactSeller` check (line 314)
- Remove the `if (isContactSeller)` branch (lines 337-340) — all non-auction listings increment `instantBuyCount` (rename to `claimCount` in Task 8 or keep for now)
- Remove `contact_seller_count` from the response object (line 405)

**Step 3:** Edit `games/[id]/offers/route.ts`:
- Remove the `listingType` query parameter parsing (line 111)
- Remove the `listingType` filter (lines 213-215)
- Optionally add `pricingFormat` filter instead:
```typescript
const pricingFormat = searchParams.get('pricingFormat');
if (pricingFormat && ['fixed_price', 'auction'].includes(pricingFormat)) {
  query = query.eq('pricing_format', pricingFormat);
}
```

**Step 4:** Run `pnpm type-check`

---

## Task 7: Remove LV-Only Restriction & Fix Checkout Fallback

**Files:**
- Modify: `app/[locale]/sell/page.tsx`
- Modify: `app/api/checkout/create-session/route.ts`

**Step 1:** Edit `sell/page.tsx`:

In `fetchSellerCapabilities` (around line 302), the `transactionMethod` assignment. Change:
```typescript
// Before
setFormData((prev) => ({
  ...prev,
  transactionMethod: 'contact_seller',
}));

// After — remove this entirely, transactionMethod is removed from form data in Task 8
```

Remove the legacy `listing_type` fallback mapping in edit mode (lines 351-352):
```typescript
// Before
const transactionMethod: TransactionMethod = listing.transaction_method
  || (listing.listing_type === 'contact_seller' ? 'contact_seller' : 'instant_buy');
// After
const transactionMethod = 'claim' as const;
```

Same in relist mode (lines 436-437):
```typescript
const transactionMethod = 'claim' as const;
```

In the submit handler (line ~1295), stop sending `transactionMethod`:
```typescript
// Remove: transactionMethod: formData.transactionMethod,
```

In the phone check (line ~1322), make it universal (not gated on `instant_buy`):
```typescript
// Before
if (formData.transactionMethod === 'instant_buy' && shared.sellerPhone && !shared.hasPhone) {
// After
if (shared.sellerPhone && !shared.hasPhone) {
```

**Step 2:** Edit `checkout/create-session/route.ts` line 118:
```typescript
// Before
const sellerCountry = basket.seller_country || 'LV';

// After
const sellerCountry = basket.seller_country;
if (!sellerCountry || !['LV', 'LT', 'EE'].includes(sellerCountry)) {
  return NextResponse.json(
    { error: 'Seller country is required for shipping' },
    { status: 400 }
  );
}
```

**Step 3:** Run `pnpm type-check`

---

## Task 8: Simplify Type System

**Files:**
- Modify: `lib/types/listing.ts`
- Modify: `lib/types/aggregated-game.ts`
- Modify: `lib/hooks/useListingForm.ts`

**Step 1:** Edit `lib/types/listing.ts`:

Remove `ListingType` type entirely:
```typescript
// DELETE:
export type ListingType = 'instant_buy' | 'contact_seller' | 'auction';
```

Change `TransactionMethod`:
```typescript
// Before
export type TransactionMethod = 'contact_seller' | 'instant_buy';
// After
export type TransactionMethod = 'claim';
```

Remove these functions:
- `getListingTypeLabel` — deprecated, no longer needed
- `isContactSellerListing` — no contact_seller listings
- `isInstantBuyListing` — concept replaced by `claim`

Keep `isAuctionListing` and `isFixedPriceListing` but remove their legacy `listing_type` fallback paths:
```typescript
// Before
export function isAuctionListing(listing: { pricing_format?: PricingFormat; listing_type?: ListingType }): boolean {
  if (listing.pricing_format) return listing.pricing_format === 'auction';
  return listing.listing_type === 'auction';
}

// After
export function isAuctionListing(listing: { pricing_format: PricingFormat }): boolean {
  return listing.pricing_format === 'auction';
}
```

Same for `isFixedPriceListing`.

Remove `listing_type` from the `Listing` interface (if present). Remove `isContactSeller` and `isInstantBuy` type guard functions.

**Step 2:** Edit `lib/types/aggregated-game.ts`:
- Remove `contact_seller_count: number`
- Rename `instant_buy_count` → `claim_count` (and update the comment)
- Rename `instant_buy_lowest_price` → `claim_lowest_price` (and update the comment)

**Step 3:** Update all consumers of the renamed fields. Search for `instant_buy_count` and `instant_buy_lowest_price` in `.ts`/`.tsx` files and update to `claim_count` and `claim_lowest_price`. Key files:
- `app/api/games/route.ts` — the aggregation loop variable and response object
- `components/browse/AggregatedGameCard.tsx` — the icon strip and price display
- `app/[locale]/game/[bgg_id]/GamePageClient.tsx` — if it reads these fields

**Step 4:** Edit `lib/hooks/useListingForm.ts`:
- Remove `transactionMethod` from `ListingFormData` interface (line 11)
- Remove `transactionMethod` from `INITIAL_FORM_DATA` (line 30)
- Remove `transactionMethod` from the `canSubmit` destructure (line 251) if it's there

**Step 5:** Fix all type errors from the above changes. Run `pnpm type-check` iteratively.

---

## Task 9: Delete Help Page + Clean Translations

**Files:**
- Delete: `app/[locale]/help/listing-types/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/lv.json`

**Step 1:** Delete `app/[locale]/help/listing-types/page.tsx`.

**Step 2:** Check for links to `/help/listing-types` in the codebase:
```bash
grep -r "listing-types\|listingTypes" --include="*.ts" --include="*.tsx" packages/marketplace/ | grep -v "node_modules"
```
Remove any links pointing to this deleted page (e.g., in MarketPhase upgrade hint, AggregatedGameCard tooltip links, etc.).

**Step 3:** Remove orphaned translation namespaces from `messages/en.json`:
- `Sell.listingType` — entire namespace
- `Sell.transactionMethod` — entire namespace (phone keys already relocated in Task 4)
- `Sell.PricingShipping` — entire namespace
- `Help.ListingTypes` — entire namespace
- Any `card.contactSeller` key under `Listing` namespace
- Any `contactSellerTooltip` keys

**Step 4:** Same removals from `messages/lv.json`.

**Step 5:** Run `pnpm type-check`

---

## Task 10: Remove Listing Type Filter from GamePageClient

**Files:**
- Modify: `app/[locale]/game/[bgg_id]/GamePageClient.tsx`

**Step 1:** Remove `listingTypeFilter` state (line 65):
```typescript
// DELETE:
const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');
```

**Step 2:** Remove the filter logic (lines 182-184):
```typescript
// DELETE:
const filteredOffers = listingTypeFilter === 'all'
  ? regularOffers
  : regularOffers.filter(o => o.listing_type === listingTypeFilter);
```
Replace `filteredOffers` usage with `regularOffers` directly.

**Step 3:** Remove the mobile filter pills (lines 333-345) and desktop filter pills (lines 503-513) — the `(['all', 'instant_buy', 'contact_seller'] as const).map(...)` blocks.

**Step 4:** Remove `ListingType` import if no longer needed.

**Step 5:** Remove filter-related translation keys (`filter.all`, `filter.buy`, `filter.contact`) from the game page namespace in en.json and lv.json.

**Step 6:** Run `pnpm type-check`

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

# Verify contact_seller removed (except database.types.ts auto-generated)
grep -r "contact_seller" --include="*.ts" --include="*.tsx" packages/marketplace/ | grep -v "node_modules" | grep -v "database.types.ts"
# Expected: 0 matches

# Verify instant_buy removed as transaction method (except database.types.ts)
grep -r "'instant_buy'" --include="*.ts" --include="*.tsx" packages/marketplace/ | grep -v "node_modules" | grep -v "database.types.ts"
# Expected: 0 matches

# Verify deleted components
grep -r "ListingTypeSelector\|PricingShipping\|AuctionSettings\|TransactionMethodSelector" --include="*.ts" --include="*.tsx" packages/marketplace/
# Expected: 0 matches

# Verify ListingType type removed
grep -r "ListingType" --include="*.ts" --include="*.tsx" packages/marketplace/lib/types/listing.ts
# Expected: 0 matches
```

**Manual checks:**
- [ ] All 15 listings migrated from `instant_buy` to `claim` in DB
- [ ] `POST /api/listings` hardcodes `transaction_method: 'claim'`
- [ ] Cart API has no contact_seller blocking check
- [ ] ListingCard shows no "Contact Seller" badge
- [ ] OfferCard shows "Add to Cart" for all listings
- [ ] AggregatedGameCard has no handshake icon
- [ ] Game page has no listing type filter tabs
- [ ] MarketPhase shows phone prompt when seller has no phone
- [ ] Help listing-types page deleted
- [ ] Checkout validates seller country (no `|| 'LV'` fallback)
- [ ] `TransactionMethod` type is `'claim'` only
- [ ] `ListingType` type no longer exists
- [ ] Sellers from LV, LT, EE can all create listings
