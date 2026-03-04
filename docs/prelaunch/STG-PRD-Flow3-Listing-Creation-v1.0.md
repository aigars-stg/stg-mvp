# STG PRD: Flow 3 — Listing Creation Simplification
**Version:** 1.0
**Date:** 2026-03-04
**Status:** Ready for implementation
**Depends on:** Flow 2 PRD (sellerCapabilities simplification)

---

## 1. Context & Goals

All listings on Second Turn Games are now "Claim this game" listings — platform-handled payment via EveryPay + Unisend T2T shipping across all three Baltic countries. Contact Seller listings (off-platform payment, buyer-seller arranged) are being removed entirely. The codebase still carries significant Contact Seller infrastructure: a transaction method selector, conditional rendering throughout listing/game display, cart blocking logic, a dedicated help page, and 7 legacy helper functions with fallback logic.

Sellers from Latvia, Lithuania, and Estonia can all sell from launch. The Unisend shipping integration already supports all three countries with cross-border pricing. STG has registered for EU OSS VAT. The LV-only Instant Buy restriction was a UI-layer gate, not a shipping limitation.

**Goals:**
- Remove all Contact Seller code paths (~19 files touched)
- Remove LV-only selling restriction — all Baltic sellers can create Claim listings
- Delete 4 orphaned components (440 lines)
- Fix auction `transaction_method` bug
- Simplify the 3-column listing type model
- Clean up type system (remove legacy `ListingType`, fallback helpers)
- Relocate phone prompt from deleted component to MarketPhase

**Not in scope:**
- Auction feature changes (keep as-is, just fix the transaction_method bug)
- Sell page restructuring or phase system changes
- Dashboard or seller-facing changes (covered in separate review)

---

## 2. Current Data

15 listings total (14 active, 1 sold). **All** are `instant_buy` / `fixed_price` (to be migrated to `claim` / `fixed_price`). Zero `contact_seller` listings. Zero auction listings. Zero bids.

---

## 3. Changes

### 3.1 Delete Orphaned Components

#### 3.1.1 ListingTypeSelector
**Delete:** `components/sell/ListingTypeSelector.tsx` (176 lines)
Never imported. Superseded by the two separate selectors (TransactionMethodSelector + PricingFormatSelector).
**Also remove:** `Sell.listingType` translation namespace (en, lv).

#### 3.1.2 PricingShipping
**Delete:** `components/sell/PricingShipping.tsx` (167 lines)
Never imported. Shipping is hardcoded to T2T in the listing creation API.
**Also remove:** `Sell.PricingShipping` translation namespace (en, lv) if present.

#### 3.1.3 AuctionSettings
**Delete:** `components/sell/AuctionSettings.tsx` (97 lines)
Never imported. Auction settings are rendered inline within `PricingFormatSelector`.

#### 3.1.4 TransactionMethodSelector
**Delete:** `components/sell/TransactionMethodSelector.tsx` (163 lines)
No longer needed — there is no transaction method choice. All listings are Claim.
**Preserve:** The inline phone prompt from this component moves to MarketPhase (Section 3.4).
**Also remove:** `Sell.transactionMethod` translation namespace (en, lv), **except** the `phoneRequired` sub-keys which move to a new namespace (Section 3.4).

---

### 3.2 Remove Contact Seller From All Code Paths

#### 3.2.1 Listing Creation API

**Modify:** `app/api/listings/route.ts`

Remove the entire transaction method branching (lines 31–52). Hardcode both values:

```typescript
// Before: complex branching with legacy fallback
if (body.transactionMethod && body.pricingFormat) { ... }
else if (body.listingType) { ... }
else { transactionMethod = 'contact_seller'; pricingFormat = 'fixed_price'; }

// After: always Claim, client only sends pricingFormat
const transactionMethod = 'claim';
const pricingFormat = body.pricingFormat === 'auction' ? 'auction' : 'fixed_price';
```

Remove the transaction method validation (lines 55–60) — it's always `'claim'`.

Keep the pricing format validation.

Update the `listing_type` derivation (keep writing for backwards compatibility):
```typescript
const listingType = pricingFormat === 'auction' ? 'auction' : 'claim';
```

**Phone check becomes universal** (no longer gated by transaction method — all listings are Claim):
```typescript
// Before: only for instant_buy
if (transactionMethod === 'instant_buy') {
  // check phone
}

// After: always required (all listings are Claim)
const { data: userProfile } = await supabase
  .from('user_profiles')
  .select('country, phone')
  .eq('id', user.id)
  .single();

if (!userProfile?.country) {
  return NextResponse.json(
    { error: 'Country required', requiresCountry: true },
    { status: 403 }
  );
}

if (!userProfile.phone?.trim()) {
  return NextResponse.json(
    { error: 'Phone number required for shipping labels', requiresPhone: true },
    { status: 403 }
  );
}
```

This also implements the country check from Flow 2 PRD Section 3.5.1 — one combined query for both country and phone.

#### 3.2.2 Cart API

**Modify:** `app/api/cart/route.ts`

Remove the contact_seller blocking check (lines 89–107). All listings are now cartable. The query to fetch `listing_type, transaction_method` just to check for contact_seller can be removed entirely.

```typescript
// DELETE these lines:
const isContactSeller = listing.transaction_method === 'contact_seller' || listing.listing_type === 'contact_seller';
if (isContactSeller) { ... }
```

#### 3.2.3 Games API

**Modify:** `app/api/games/route.ts`

Remove `contact_seller_count` tracking from the aggregation loop (line 314). Remove the `isContactSeller` check. Remove `contact_seller_count` from the response.

#### 3.2.4 Game Offers API

**Modify:** `app/api/games/[id]/offers/route.ts`

Remove `listingType` filter parameter (lines 111, 213–214). All listings are the same transaction method. If filtering is still useful, it should filter by `pricing_format` (fixed_price vs auction) instead of `listing_type`.

```typescript
// Before
if (listingType && ['instant_buy', 'contact_seller'].includes(listingType)) {
  query = query.eq('listing_type', listingType);
}

// After: filter by pricing format instead (optional)
const pricingFormat = searchParams.get('pricingFormat');
if (pricingFormat && ['fixed_price', 'auction'].includes(pricingFormat)) {
  query = query.eq('pricing_format', pricingFormat);
}
```

#### 3.2.5 ListingCard

**Modify:** `components/listing/ListingCard.tsx`

Remove the "Contact Seller" badge overlay (lines 177–183):
```tsx
// DELETE:
{isContactSellerListing(listing) && (
  <div className="...">
    <MessageSquare ... />
    {t('card.contactSeller')}
  </div>
)}
```

Remove the conditional shipping info display (line 312 — `!isContactSellerListing(listing)` guard). Always show shipping info.

Remove `isContactSellerListing` import.

#### 3.2.6 OfferCard

**Modify:** `components/game/OfferCard.tsx`

Remove the contact_seller button branch (lines 717–732, 849–861). The "Message Seller" button for contact_seller listings becomes unnecessary — all listings show "Add to Cart" / "Claim" button.

```tsx
// Before: three-way conditional (sold / contact_seller / claim)
{listingStatus === 'sold' ? (
  <div>sold</div>
) : isContactSellerListing(listing) ? (
  <Button onClick={handleContactSeller}>Message Seller</Button>
) : (
  <Button onClick={handleAddToCart}>Add to Cart</Button>
)}

// After: two-way conditional (sold / active)
{listingStatus === 'sold' ? (
  <div>sold</div>
) : (
  <Button onClick={handleAddToCart}>Claim this game</Button>
)}
```

Remove `isContactSellerListing` import. Keep `handleContactSeller` function if messaging is still accessible from elsewhere on the offer card (check if there's a separate message button).

#### 3.2.7 AggregatedGameCard

**Modify:** `components/browse/AggregatedGameCard.tsx`

Remove contact_seller_count icon display (lines 105–108):
```tsx
// DELETE:
{game.contact_seller_count > 0 && (
  <span title={...}><Handshake ... /></span>
)}
```

#### 3.2.8 GamePageClient

**Modify:** `app/[locale]/game/[bgg_id]/GamePageClient.tsx`

Remove listing type filter tabs (lines 65, 335, 503). Currently renders: All / Instant Buy / Contact Seller. With one transaction method, this filter is meaningless for transaction method. If auctions exist for a game, a pricing format filter (All / Fixed Price / Auction) could replace it — but defer this to when auctions are actually active.

```typescript
// DELETE:
const [listingTypeFilter, setListingTypeFilter] = useState<ListingType | 'all'>('all');

// DELETE: the filter tabs rendering at lines 335 and 503
```

#### 3.2.9 StatusChangeModal

**Modify:** `components/listing/StatusChangeModal.tsx`

Remove contact_seller branch (line 30–45). The modal uses `isContactSeller` to show different icons and descriptions for the "sold" status. Simplify to always use the Claim variant:

```typescript
// DELETE:
const isContactSeller = listingType === 'contact_seller';

// Simplify icon/description to always use the platform-sale variant
```

Also remove the `listingType` prop if it's no longer needed for any branching.

#### 3.2.10 ListingPreviewSidebar

**Modify:** `components/sell/ListingPreviewSidebar.tsx`

Remove contact_seller label rendering (lines 250–263). Always show "Claim this game" label:

```tsx
// Before: conditional contact_seller vs claim rendering
// After: always show claim label, simplify to just pricing format display
```

#### 3.2.11 Help Listing Types Page

**Modify or delete:** `app/[locale]/help/listing-types/page.tsx` (408 lines)

This page extensively documents both listing types with comparison tables, FAQs, switching guidance. With one listing type, the comparison is meaningless.

**Options:**
- **A. Delete the page entirely.** Replace with a redirect to a general "How Selling Works" help section (to be built with dashboard empty state).
- **B. Rewrite as "How Claim Works" single-topic page.** Keep the URL but replace content.

**Recommended: Option A — delete for now.** The page URL is not indexed (pre-launch). The educational content ("How Selling Works") should live in the dashboard empty state or a more general help section. Create a simple redirect to `/help` to avoid 404s.

**Also remove:** `Help.ListingTypes` translation namespace (en, lv).

---

### 3.3 Remove LV-Only Selling Restriction

#### 3.3.1 Sell page initial transaction method

**Modify:** `app/[locale]/sell/page.tsx`

Remove the `isInstantBuyCountry` check entirely (lines 301–304):

```typescript
// Before
const isInstantBuyCountry = profile?.country === 'LV' || !profile?.country;
setFormData((prev) => ({
  ...prev,
  transactionMethod: (canCreateInstantBuy && isInstantBuyCountry) ? 'instant_buy' : 'contact_seller',
}));

// After — always claim
setFormData((prev) => ({
  ...prev,
  transactionMethod: 'claim',
}));
```

Since `transactionMethod` in `INITIAL_FORM_DATA` should be changed to `'claim'`, this entire block can be simplified or removed.

#### 3.3.2 Checkout session country fallback

**Modify:** `app/api/checkout/create-session/route.ts`

The fallback `const sellerCountry = basket.seller_country || 'LV'` (line 118) should fail explicitly rather than silently defaulting:

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

---

### 3.4 Move Phone Prompt to MarketPhase

The `TransactionMethodSelector` currently shows an inline phone input when the seller hasn't added their phone. Since that component is being deleted, the phone prompt needs to move to `MarketPhase` directly.

**Modify:** `components/sell/phases/MarketPhase.tsx`

Add phone prompt section before or after the condition selector:

```tsx
import { PhoneInput } from '@/components/common/PhoneInput';
import { Phone } from '@/lib/icons';

// In the render, before the Condition Card:
{!hasPhone && onPhoneChange && (
  <Card padding="md">
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
  </Card>
)}
```

**MarketPhase props cleanup:** Remove the `sellerCapabilities` prop entirely (already simplified in Flow 2 PRD). Remove `sellerCountry` and `onUpgradeClick` props (no longer needed — no TransactionMethodSelector). Keep `hasPhone`, `sellerPhone`, `onPhoneChange`, `defaultCountry`.

**New translation keys** (move from `Sell.transactionMethod.instantBuy.phoneRequired` to `Sell.sections.phone`):

```json
"sections": {
  "phone": {
    "label": "Phone number needed for shipping",
    "description": "Unisend parcel lockers need your phone number to create shipping labels. This will be saved to your profile."
  }
}
```

---

### 3.5 Fix Auction Transaction Method Bug

**Modify:** `app/api/listings/route.ts`

This is already handled by the hardcoded `transactionMethod = 'claim'` in Section 3.2.1. All listings — including auctions — now use platform payment. The legacy conversion that set `transactionMethod = 'contact_seller'` for auctions is removed entirely.

The auction checkout route (`/api/auctions/[id]/checkout`) already uses EveryPay and creates proper orders. No changes needed there.

---

### 3.6 Simplify Type System

**Modify:** `lib/types/listing.ts`

#### 3.6.1 Remove `ListingType` and legacy helpers

```typescript
// DELETE:
export type ListingType = 'instant_buy' | 'contact_seller' | 'auction';

// DELETE all of these:
export function getListingTypeLabel(type: ListingType): string { ... }
export function isContactSellerListing(listing: ...) { ... }
export function isInstantBuyListing(listing: ...) { ... }
export function isAuctionListing(listing: ...) { ... }  // KEEP — still useful
export function isFixedPriceListing(listing: ...) { ... }  // KEEP — still useful
```

**Keep** `isAuctionListing` and `isFixedPriceListing` but remove their legacy `listing_type` fallback paths:

```typescript
// Before
export function isAuctionListing(listing: { pricing_format?: PricingFormat; listing_type?: ListingType }): boolean {
  if (listing.pricing_format) return listing.pricing_format === 'auction';
  return listing.listing_type === 'auction'; // legacy fallback
}

// After
export function isAuctionListing(listing: { pricing_format: PricingFormat }): boolean {
  return listing.pricing_format === 'auction';
}
```

**Keep** `TransactionMethod` type but make it a single value:
```typescript
export type TransactionMethod = 'claim';  // All listings are Claim
```

Or remove it entirely and hardcode `'claim'` in the one place it's written (listing creation API). The type adds no information if there's only one value.

**Recommended:** Keep `TransactionMethod = 'claim'` as a type for documentation purposes and future-proofing, but remove `'contact_seller'` and `'instant_buy'` from it.

#### 3.6.2 Remove `listing_type` from `Listing` interface

```typescript
// Remove from Listing interface:
// DEPRECATED: Old compound field
listing_type: ListingType;

// Remove from ListingWithSeller as well if it extends Listing
```

**Note:** The database column `listing_type` continues to be written for now (derived value). But the TypeScript type no longer references it. Any code that reads `listing_type` should switch to reading `transaction_method` + `pricing_format`.

#### 3.6.3 Simplify `isContactSeller` type guard

```typescript
// DELETE:
export const isContactSeller = (method: TransactionMethod): boolean => method === 'contact_seller';

// Also delete — it's always true and references old value
export const isInstantBuy = (method: TransactionMethod): boolean => method === 'instant_buy';
```

---

### 3.7 Update `AggregatedGame` Type

**Modify:** `lib/types/aggregated-game.ts`

```typescript
// DELETE:
contact_seller_count: number;

// RENAME:
instant_buy_count: number;  →  claim_count: number;

// KEEP:
auction_count: number;
```

---

### 3.8 Remove `transactionMethod` from Form Data

**Modify:** `lib/hooks/useListingForm.ts`

Since `transactionMethod` is always `'claim'`, it doesn't need to be in the form state:

```typescript
// Remove from ListingFormData interface:
transactionMethod: TransactionMethod;

// Remove from INITIAL_FORM_DATA:
transactionMethod: 'claim',
```

The listing creation API hardcodes it — the client doesn't need to send it.

**Update `handlePublish` in sell page** to stop sending `transactionMethod` in the request body. The server ignores it anyway per Section 3.2.1.

---

## 4. Database Migration

### 4.1 Update CHECK Constraints

```sql
-- Update transaction_method to only allow 'claim'
ALTER TABLE listings DROP CONSTRAINT listings_transaction_method_check;
ALTER TABLE listings ADD CONSTRAINT listings_transaction_method_check
  CHECK (transaction_method = 'claim');

-- Update listing_type constraint to reflect new values
ALTER TABLE listings DROP CONSTRAINT listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('claim', 'auction'));

-- Keep pricing_format constraint as-is
-- CHECK (pricing_format IN ('fixed_price', 'auction'))
```

### 4.2 Set Column Default

```sql
-- Set default for transaction_method
ALTER TABLE listings ALTER COLUMN transaction_method SET DEFAULT 'claim';
```

### 4.3 Migrate Existing Data

All 15 existing listings have `transaction_method = 'instant_buy'` and `listing_type = 'instant_buy'`. Both need updating:

```sql
-- Rename instant_buy → claim in both columns
UPDATE listings SET transaction_method = 'claim' WHERE transaction_method = 'instant_buy';
UPDATE listings SET listing_type = 'claim' WHERE listing_type = 'instant_buy';
```

**Important:** Run the UPDATE statements *before* applying the new CHECK constraints. The migration order is: update data → drop old constraints → add new constraints.

---

## 5. Files Changed — Complete List

### Delete (4 files + 1 page)
| File | Lines | Reason |
|------|-------|--------|
| `components/sell/ListingTypeSelector.tsx` | 176 | Orphaned — never imported |
| `components/sell/PricingShipping.tsx` | 167 | Orphaned — never imported |
| `components/sell/AuctionSettings.tsx` | 97 | Orphaned — never imported |
| `components/sell/TransactionMethodSelector.tsx` | 163 | Removed — no transaction method choice |
| `app/[locale]/help/listing-types/page.tsx` | 408 | Removed — documents removed feature |

### Modify (17+ files)
| File | Change |
|------|--------|
| `app/api/listings/route.ts` | Hardcode `claim`, remove branching/legacy/validation, universal phone+country check |
| `app/api/cart/route.ts` | Remove contact_seller blocking check |
| `app/api/games/route.ts` | Remove contact_seller counting |
| `app/api/games/[id]/offers/route.ts` | Remove listingType filter, optionally add pricingFormat filter |
| `app/api/checkout/create-session/route.ts` | Remove `\|\| 'LV'` country fallback, add explicit validation |
| `components/sell/phases/MarketPhase.tsx` | Remove TransactionMethodSelector, add inline phone prompt, clean up props |
| `components/listing/ListingCard.tsx` | Remove contact_seller badge, always show shipping |
| `components/game/OfferCard.tsx` | Remove contact_seller button branch |
| `components/browse/AggregatedGameCard.tsx` | Remove contact_seller_count icon |
| `app/[locale]/game/[bgg_id]/GamePageClient.tsx` | Remove listing type filter tabs |
| `components/listing/StatusChangeModal.tsx` | Remove contact_seller branch, simplify or remove `listingType` prop |
| `components/sell/ListingPreviewSidebar.tsx` | Remove contact_seller label, always show Claim |
| `lib/types/listing.ts` | Remove `ListingType`, `isContactSellerListing`, legacy fallbacks; simplify `TransactionMethod` |
| `lib/types/aggregated-game.ts` | Remove `contact_seller_count` |
| `lib/hooks/useListingForm.ts` | Remove `transactionMethod` from form data |
| `app/[locale]/sell/page.tsx` | Remove `isInstantBuyCountry`, remove transactionMethod form logic, stop sending it in request |
| `messages/en.json` | Remove translation namespaces (see Section 6) |
| `messages/lv.json` | Same translation changes |

---

## 6. Translation Keys

### Remove
- `Sell.listingType.*` (entire namespace — ListingTypeSelector)
- `Sell.transactionMethod.*` (entire namespace except `phoneRequired` sub-keys which are relocated)
- `Sell.PricingShipping.*` (if present — PricingShipping component)
- `Help.ListingTypes.*` (entire namespace — help page)
- `Listing.card.contactSeller` (if present)
- Any `contactSellerTooltip` keys in browse/listing namespaces

### Add
- `Sell.sections.phone.label` — "Phone number needed for shipping" (en) / TBD (lv)
- `Sell.sections.phone.description` — "Unisend parcel lockers need your phone number to create shipping labels. This will be saved to your profile." (en) / TBD (lv)

### Modify
- None — contact_seller labels are removed, not renamed

---

## 7. Acceptance Criteria

### Dead Code Removal
- [ ] `ListingTypeSelector` deleted; no broken imports
- [ ] `PricingShipping` deleted; no broken imports
- [ ] `AuctionSettings` deleted; no broken imports
- [ ] `TransactionMethodSelector` deleted; no broken imports
- [ ] Help listing-types page deleted or redirects to `/help`

### Contact Seller Removal
- [ ] No `contact_seller` string appears in any `.tsx` or `.ts` file (except database.types.ts which is auto-generated)
- [ ] `POST /api/listings` hardcodes `transaction_method: 'claim'` regardless of client input
- [ ] No `instant_buy` string appears as a transaction method value in any `.tsx` or `.ts` file (except database.types.ts)
- [ ] Cart API does not check listing type before adding — all active listings are cartable
- [ ] ListingCard shows no "Contact Seller" badge
- [ ] OfferCard shows "Add to Cart" / "Claim" button for all listings (no "Message Seller" variant)
- [ ] AggregatedGameCard shows no handshake icon
- [ ] Game page has no listing type filter tabs

### Country Restriction Removal
- [ ] Sellers from LV, LT, and EE can all create Claim listings
- [ ] No `isInstantBuyCountry` check exists in codebase
- [ ] Checkout session validates seller country is LV/LT/EE (not defaulting to LV)

### Phone Prompt
- [ ] MarketPhase shows inline phone input when seller has no phone
- [ ] Phone is validated server-side in listing creation API (all listings need it)
- [ ] Phone input uses correct `defaultCountry` from seller's country

### Auction Fix
- [ ] Auction listings have `transaction_method: 'claim'` (not `'contact_seller'` or `'instant_buy'`)
- [ ] PricingFormatSelector still renders correctly (Fixed Price / Auction toggle)
- [ ] Auction infrastructure (API routes, Edge Functions, RPCs) unchanged

### Type System
- [ ] `ListingType` type no longer exists in `listing.ts`
- [ ] `isContactSellerListing()` function removed
- [ ] `TransactionMethod` type is `'claim'` only
- [ ] `AggregatedGame` type has no `contact_seller_count`
- [ ] `ListingFormData` has no `transactionMethod` field
- [ ] All consumers compile without errors

### Database
- [ ] `listings_transaction_method_check` constraint allows only `'claim'`
- [ ] `listings_listing_type_check` constraint allows `'claim'` and `'auction'`
- [ ] `transaction_method` column defaults to `'claim'`
- [ ] All existing listings migrated from `instant_buy` to `claim`

---

## 8. Implementation Order

1. **Database migration** — update constraints and defaults (Section 4)
2. **Delete orphaned components** — ListingTypeSelector, PricingShipping, AuctionSettings (Section 3.1.1–3.1.3)
3. **Simplify listing creation API** — hardcode `claim`, universal phone+country check, fix auction bug (Sections 3.2.1, 3.5)
4. **Delete TransactionMethodSelector + move phone prompt to MarketPhase** — remove component, update MarketPhase props and render (Sections 3.1.4, 3.4)
5. **Remove contact_seller from display components** — ListingCard, OfferCard, AggregatedGameCard, StatusChangeModal, ListingPreviewSidebar (Sections 3.2.5–3.2.10)
6. **Remove contact_seller from API routes** — cart, games, offers (Sections 3.2.2–3.2.4)
7. **Remove LV-only restriction** — sell page, checkout session (Section 3.3)
8. **Simplify types** — listing.ts, aggregated-game.ts, useListingForm (Sections 3.6–3.8)
9. **Delete/redirect help page + clean translations** (Section 3.2.11)
10. **Remove contact_seller from GamePageClient** — listing type filter tabs (Section 3.2.8)

Steps 1–4 are the core path. Steps 5–10 are cleanup that can be done incrementally.

---

## 9. Decisions (Resolved)

1. **Contact Seller:** Removed entirely. All listings are Claim (`transaction_method = 'claim'`). Existing `instant_buy` data migrated to `claim`.

2. **Selling countries:** All three Baltic countries (LV, LT, EE) from launch. Unisend shipping and EveryPay payment already support all three. EU OSS VAT registered.

3. **`listing_type` column:** Keep writing the derived value (`pricingFormat === 'auction' ? 'auction' : 'claim'`) for backwards compatibility with any analytics or external queries. Remove from TypeScript types and stop reading from it in code.

4. **`TransactionMethod` type:** Keep as `'claim'` (single value) rather than removing entirely. Documents the concept and allows future expansion if needed.

5. **Auction infrastructure:** Keep all code, fix the `transaction_method` bug. Auctions are a planned feature — removing the code would just mean rebuilding it later.

6. **Help listing-types page:** Delete. Educational content deferred to dashboard empty state / general help section.

7. **`transactionMethod` in form data:** Remove from `ListingFormData`. The client no longer sends it. The server hardcodes it.

8. **Phone requirement:** Universal for all sellers (all listings need shipping labels). Phone prompt moves from deleted TransactionMethodSelector to MarketPhase inline.

9. **Checkout country fallback:** Explicit validation instead of silent `|| 'LV'` default. Seller must have a valid Baltic country.
