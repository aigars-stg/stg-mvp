# Flow 4: Purchase Flow Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat €2.00 shipping with route-based pricing, add VAT tracking to orders, fix commission double-calculation, drop all Stripe dead code, configure pg_cron jobs.

**Architecture:** DB migration first (VAT columns, Stripe cleanup, RPC fix, cron jobs), then pure pricing functions with tests, then wire into checkout routes/services/webhook, then UI cleanup. Two checkout paths (basket + auction) get identical fixes.

**Tech Stack:** Next.js 14 App Router, Supabase (pg_cron, pg_net, Edge Functions), TypeScript, Vitest

**PRD:** `docs/prelaunch/STG-PRD-Flow4-Purchase-Flow-Fixes-v1.0.md`

**Already done in Flow 3:** Contact Seller cart check removed (§3.6), checkout seller_country validation added (§3.5.1 partial).

---

## Task 1: VAT Calculation Service (TDD)

Pure functions with no side effects — safe to build first.

**Files:**
- Modify: `packages/marketplace/lib/services/pricing.ts`
- Modify: `packages/marketplace/lib/services/pricing.test.ts`

**Step 1: Write VAT tests**

Add to `pricing.test.ts`:

```typescript
import {
  getVatRate,
  calculateVatSplit,
  calculateOrderPricingWithVat,
  VAT_RATES,
  DEFAULT_VAT_RATE,
} from './pricing';

describe('getVatRate', () => {
  it('returns 0.21 for LV', () => {
    expect(getVatRate('LV')).toBe(0.21);
  });
  it('returns 0.21 for LT', () => {
    expect(getVatRate('LT')).toBe(0.21);
  });
  it('returns 0.22 for EE', () => {
    expect(getVatRate('EE')).toBe(0.22);
  });
  it('returns default 0.21 for null', () => {
    expect(getVatRate(null)).toBe(0.21);
  });
  it('returns default 0.21 for unknown country', () => {
    expect(getVatRate('DE')).toBe(0.21);
  });
  it('is case-insensitive', () => {
    expect(getVatRate('ee')).toBe(0.22);
  });
});

describe('calculateVatSplit', () => {
  it('splits LV commission correctly (250 cents at 21%)', () => {
    const result = calculateVatSplit(250, 0.21);
    expect(result.grossCents).toBe(250);
    expect(result.netCents).toBe(207); // round(250 / 1.21)
    expect(result.vatCents).toBe(43); // 250 - 207
    expect(result.vatRate).toBe(0.21);
  });
  it('splits EE shipping correctly (210 cents at 22%)', () => {
    const result = calculateVatSplit(210, 0.22);
    expect(result.grossCents).toBe(210);
    expect(result.netCents).toBe(172); // round(210 / 1.22)
    expect(result.vatCents).toBe(38); // 210 - 172
    expect(result.vatRate).toBe(0.22);
  });
  it('handles zero amount', () => {
    const result = calculateVatSplit(0, 0.21);
    expect(result.grossCents).toBe(0);
    expect(result.netCents).toBe(0);
    expect(result.vatCents).toBe(0);
  });
});

describe('calculateOrderPricingWithVat', () => {
  it('includes VAT breakdown for LV destination', () => {
    // €25 item, €1.90 shipping, LV destination
    const result = calculateOrderPricingWithVat(2500, 190, 'LV');
    expect(result.commissionCents).toBe(250); // 10% of 2500
    expect(result.commissionVat.vatRate).toBe(0.21);
    expect(result.commissionVat.grossCents).toBe(250);
    expect(result.commissionVat.netCents).toBe(207);
    expect(result.commissionVat.vatCents).toBe(43);
    expect(result.shippingVat.vatRate).toBe(0.21);
    expect(result.shippingVat.grossCents).toBe(190);
  });
  it('uses EE rate for Estonian destination', () => {
    const result = calculateOrderPricingWithVat(2500, 210, 'EE');
    expect(result.commissionVat.vatRate).toBe(0.22);
    expect(result.shippingVat.vatRate).toBe(0.22);
  });
  it('uses default rate for null destination', () => {
    const result = calculateOrderPricingWithVat(2500, 0, null);
    expect(result.commissionVat.vatRate).toBe(0.21);
  });
});
```

**Step 2:** Run `pnpm test` → tests should FAIL (functions don't exist yet)

**Step 3: Implement VAT functions**

Add to the end of `pricing.ts`:

```typescript
// ==============================================
// VAT
// ==============================================

/**
 * VAT rates by destination country (EU OSS).
 * STG is a Latvian company registered for EU OSS.
 * Commission and shipping VAT follow destination country rate.
 */
export const VAT_RATES: Record<string, number> = {
  LV: 0.21,
  LT: 0.21,
  EE: 0.22,
};

/** Default VAT rate (Latvia domestic) for unknown destinations */
export const DEFAULT_VAT_RATE = 0.21;

export interface VatSplit {
  grossCents: number;
  netCents: number;
  vatCents: number;
  vatRate: number;
}

export interface OrderVat {
  commissionVat: VatSplit;
  shippingVat: VatSplit;
}

/**
 * Get the VAT rate for a destination country
 */
export function getVatRate(destinationCountry: string | null | undefined): number {
  if (!destinationCountry) return DEFAULT_VAT_RATE;
  return VAT_RATES[destinationCountry.toUpperCase()] ?? DEFAULT_VAT_RATE;
}

/**
 * Back-calculate VAT from a gross (VAT-inclusive) amount.
 * Commission and shipping prices are VAT-inclusive.
 */
export function calculateVatSplit(grossCents: number, vatRate: number): VatSplit {
  const netCents = Math.round(grossCents / (1 + vatRate));
  const vatCents = grossCents - netCents;
  return { grossCents, netCents, vatCents, vatRate };
}

/**
 * Calculate full order pricing with VAT breakdown
 */
export function calculateOrderPricingWithVat(
  itemsTotalCents: number,
  shippingCostCents: number,
  destinationCountry: string | null | undefined
): OrderPricing & OrderVat {
  const base = calculateOrderPricing(itemsTotalCents, shippingCostCents);
  const vatRate = getVatRate(destinationCountry);
  const commissionVat = calculateVatSplit(base.commissionCents, vatRate);
  const shippingVat = calculateVatSplit(shippingCostCents, vatRate);
  return { ...base, commissionVat, shippingVat };
}
```

**Step 4:** Run `pnpm test` → all tests pass

---

## Task 2: Delete Flat Shipping Constants

**Files:**
- Modify: `packages/marketplace/lib/pricing/constants.ts`
- Modify: `packages/marketplace/lib/pricing/constants.test.ts`

**Step 1:** Edit `constants.ts` — remove `SHIPPING_COST_CENTS` and `SHIPPING_COST_EUROS` lines and their comments. Keep `SELLER_COMMISSION_RATE` and `DISPUTE_WINDOW_DAYS`.

**Step 2:** Edit `constants.test.ts` — remove the consistency test (`SHIPPING_COST_CENTS === SHIPPING_COST_EUROS * 100`). Keep the commission rate and dispute window tests.

**Step 3:** Run `pnpm test` → tests pass (only removed tests, not added)

**Step 4:** Run `pnpm type-check` → will show errors in 4 files that still import the deleted constants. That's expected — we fix them in Tasks 3-5.

---

## Task 3: Fix Cart Summary — "Calculated at Checkout"

**Files:**
- Modify: `packages/marketplace/components/cart/CartBasketSummary.tsx`
- Modify: `packages/marketplace/messages/en.json`
- Modify: `packages/marketplace/messages/lv.json`

**Step 1:** Read `CartBasketSummary.tsx` to understand current structure.

**Step 2:** Edit `CartBasketSummary.tsx`:
- Remove `SHIPPING_COST_EUROS` import
- Remove `shippingCost` prop (and its default)
- Replace the shipping cost display with a "Calculated at checkout" text
- Remove total calculation that includes shipping (show subtotal only)

The shipping row should show:
```tsx
<span className="text-text-secondary text-sm">{t('basket.shippingAtCheckout')}</span>
```

The total/subtotal row shows only the items subtotal (no shipping added).

**Step 3:** Add translation keys:

`en.json` in the `Cart` namespace (find `basket` sub-object):
```json
"shippingAtCheckout": "Calculated at checkout"
```

`lv.json` in the `Cart` namespace:
```json
"shippingAtCheckout": "Tiks aprēķināta pie apmaksas"
```

**Step 4:** Run `pnpm type-check` — CartBasketSummary should now be clean. Other files still broken (expected).

---

## Task 4: Fix Basket Checkout Route — Route-Based Shipping

**Files:**
- Modify: `packages/marketplace/app/api/checkout/create-session/route.ts`

**Step 1:** Read the file to see current state (Flow 3 already added seller_country validation).

**Step 2:** Replace the `SHIPPING_COST_EUROS` import with `getShippingPrice` from `@/lib/unisend`:

```typescript
// Remove:
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';
// Add:
import { getShippingPrice } from '@/lib/unisend';
```

**Step 3:** Add destination country validation for T2T shipping. After the existing seller_country validation:

```typescript
if (input.shippingMethod === 't2t' && !input.destinationCountry) {
  return NextResponse.json(
    { error: 'Destination country required for T2T shipping' },
    { status: 400 }
  );
}
```

**Step 4:** Replace the flat shipping cost calculation:

```typescript
// Before:
const shippingCostEuros = input.shippingMethod === 't2t' ? SHIPPING_COST_EUROS : 0;

// After:
const shippingCostEuros = input.shippingMethod === 't2t'
  ? getShippingPrice(
      sellerCountry as 'LV' | 'LT' | 'EE',
      input.destinationCountry as 'LV' | 'LT' | 'EE',
      'M'
    )
  : 0;
```

**Step 5:** Run `pnpm type-check` — this route should be clean now.

---

## Task 5: Fix Auction Checkout Route — Route-Based Shipping

**Files:**
- Modify: `packages/marketplace/app/api/auctions/[id]/checkout/route.ts`

**Step 1:** Read the file.

**Step 2:** Replace the `SHIPPING_COST_EUROS` import:

```typescript
// Remove:
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';
// Add:
import { getShippingPrice } from '@/lib/unisend';
```

**Step 3:** Find the line `const shippingCostEuros = shippingMethod === 't2t' ? SHIPPING_COST_EUROS : 0;` and replace with route-based calculation. The seller country and destination country should already be available from the request body. Read the surrounding code to find them.

```typescript
const shippingCostEuros = shippingMethod === 't2t'
  ? getShippingPrice(
      sellerCountry as 'LV' | 'LT' | 'EE',
      destinationCountry as 'LV' | 'LT' | 'EE',
      'M'
    )
  : 0;
```

**Step 4:** Run `pnpm type-check` — should be clean.

---

## Task 6: Fix Checkout Page — Dynamic Shipping Display

**Files:**
- Modify: `packages/marketplace/app/[locale]/checkout/page.tsx`

**Step 1:** Read the file around lines 24 and 330-340 to see current shipping logic.

**Step 2:** Remove `SHIPPING_COST_EUROS` import. Add `getShippingPrice` import from `@/lib/unisend`:

```typescript
import { getShippingPrice } from '@/lib/unisend';
import type { TerminalCountry } from '@/lib/unisend';
```

**Step 3:** Replace the hardcoded shipping cost with a dynamic calculation based on `selectedTerminal`. Find where `shippingCostCents` is calculated (around line 332) and replace:

```typescript
// Before:
const shippingCostCents = Math.round(SHIPPING_COST_EUROS * 100);

// After — derive from selected terminal's country:
const shippingCostEuros = selectedTerminal
  ? getShippingPrice(
      (basket?.seller_country || 'LV') as TerminalCountry,
      selectedTerminal.countryCode as TerminalCountry,
      'M'
    )
  : 0;
const shippingCostCents = Math.round(shippingCostEuros * 100);
```

`getShippingPrice` is a pure lookup function (no API call needed) — safe for client-side use.

**Step 4:** Verify the pricing summary section shows the dynamic price (or "Select terminal" if no terminal selected). Read the JSX to confirm the shipping cost display updates correctly.

**Step 5:** Run `pnpm type-check` → all SHIPPING_COST references should now be resolved.

**Step 6:** Verify no remaining imports: `grep -r "SHIPPING_COST_EUROS\|SHIPPING_COST_CENTS" --include="*.ts" --include="*.tsx" packages/marketplace/` should return only `constants.ts` and `constants.test.ts`.

---

## Task 7: Integrate VAT into Checkout Service + Webhook

**Files:**
- Modify: `packages/marketplace/lib/services/checkout.ts`
- Modify: `packages/marketplace/app/api/webhooks/everypay/callback/route.ts`

**Step 1:** Read `checkout.ts` around lines 16, 153, 196, 236-265, 321, 358, 423-450.

**Step 2:** In `checkout.ts`, replace `calculateOrderPricing` import with `calculateOrderPricingWithVat`:

```typescript
// Before:
import { calculateCheckoutPricingFromEuros, calculateOrderPricing } from './pricing';
// After:
import { calculateCheckoutPricingFromEuros, calculateOrderPricingWithVat } from './pricing';
```

**Step 3:** In `createCheckoutSession` (basket path, ~line 153), replace:

```typescript
// Before:
const orderPricing = calculateOrderPricing(pricing.itemsTotalCents, pricing.shippingCostCents);
// After:
const orderPricing = calculateOrderPricingWithVat(
  pricing.itemsTotalCents,
  pricing.shippingCostCents,
  input.destinationCountry
);
```

**Step 4:** In the wallet-only order update (~line 196), add VAT fields:

```typescript
await supabase
  .from('orders')
  .update({
    locale,
    platform_commission_cents: orderPricing.commissionCents,
    seller_wallet_credit_cents: orderPricing.walletCreditCents,
    commission_net_cents: orderPricing.commissionVat.netCents,
    commission_vat_cents: orderPricing.commissionVat.vatCents,
    commission_vat_rate: orderPricing.commissionVat.vatRate,
    shipping_net_cents: orderPricing.shippingVat.netCents,
    shipping_vat_cents: orderPricing.shippingVat.vatCents,
    shipping_vat_rate: orderPricing.shippingVat.vatRate,
  })
  .eq('id', orderId);
```

**Step 5:** In the EveryPay metadata payload (~line 236), add VAT fields to the `payload` object:

```typescript
commission_net_cents: orderPricing.commissionVat.netCents,
commission_vat_cents: orderPricing.commissionVat.vatCents,
commission_vat_rate: orderPricing.commissionVat.vatRate,
shipping_net_cents: orderPricing.shippingVat.netCents,
shipping_vat_cents: orderPricing.shippingVat.vatCents,
shipping_vat_rate: orderPricing.shippingVat.vatRate,
```

**Step 6:** Apply identical changes to `createAuctionCheckoutSession` (~lines 321, 358, 423).

**Step 7:** Read `app/api/webhooks/everypay/callback/route.ts` around lines 326-334 and 408-411.

**Step 8:** In `processBasketPayment`, update the order update block to include VAT fields from metadata:

```typescript
await supabase
  .from('orders')
  .update({
    locale,
    platform_commission_cents: commissionCents,
    seller_wallet_credit_cents: walletCreditCents,
    everypay_payment_state: paymentState,
    commission_net_cents: (metadata.commission_net_cents as number) || null,
    commission_vat_cents: (metadata.commission_vat_cents as number) || null,
    commission_vat_rate: (metadata.commission_vat_rate as number) || null,
    shipping_net_cents: (metadata.shipping_net_cents as number) || null,
    shipping_vat_cents: (metadata.shipping_vat_cents as number) || null,
    shipping_vat_rate: (metadata.shipping_vat_rate as number) || null,
  })
  .eq('id', orderId);
```

**Step 9:** In `processAuctionPayment`, add VAT fields to the order update (~line 408). Since auction RPC handles commission, add a separate update for VAT:

```typescript
await supabase
  .from('orders')
  .update({
    everypay_payment_state: paymentState,
    commission_net_cents: (metadata.commission_net_cents as number) || null,
    commission_vat_cents: (metadata.commission_vat_cents as number) || null,
    commission_vat_rate: (metadata.commission_vat_rate as number) || null,
    shipping_net_cents: (metadata.shipping_net_cents as number) || null,
    shipping_vat_cents: (metadata.shipping_vat_cents as number) || null,
    shipping_vat_rate: (metadata.shipping_vat_rate as number) || null,
  })
  .eq('id', result.order_id);
```

**Step 10:** Run `pnpm type-check`

---

## Task 8: Fix Country Fallbacks in Accept/Retry-Label

**Files:**
- Modify: `packages/marketplace/app/api/seller/orders/[id]/accept/route.ts`
- Modify: `packages/marketplace/app/api/seller/orders/[id]/retry-label/route.ts`

**Step 1:** Read `accept/route.ts` around lines 168-182.

**Step 2:** In `accept/route.ts`, add country validation before the label generation try block:

```typescript
if (!sellerProfile.country || !['LV', 'LT', 'EE'].includes(sellerProfile.country)) {
  // Update order with error and return success (order accepted, label failed)
  await supabase.from('orders').update({
    label_error: 'Seller country not set. Please update your country in Account Settings.',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  return NextResponse.json({
    success: true,
    orderId,
    shippingMethod: result.shipping_method,
    labelGenerated: false,
    labelError: 'Seller country not set',
  });
}

if (!order.destination_country || !['LV', 'LT', 'EE'].includes(order.destination_country)) {
  await supabase.from('orders').update({
    label_error: 'Destination country missing on order.',
    updated_at: new Date().toISOString(),
  }).eq('id', orderId);

  return NextResponse.json({
    success: true,
    orderId,
    shippingMethod: result.shipping_method,
    labelGenerated: false,
    labelError: 'Destination country missing',
  });
}
```

**Step 3:** Remove the `|| 'LT'` fallbacks from:
- Line 177: `senderCountry: (sellerProfile.country || 'LT')` → `senderCountry: sellerProfile.country`
- Line 180: `receiverCountry: (order.destination_country || 'LT')` → `receiverCountry: order.destination_country`
- Lines 168-169: Remove `|| 'LT'` from log lines

**Step 4:** Read `retry-label/route.ts` around lines 107-122.

**Step 5:** Apply identical changes:
- Add validation before label generation
- Remove `|| 'LT'` from line 117 (senderCountry), line 120 (receiverCountry), line 107 (log)

**Step 6:** Run `pnpm type-check`

---

## Task 9: Remove OrderPricingSummary Fallback Calculation

**Files:**
- Modify: `packages/marketplace/components/order-detail/OrderPricingSummary.tsx`

**Step 1:** Read the file around lines 51-63.

**Step 2:** Replace the fallback calculations:

```typescript
// Before:
: formatPrice(order.items_total * 0.1)
// After:
: '—'

// Before:
: formatPrice(order.items_total * 0.9)
// After:
: '—'
```

**Step 3:** Run `pnpm type-check`

---

## Task 10: Database Migration

Apply via Supabase MCP. **Check dependent views first** before dropping columns.

**Files:**
- Create: `packages/marketplace/supabase/migrations/114_purchase_flow_fixes.sql`

**Step 1:** Check for views that depend on columns we're dropping:

```sql
SELECT viewname, definition FROM pg_views
WHERE schemaname = 'public'
  AND (definition LIKE '%service_fee%'
    OR definition LIKE '%stripe_%'
    OR definition LIKE '%payout_status%'
    OR definition LIKE '%transferred_to_seller_at%');
```

If views depend on these columns, DROP VIEW first (with plan to recreate without the dropped columns).

**Step 2:** Verify no users have legacy data:

```sql
SELECT count(*) FROM orders WHERE stripe_payment_intent_id IS NOT NULL;
-- Expected: 0
```

**Step 3:** Apply migration in chunks via Supabase MCP `apply_migration`:

**Chunk A — VAT columns on orders:**

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_net_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_vat_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_vat_rate DECIMAL(5,4);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_net_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_vat_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_vat_rate DECIMAL(5,4);
```

**Chunk B — Drop service_fee and fix constraint:**

```sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS total_amount_valid;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee;
ALTER TABLE orders ADD CONSTRAINT total_amount_valid
  CHECK (total_amount = items_total + shipping_cost);
```

**Chunk C — Drop Stripe columns from orders:**

```sql
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_checkout_session_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_group;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_refund_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_reversal_id;
ALTER TABLE orders DROP COLUMN IF EXISTS transferred_to_seller_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payout_status;
```

**Chunk D — Drop Stripe columns from seller_profiles:**

```sql
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_account_id;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_onboarding_completed;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_charges_enabled;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_payouts_enabled;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_details_submitted;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_updated_at;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_requirements;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_capabilities;
DROP INDEX IF EXISTS idx_seller_profiles_stripe_account;
```

**Chunk E — Drop Stripe-era tables:**

```sql
DROP TABLE IF EXISTS seller_payouts;
DROP TABLE IF EXISTS payout_transactions;
```

**Chunk F — Fix credit_seller_wallet RPC:**

```sql
CREATE OR REPLACE FUNCTION credit_seller_wallet(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_commission_cents INTEGER;
  v_credit_cents INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT id, seller_id, items_total,
         platform_commission_cents, seller_wallet_credit_cents,
         wallet_credited_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.wallet_credited_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet already credited for this order');
  END IF;

  -- Read commission from order (set at checkout) instead of recalculating
  IF v_order.seller_wallet_credit_cents IS NOT NULL AND v_order.platform_commission_cents IS NOT NULL THEN
    v_commission_cents := v_order.platform_commission_cents;
    v_credit_cents := v_order.seller_wallet_credit_cents;
  ELSE
    -- Legacy fallback for pre-migration orders
    v_commission_cents := ROUND(ROUND(v_order.items_total * 100) * 0.10);
    v_credit_cents := ROUND(v_order.items_total * 100) - v_commission_cents;
  END IF;

  INSERT INTO wallets (user_id, balance_cents)
  VALUES (v_order.seller_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets
  SET balance_cents = balance_cents + v_credit_cents,
      updated_at = NOW()
  WHERE user_id = v_order.seller_id
  RETURNING balance_cents INTO v_new_balance;

  INSERT INTO wallet_transactions (user_id, type, amount_cents, balance_after_cents, order_id, description)
  VALUES (
    v_order.seller_id,
    'sale_credit',
    v_credit_cents,
    v_new_balance,
    p_order_id,
    'Sale completed'
  );

  -- Only update wallet_credited_at — do NOT overwrite commission values
  UPDATE orders
  SET wallet_credited_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'credit_cents', v_credit_cents,
    'commission_cents', v_commission_cents,
    'new_balance_cents', v_new_balance
  );
END;
$$;
```

**Chunk G — Backfill existing order:**

```sql
UPDATE orders
SET
  commission_vat_rate = 0.2100,
  commission_net_cents = ROUND(platform_commission_cents / 1.21),
  commission_vat_cents = platform_commission_cents - ROUND(platform_commission_cents / 1.21),
  shipping_vat_rate = 0.2100,
  shipping_net_cents = ROUND(ROUND(shipping_cost * 100) / 1.21),
  shipping_vat_cents = ROUND(shipping_cost * 100) - ROUND(ROUND(shipping_cost * 100) / 1.21)
WHERE status IN ('completed', 'delivered')
  AND commission_vat_rate IS NULL
  AND platform_commission_cents IS NOT NULL;
```

**Step 4:** Verify after migration:

```sql
-- VAT columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name LIKE '%vat%';
-- Expected: 6 rows

-- Stripe columns gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name LIKE '%stripe%';
-- Expected: 0 rows

-- service_fee gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'service_fee';
-- Expected: 0 rows

-- Stripe tables gone
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('seller_payouts', 'payout_transactions');
-- Expected: 0 rows
```

**Step 5:** Save the migration file locally for version control.

---

## Task 11: Configure pg_cron Jobs

**Important:** Check if `cron-expire-seller-deadlines` Edge Function exists. The exploration found it does NOT exist yet — needs to be created, OR skip that cron job and keep the existing Next.js API route.

**Files:**
- Applied via Supabase MCP (SQL)

**Step 1:** Enable pg_net:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Step 2:** Check if pg_cron extension is enabled:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not enabled, it should already be available in Supabase — `CREATE EXTENSION IF NOT EXISTS pg_cron;`

**Step 3:** Set up pure SQL cron jobs:

```sql
-- Every 1 minute: expire cart reservations
SELECT cron.schedule(
  'expire-cart-reservations',
  '* * * * *',
  $$
    WITH expired_items AS (
      UPDATE basket_items
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'reserved'
        AND reserved_until < NOW()
      RETURNING listing_id
    )
    UPDATE listings
    SET is_reserved = false, reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
    WHERE id IN (SELECT listing_id FROM expired_items)
      AND is_reserved = true;
  $$
);

-- Every 15 minutes: complete delivered orders past dispute window
SELECT cron.schedule(
  'complete-delivered-orders',
  '*/15 * * * *',
  $$
    DO $do$
    DECLARE
      v_order RECORD;
      v_result JSON;
    BEGIN
      FOR v_order IN
        SELECT id
        FROM orders
        WHERE status = 'delivered'
          AND delivered_at IS NOT NULL
          AND delivered_at + INTERVAL '2 days' < NOW()
          AND wallet_credited_at IS NULL
      LOOP
        UPDATE orders
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_order.id AND status = 'delivered';

        SELECT credit_seller_wallet(v_order.id) INTO v_result;
      END LOOP;
    END $do$;
  $$
);
```

**Step 4:** Set up Edge Function cron jobs via pg_net. First verify the Supabase URL and service role key settings:

```sql
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.service_role_key', true);
```

If these return NULL, the settings aren't configured and pg_net calls will fail. In that case, **skip the pg_net cron jobs** and keep the existing Next.js API routes until the Supabase settings are configured.

If settings exist:

```sql
-- Every 30 minutes: sync tracking from Unisend
SELECT cron.schedule(
  'sync-tracking',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-sync-tracking',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

**Note:** Skip `cron-expire-seller-deadlines` for now since the Edge Function doesn't exist. The existing Next.js route at `app/api/cron/expire-seller-deadlines/route.ts` continues to work.

**Step 5:** Verify cron jobs are registered:

```sql
SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;
```

---

## Task 12: Regenerate Supabase Types

After the migration, regenerate TypeScript types so the new columns are recognized.

**Step 1:** Run Supabase MCP `generate_typescript_types` for project `ettbijaifahenypkmsts`

**Step 2:** Copy the output to `packages/marketplace/lib/supabase/database.types.ts`

**Step 3:** Run `pnpm type-check` — verify no new type errors from the regenerated types.

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

# Verify no flat shipping references
grep -r "SHIPPING_COST_EUROS\|SHIPPING_COST_CENTS" --include="*.ts" --include="*.tsx" packages/marketplace/lib/ packages/marketplace/app/ packages/marketplace/components/
# Expected: 0 results (only in constants.ts definition and test)

# Verify no || 'LT' fallbacks in label routes
grep -n "|| 'LT'" packages/marketplace/app/api/seller/orders/*/accept/route.ts packages/marketplace/app/api/seller/orders/*/retry-label/route.ts
# Expected: 0 results
```

**DB verification (via Supabase MCP):**
- [ ] 6 VAT columns on orders table
- [ ] No stripe columns on orders or seller_profiles
- [ ] No service_fee column
- [ ] No seller_payouts / payout_transactions tables
- [ ] credit_seller_wallet RPC reads from order, doesn't recalculate
- [ ] Existing order has backfilled VAT data
- [ ] pg_cron jobs registered
