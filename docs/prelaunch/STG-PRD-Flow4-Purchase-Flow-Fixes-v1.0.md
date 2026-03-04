# STG PRD: Flow 4 — Purchase Flow Fixes
**Version:** 1.0
**Date:** 2026-03-04
**Status:** Ready for implementation
**Depends on:** Flow 2 (country enforcement at publish), Flow 3 (contact_seller removal, `claim` rename)

---

## 1. Context & Goals

The purchase flow — from cart to checkout to payment to shipping to completion — is functionally complete but has several issues that must be fixed before launch. The most critical: buyers are charged a flat €2.00 for shipping regardless of route (actual costs range €1.90–€3.50), no VAT is tracked on orders (required for EU OSS reporting), commission is calculated twice with potential for disagreement, and country fallbacks silently produce wrong data. Additionally, significant Stripe dead code remains in the database from the pre-EveryPay era.

The purchase flow's core architecture — EveryPay payment with wallet offset, atomic order creation via RPCs, Unisend label generation, tracking sync, dispute window, seller wallet credit — is solid and does not need restructuring. This PRD addresses the data correctness and compliance gaps.

**Goals:**
- Replace flat €2.00 shipping with route-based pricing (the `getShippingPrice()` function already exists)
- Add VAT columns to orders and snapshot at checkout time
- Fix commission double-calculation in `credit_seller_wallet` RPC
- Fix country fallback bugs that silently produce wrong data
- Remove Contact Seller cart check (all listings are Claim after Flow 3)
- Drop all Stripe dead code from the database (15+ columns, 2 tables)
- Drop the unused `service_fee` column and fix its constraint
- Update cart summary to show "calculated at checkout" instead of flat €2.00
- Configure Supabase pg_cron jobs (currently no scheduled jobs are active)

**Not in scope:**
- Auction/basket checkout unification (keep separate paths, fix both identically)
- Email templates (buyer receipt with VAT breakdown — future PRD)
- Seller dashboard changes
- Dispute system changes
- Withdrawal flow changes (already working correctly)

---

## 2. Current Data

1 sold order exists with flat €2.00 shipping. This historical record is left as-is — it records what was actually charged.

---

## 3. Changes

### 3.1 Database Migration

This migration must run **after** Flow 3's migration (which renames `instant_buy` → `claim`).

**New migration file:** `supabase/migrations/114_purchase_flow_fixes.sql`

#### 3.1.1 Add VAT Columns to Orders

```sql
-- VAT tracking for OSS compliance
-- All amounts snapshotted at checkout time, immutable after order creation
ALTER TABLE orders ADD COLUMN commission_net_cents INTEGER;
ALTER TABLE orders ADD COLUMN commission_vat_cents INTEGER;
ALTER TABLE orders ADD COLUMN commission_vat_rate DECIMAL(5,4);
ALTER TABLE orders ADD COLUMN shipping_net_cents INTEGER;
ALTER TABLE orders ADD COLUMN shipping_vat_cents INTEGER;
ALTER TABLE orders ADD COLUMN shipping_vat_rate DECIMAL(5,4);

COMMENT ON COLUMN orders.commission_net_cents IS 'Commission excluding VAT, in cents. Set at checkout.';
COMMENT ON COLUMN orders.commission_vat_cents IS 'VAT portion of commission, in cents. Set at checkout.';
COMMENT ON COLUMN orders.commission_vat_rate IS 'VAT rate applied to commission (e.g., 0.2100 for 21%). Based on destination country under OSS.';
COMMENT ON COLUMN orders.shipping_net_cents IS 'Shipping cost excluding VAT, in cents. Set at checkout.';
COMMENT ON COLUMN orders.shipping_vat_cents IS 'VAT portion of shipping, in cents. Set at checkout.';
COMMENT ON COLUMN orders.shipping_vat_rate IS 'VAT rate applied to shipping (e.g., 0.2200 for EE 22%). Based on destination country.';
```

#### 3.1.2 Drop `service_fee` and Fix Constraint

```sql
-- service_fee is always 0, never set, and embedded in a CHECK constraint
-- Must drop constraint first, then column, then re-add simplified constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS total_amount_valid;
ALTER TABLE orders DROP COLUMN IF EXISTS service_fee;
ALTER TABLE orders ADD CONSTRAINT total_amount_valid
  CHECK (total_amount = items_total + shipping_cost);
```

#### 3.1.3 Drop Stripe Dead Code — Orders Table

```sql
-- Stripe columns on orders — never written by EveryPay flow
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_checkout_session_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_group;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_refund_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_transfer_reversal_id;
ALTER TABLE orders DROP COLUMN IF EXISTS transferred_to_seller_at;

-- payout_status is not used by wallet flow (wallet has its own tracking)
ALTER TABLE orders DROP COLUMN IF EXISTS payout_status;
```

#### 3.1.4 Drop Stripe Dead Code — Seller Profiles Table

```sql
-- Stripe Connect columns on seller_profiles — replaced by wallet/SEPA model
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_account_id;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_onboarding_completed;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_charges_enabled;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_payouts_enabled;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_details_submitted;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_connect_updated_at;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_requirements;
ALTER TABLE seller_profiles DROP COLUMN IF EXISTS stripe_capabilities;
```

#### 3.1.5 Drop Stripe-Era Tables

```sql
-- These tables were for Stripe Connect direct transfers and payouts
-- STG now uses internal wallet + SEPA withdrawals
-- No data exists in these tables (never used with EveryPay)
DROP TABLE IF EXISTS seller_payouts;
DROP TABLE IF EXISTS payout_transactions;
```

#### 3.1.6 Drop Stripe Index

```sql
DROP INDEX IF EXISTS idx_seller_profiles_stripe_account;
```

#### 3.1.7 Fix `credit_seller_wallet` RPC

The current RPC recalculates commission from scratch and overwrites the values set at checkout. After this fix, it reads from the order instead.

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
  -- Lock the order row
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
    -- Legacy fallback: recalculate if not set (pre-migration orders)
    v_commission_cents := ROUND(ROUND(v_order.items_total * 100) * 0.10);
    v_credit_cents := ROUND(v_order.items_total * 100) - v_commission_cents;
  END IF;

  -- Ensure wallet exists
  INSERT INTO wallets (user_id, balance_cents)
  VALUES (v_order.seller_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Credit wallet
  UPDATE wallets
  SET balance_cents = balance_cents + v_credit_cents,
      updated_at = NOW()
  WHERE user_id = v_order.seller_id
  RETURNING balance_cents INTO v_new_balance;

  -- Record transaction
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

**Key change:** The old RPC did `v_commission_cents := ROUND(v_items_total_cents * 0.10)` and then wrote `platform_commission_cents = v_commission_cents` back to the order — overwriting the checkout value. The new RPC reads the existing values and only writes `wallet_credited_at`.

#### 3.1.8 Backfill Existing Order (1 sold order)

```sql
-- Backfill VAT data for the 1 existing completed order
-- This was a LV→LV transaction at flat €2.00 shipping
-- Commission VAT: 21% (LV), Shipping VAT: 21% (LV)
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

---

### 3.2 VAT Calculation Service

#### 3.2.1 Add VAT Rate Lookup and Split Calculator

**Modify:** `lib/services/pricing.ts`

Add these types and functions after the existing exports:

```typescript
// ==============================================
// VAT
// ==============================================

/**
 * VAT rates by destination country (EU OSS)
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
  vatRate: number; // e.g. 0.21
}

/**
 * Get the VAT rate for a destination country
 */
export function getVatRate(destinationCountry: string | null | undefined): number {
  if (!destinationCountry) return DEFAULT_VAT_RATE;
  return VAT_RATES[destinationCountry.toUpperCase()] ?? DEFAULT_VAT_RATE;
}

/**
 * Back-calculate VAT from a gross (VAT-inclusive) amount
 * Commission and shipping prices are VAT-inclusive.
 *
 * Example: grossCents=250, vatRate=0.21
 *   netCents = round(250 / 1.21) = 207
 *   vatCents = 250 - 207 = 43
 */
export function calculateVatSplit(grossCents: number, vatRate: number): VatSplit {
  const netCents = Math.round(grossCents / (1 + vatRate));
  const vatCents = grossCents - netCents;
  return { grossCents, netCents, vatCents, vatRate };
}
```

#### 3.2.2 Add Order VAT Interface

Add to the `OrderPricing` interface extension:

```typescript
export interface OrderVat {
  commissionVat: VatSplit;
  shippingVat: VatSplit;
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

  // Commission VAT: back-calculate from gross commission
  const commissionVat = calculateVatSplit(base.commissionCents, vatRate);

  // Shipping VAT: back-calculate from gross shipping cost
  const shippingVat = calculateVatSplit(shippingCostCents, vatRate);

  return { ...base, commissionVat, shippingVat };
}
```

---

### 3.3 Replace Flat Shipping with Route-Based Pricing

#### 3.3.1 Delete Flat Shipping Constants

**Modify:** `lib/pricing/constants.ts`

```typescript
// Before:
export const SHIPPING_COST_CENTS = 200; // €2.00 flat rate
export const SHIPPING_COST_EUROS = 2.0;

// After: DELETE both lines entirely
// Route-based pricing is in lib/unisend/types.ts → getShippingPrice()
```

Keep `SELLER_COMMISSION_RATE` and `DISPUTE_WINDOW_DAYS`.

#### 3.3.2 Delete Flat Shipping Tests

**Modify:** `lib/pricing/constants.test.ts`

Remove the test that asserts `SHIPPING_COST_CENTS === SHIPPING_COST_EUROS * 100`. The constants no longer exist. If the test file only tests these constants, delete the entire file.

#### 3.3.3 Fix Basket Checkout Route

**Modify:** `app/api/checkout/create-session/route.ts`

```typescript
// Before (line 3):
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';

// After:
import { getShippingPrice } from '@/lib/unisend';

// Before (line 118-119):
const sellerCountry = basket.seller_country || 'LV';
const shippingCostEuros = input.shippingMethod === 't2t' ? SHIPPING_COST_EUROS : 0;

// After:
if (input.shippingMethod === 't2t') {
  if (!basket.seller_country) {
    return NextResponse.json(
      { error: 'Seller country not set. Cannot calculate shipping.' },
      { status: 400 }
    );
  }
  if (!input.destinationCountry) {
    return NextResponse.json(
      { error: 'Destination country required for T2T shipping.' },
      { status: 400 }
    );
  }
}

const sellerCountry = basket.seller_country as string;
const shippingCostEuros = input.shippingMethod === 't2t'
  ? getShippingPrice(
      sellerCountry as 'LV' | 'LT' | 'EE',
      input.destinationCountry as 'LV' | 'LT' | 'EE',
      'M' // Default parcel size for pricing; actual size selected at accept time
    )
  : 0;
```

**Also** pass `destinationCountry` through to the checkout service for VAT calculation (see Section 3.4).

#### 3.3.4 Fix Auction Checkout Route

**Modify:** `app/api/auctions/[id]/checkout/route.ts`

Same pattern as 3.3.3 — replace `SHIPPING_COST_EUROS` import with `getShippingPrice` and compute from seller/destination countries. Add the same seller_country and destination_country validation.

```typescript
// Before (line 3):
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';

// After:
import { getShippingPrice } from '@/lib/unisend';

// Before (line 122):
const shippingCostEuros = shippingMethod === 't2t' ? SHIPPING_COST_EUROS : 0;

// After:
const shippingCostEuros = shippingMethod === 't2t'
  ? getShippingPrice(
      sellerCountry as 'LV' | 'LT' | 'EE',
      destinationCountry as 'LV' | 'LT' | 'EE',
      'M'
    )
  : 0;
```

#### 3.3.5 Fix Checkout Page (Client-Side Display)

**Modify:** `app/[locale]/checkout/page.tsx`

```typescript
// Before (line 24):
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';

// After:
// No constant import needed. Fetch shipping price from API when destination changes.

// Before (line 332):
const shippingCostCents = Math.round(SHIPPING_COST_EUROS * 100);

// After:
// shippingCostCents is now state, updated when buyer selects destination country
const [shippingCostCents, setShippingCostCents] = useState<number>(0);
const [shippingLoading, setShippingLoading] = useState(false);
```

Add an effect that calls the existing `/api/shipping/price` endpoint when the buyer selects a destination country:

```typescript
useEffect(() => {
  if (shippingMethod !== 't2t' || !sellerCountry || !destinationCountry) {
    setShippingCostCents(0);
    return;
  }
  setShippingLoading(true);
  fetch(`/api/shipping/price?from=${sellerCountry}&to=${destinationCountry}&size=M`)
    .then(res => res.json())
    .then(data => {
      setShippingCostCents(Math.round(data.price * 100));
    })
    .catch(() => {
      // Fallback: use the getShippingPrice import directly (it's a pure function)
      // This is a client-safe import since it's just a lookup table
      setShippingCostCents(0);
    })
    .finally(() => setShippingLoading(false));
}, [sellerCountry, destinationCountry, shippingMethod]);
```

The `sellerCountry` is already available from the basket data returned by the cart API (`basket.seller_country`). The `destinationCountry` is set when the buyer selects a destination in the terminal selector.

**Display:** When `shippingCostCents === 0` and `shippingMethod === 't2t'`, show "Select destination to see shipping cost" in the pricing summary. When loaded, show the actual amount.

#### 3.3.6 Fix Cart Summary

**Modify:** `components/cart/CartBasketSummary.tsx`

```typescript
// Before:
import { SHIPPING_COST_EUROS } from '@/lib/pricing/constants';

interface CartBasketSummaryProps {
  subtotal: number;
  shippingCost?: number;
}

export function CartBasketSummary({
  subtotal,
  shippingCost = SHIPPING_COST_EUROS,
}: CartBasketSummaryProps) {
  const total = subtotal + shippingCost;
  // ...shows formatPrice(shippingCost)
}

// After:
interface CartBasketSummaryProps {
  subtotal: number;
}

export function CartBasketSummary({ subtotal }: CartBasketSummaryProps) {
  const { t } = useTranslations('Cart');
  // No total calculation here — shipping unknown until checkout

  return (
    // ...
    <div className="flex justify-between">
      <span>{t('basket.shipping')}</span>
      <span className="text-text-secondary text-sm">
        {t('basket.shippingAtCheckout')}
      </span>
    </div>
    <div className="flex justify-between font-semibold border-t border-border-subtle pt-2 mt-2">
      <span>{t('basket.subtotal')}</span>
      <span>{formatPrice(subtotal)}</span>
    </div>
    // ...
  );
}
```

**Translation keys:**

| Key | EN | LV | LT | ET |
|-----|----|----|----|----|
| `Cart.basket.shippingAtCheckout` | Calculated at checkout | Tiks aprēķināta pie apmaksas | Apskaičiuojama apmokant | Arvutatakse kassas |
| `Cart.basket.subtotal` | Subtotal | Starpsumma | Tarpinė suma | Vahesumma |

---

### 3.4 Integrate VAT into Checkout Service

Both checkout paths (basket and auction) need to calculate and store VAT at order creation time.

#### 3.4.1 Add `destinationCountry` to Checkout Metadata

**Modify:** `lib/services/checkout.ts`

The `CheckoutInput` type already has `destinationCountry?: string`. No type change needed.

Replace `calculateOrderPricing` with `calculateOrderPricingWithVat` throughout:

```typescript
// Before (in createCheckoutSession):
import { calculateCheckoutPricingFromEuros, calculateOrderPricing } from './pricing';

const orderPricing = calculateOrderPricing(
  pricing.itemsTotalCents,
  pricing.shippingCostCents
);

// After:
import {
  calculateCheckoutPricingFromEuros,
  calculateOrderPricingWithVat,
} from './pricing';

const orderPricing = calculateOrderPricingWithVat(
  pricing.itemsTotalCents,
  pricing.shippingCostCents,
  input.destinationCountry
);
```

#### 3.4.2 Store VAT on Order (Wallet-Only Path)

In the wallet-only branch of `createCheckoutSession`, after the order is created by the RPC:

```typescript
// Before:
await supabase
  .from('orders')
  .update({
    locale,
    platform_commission_cents: orderPricing.commissionCents,
    seller_wallet_credit_cents: orderPricing.walletCreditCents,
  })
  .eq('id', orderId);

// After:
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

#### 3.4.3 Store VAT in EveryPay Metadata

In the EveryPay branch, add VAT fields to the metadata payload stored in `everypay_webhook_events`:

```typescript
payload: {
  // ...existing fields...
  commission_net_cents: orderPricing.commissionVat.netCents,
  commission_vat_cents: orderPricing.commissionVat.vatCents,
  commission_vat_rate: orderPricing.commissionVat.vatRate,
  shipping_net_cents: orderPricing.shippingVat.netCents,
  shipping_vat_cents: orderPricing.shippingVat.vatCents,
  shipping_vat_rate: orderPricing.shippingVat.vatRate,
},
```

#### 3.4.4 Read VAT from Metadata in Webhook Callback

**Modify:** `app/api/webhooks/everypay/callback/route.ts`

In `processBasketPayment`, after order creation, write VAT fields:

```typescript
// After the existing .update() that writes locale/commission/wallet_credit:
await supabase
  .from('orders')
  .update({
    locale,
    platform_commission_cents: commissionCents,
    seller_wallet_credit_cents: walletCreditCents,
    everypay_payment_state: paymentState,
    // VAT fields from checkout metadata
    commission_net_cents: (metadata.commission_net_cents as number) || null,
    commission_vat_cents: (metadata.commission_vat_cents as number) || null,
    commission_vat_rate: (metadata.commission_vat_rate as number) || null,
    shipping_net_cents: (metadata.shipping_net_cents as number) || null,
    shipping_vat_cents: (metadata.shipping_vat_cents as number) || null,
    shipping_vat_rate: (metadata.shipping_vat_rate as number) || null,
  })
  .eq('id', orderId);
```

Same pattern for `processAuctionPayment`.

#### 3.4.5 Auction Checkout Service — Same Changes

Apply identical changes to `createAuctionCheckoutSession`:
- Import `calculateOrderPricingWithVat`
- Pass destination country for VAT rate lookup
- Store VAT on order (wallet-only path)
- Store VAT in EveryPay metadata (EveryPay path)

The destination country comes from `input.destinationCountry` which is already on `AuctionCheckoutInput`.

---

### 3.5 Fix Country Fallback Bugs

#### 3.5.1 Checkout Create-Session

Already addressed in Section 3.3.3 — the route now returns a 400 error if `seller_country` is null for T2T shipping, instead of silently defaulting to `'LV'`.

#### 3.5.2 Seller Accept Order

**Modify:** `app/api/seller/orders/[id]/accept/route.ts`

```typescript
// Before (line 177):
senderCountry: (sellerProfile.country || 'LT') as 'LT' | 'LV' | 'EE',

// After:
senderCountry: sellerProfile.country as 'LT' | 'LV' | 'EE',
```

Add an explicit check before label generation:

```typescript
// Add before the label generation try block:
if (!sellerProfile.country || !['LV', 'LT', 'EE'].includes(sellerProfile.country)) {
  await updateOrderLabelError(orderId,
    'Seller country not set. Please update your country in Account Settings.'
  );
  postOrderAcceptedMessage(orderId, 't2t', false);
  return NextResponse.json({
    success: true,
    orderId,
    shippingMethod: result.shipping_method,
    labelGenerated: false,
    labelError: 'Seller country not set. Please update your country in Account Settings.',
    message: 'Order accepted, but label generation failed — seller country missing.',
  });
}
```

Same check for `order.destination_country`:

```typescript
if (!order.destination_country || !['LV', 'LT', 'EE'].includes(order.destination_country)) {
  // This should never happen (checkout validates it), but defend anyway
  await updateOrderLabelError(orderId, 'Destination country missing on order.');
  // ...same pattern
}
```

Remove the `|| 'LT'` fallback from log lines too (lines 168-169).

#### 3.5.3 Seller Retry Label

**Modify:** `app/api/seller/orders/[id]/retry-label/route.ts`

Same fix — remove `|| 'LT'` fallback, add explicit validation before label generation. The pattern is identical to 3.5.2.

---

### 3.6 Remove Contact Seller Cart Check

**Modify:** `app/api/cart/route.ts`

This check was already flagged in the Flow 3 audit but lives in the purchase flow:

```typescript
// Before (lines 89-107):
// Check if listing is contact_seller type (cannot be added to cart)
const isContactSeller = listing.transaction_method === 'contact_seller'
  || listing.listing_type === 'contact_seller';
if (isContactSeller) {
  return NextResponse.json(
    { error: 'Contact seller listings cannot be added to cart' },
    { status: 400 }
  );
}

// After: DELETE this entire block.
// All listings are Claim after Flow 3. The only check needed is that the
// listing is active and not already reserved, which is handled by the
// add_to_cart RPC.
```

---

### 3.7 Remove OrderPricingSummary Fallback Calculation

**Modify:** `components/order-detail/OrderPricingSummary.tsx`

The component currently recalculates commission in the UI as a fallback:

```tsx
// Before:
{commissionCents != null
  ? formatCentsToCurrency(commissionCents)
  : formatPrice(order.items_total * 0.1)}

// After:
{commissionCents != null
  ? formatCentsToCurrency(commissionCents)
  : '—'}
```

Same for `sellerCreditCents`:
```tsx
// Before:
{sellerCreditCents != null
  ? formatCentsToCurrency(sellerCreditCents)
  : formatPrice(order.items_total * 0.9)}

// After:
{sellerCreditCents != null
  ? formatCentsToCurrency(sellerCreditCents)
  : '—'}
```

With the commission fix in 3.1.7, `platform_commission_cents` will always be set at checkout. The fallback is now just a safety display for any edge-case data.

---

### 3.8 Configure Supabase Cron Jobs (pg_cron)

All scheduled jobs run via Supabase's `pg_cron` extension (already enabled). This avoids Vercel plan limitations entirely and keeps scheduling in the same infrastructure as the database.

Two categories:
- **Pure SQL** — jobs that only update database rows based on time conditions. These run as direct SQL statements in pg_cron.
- **Edge Function invocation** — jobs that need external HTTP calls (EveryPay refund, Unisend tracking API). These use `pg_net` to call Supabase Edge Functions.

**Add to migration:** `supabase/migrations/114_purchase_flow_fixes.sql` (after the schema changes)

#### 3.8.1 Enable pg_net Extension

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

#### 3.8.2 Expire Cart Reservations (Pure SQL)

Cart items reserved for >30 minutes get released. This is a simple row update — no HTTP calls needed.

```sql
-- Every 1 minute: release expired cart reservations
SELECT cron.schedule(
  'expire-cart-reservations',
  '* * * * *',
  $$
    -- Mark expired basket items as expired and unreserve the listing
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
```

#### 3.8.3 Complete Delivered Orders (Pure SQL)

Orders past the 2-day dispute window get completed and seller wallet credited. The `credit_seller_wallet` RPC is already a SQL function, so this can stay in pure SQL.

```sql
-- Every 15 minutes: complete orders past dispute window
SELECT cron.schedule(
  'complete-delivered-orders',
  '*/15 * * * *',
  $$
    DO $$
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
        -- Update status
        UPDATE orders
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_order.id AND status = 'delivered';

        -- Credit seller wallet using existing RPC
        SELECT credit_seller_wallet(v_order.id) INTO v_result;
      END LOOP;
    END $$;
  $$
);
```

#### 3.8.4 Expire Seller Deadlines (Edge Function via pg_net)

Orders past the 24h seller response deadline need to be cancelled with a buyer refund (EveryPay void/refund). This requires HTTP calls to EveryPay, so it invokes an Edge Function.

```sql
-- Every 5 minutes: cancel orders past seller deadline
-- Uses pg_net to call Edge Function (needs EveryPay API for refund)
SELECT cron.schedule(
  'expire-seller-deadlines',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-expire-seller-deadlines',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

The Edge Function `cron-expire-seller-deadlines` already exists — it queries for `status = 'pending_seller'` orders past their `seller_deadline`, cancels them, triggers EveryPay void/refund, and re-activates the listing.

#### 3.8.5 Sync Tracking (Edge Function via pg_net)

Polls Unisend API for tracking updates on shipped orders. Requires external HTTP calls.

```sql
-- Every 30 minutes: sync tracking status from Unisend
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

The Edge Function `cron-sync-tracking` already exists — it queries orders with `status = 'accepted'` or `status = 'shipped'`, calls the Unisend tracking API, writes events to `tracking_events`, and updates order status to `'delivered'` when parcel is picked up.

#### 3.8.6 Supabase Project Settings Required

For `pg_net` to call Edge Functions, the project URL and service role key must be available as Postgres settings. These are typically pre-configured in Supabase hosted projects as:

- `current_setting('app.settings.supabase_url')` → `https://<project-ref>.supabase.co`
- `current_setting('app.settings.service_role_key')` → the service role JWT

**Verify these exist** before deploying the migration. If not set, add them via the Supabase Dashboard under Database → Extensions → pg_net configuration, or set them manually:

```sql
-- Only needed if not already configured by Supabase
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
```

#### 3.8.7 Remove Existing Next.js Cron Routes (Cleanup)

The following API routes were built for Vercel Cron and are no longer needed. They can be deleted or kept as manual trigger endpoints (with auth):

- `app/api/cron/expire-reservations/route.ts` — logic now in pg_cron SQL
- `app/api/cron/complete-delivered-orders/route.ts` — logic now in pg_cron SQL
- `app/api/cron/expire-seller-deadlines/route.ts` — still exists as Edge Function, Next.js route is redundant
- `app/api/cron/sync-tracking/route.ts` — still exists as Edge Function, Next.js route is redundant

**Recommendation:** Keep the routes for now but add a comment noting they're superseded by pg_cron. Delete in a future cleanup once cron jobs are verified working in production.

---

## 4. Files Changed Summary

| File | Change | Section |
|------|--------|---------|
| `supabase/migrations/114_purchase_flow_fixes.sql` | **NEW** — VAT columns, Stripe cleanup, service_fee drop, RPC fix | 3.1 |
| `lib/services/pricing.ts` | Add VAT types, `getVatRate()`, `calculateVatSplit()`, `calculateOrderPricingWithVat()` | 3.2 |
| `lib/pricing/constants.ts` | Delete `SHIPPING_COST_CENTS` and `SHIPPING_COST_EUROS` | 3.3.1 |
| `lib/pricing/constants.test.ts` | Delete or update flat shipping tests | 3.3.2 |
| `app/api/checkout/create-session/route.ts` | Route-based shipping, country validation, VAT in metadata | 3.3.3, 3.4 |
| `app/api/auctions/[id]/checkout/route.ts` | Same — route-based shipping, VAT | 3.3.4, 3.4.5 |
| `app/[locale]/checkout/page.tsx` | Dynamic shipping price from API, state-based display | 3.3.5 |
| `components/cart/CartBasketSummary.tsx` | "Calculated at checkout" instead of flat €2.00 | 3.3.6 |
| `lib/services/checkout.ts` | Use `calculateOrderPricingWithVat`, store VAT on order | 3.4.1–3.4.3 |
| `app/api/webhooks/everypay/callback/route.ts` | Read VAT from metadata, write to order | 3.4.4 |
| `app/api/seller/orders/[id]/accept/route.ts` | Remove `\|\| 'LT'` fallback, add country validation | 3.5.2 |
| `app/api/seller/orders/[id]/retry-label/route.ts` | Same country validation fix | 3.5.3 |
| `app/api/cart/route.ts` | Delete Contact Seller cart check | 3.6 |
| `components/order-detail/OrderPricingSummary.tsx` | Remove fallback commission calculation | 3.7 |
| `supabase/migrations/114_purchase_flow_fixes.sql` | Also contains: pg_cron jobs, pg_net extension | 3.8 |

**Translation files to update (4 locales):**
- `Cart.basket.shippingAtCheckout` — new key (Section 3.3.6)

---

## 5. VAT Reference

### Rate Table

| Destination | Commission VAT | Shipping VAT | Notes |
|-------------|---------------|--------------|-------|
| LV | 21% | 21% | STG home country |
| LT | 21% | 21% | EU OSS rate |
| EE | 22% | 22% | Estonia's standard rate |

### Calculation Method

All prices are **VAT-inclusive** (gross). VAT is **back-calculated** from the gross amount:

```
net = round(gross / (1 + vatRate))
vat = gross - net
```

Example — €25 game, LV seller → EE buyer:
```
Commission gross:  250 cents (10% of €25.00)
Commission net:    round(250 / 1.22) = 205 cents
Commission VAT:    250 - 205 = 45 cents
Commission rate:   0.2200

Shipping gross:    210 cents (LV→EE route, size M)
Shipping net:      round(210 / 1.22) = 172 cents
Shipping VAT:      210 - 172 = 38 cents
Shipping rate:     0.2200
```

### For Local Pickup Orders

When `shippingMethod === 'local_pickup'`:
- `shipping_cost` = 0
- `shipping_net_cents` = 0
- `shipping_vat_cents` = 0
- `shipping_vat_rate` = NULL (no shipping, no VAT to calculate)

Commission VAT still applies based on the buyer's country (if known). For local pickup where destination country may not be set, fall back to LV domestic rate (21%).

---

## 6. Shipping Price Reference

Prices from `lib/unisend/types.ts` `SHIPPING_PRICES` constant. All sizes currently have the same price per route.

| From → To | Price (€) |
|-----------|-----------|
| LV → LV | 1.90 |
| LV → LT | 2.10 |
| LV → EE | 2.10 |
| LT → LT | 2.70 |
| LT → LV | 2.50 |
| LT → EE | 2.70 |
| EE → EE | 2.80 |
| EE → LV | 3.20 |
| EE → LT | 3.50 |

These are the values returned by `getShippingPrice(from, to, size)`. Each order records its shipping cost in `orders.shipping_cost` — this is the snapshot.

---

## 7. Implementation Order

1. **Migration** (3.1) — Add VAT columns, drop Stripe columns/tables, fix RPC, drop service_fee
2. **Pricing service** (3.2) — Add VAT functions (no side effects, pure functions)
3. **Flat shipping removal** (3.3.1–3.3.2) — Delete constants and tests
4. **Cart summary** (3.3.6) — "Calculated at checkout"
5. **Checkout routes** (3.3.3–3.3.4) — Route-based shipping + country validation
6. **Checkout page** (3.3.5) — Dynamic shipping display
7. **Checkout service + webhook** (3.4) — VAT calculation and storage
8. **Country fallbacks** (3.5) — Accept/retry-label validation
9. **Cart cleanup** (3.6) — Remove Contact Seller check
10. **Order display** (3.7) — Remove fallback calculation
11. **Cron config** (3.8) — pg_cron jobs in migration (deployed with step 1)
12. **Test end-to-end** — Verify a checkout with LV→EE route shows correct shipping + VAT

Steps 1–4 can be deployed independently. Steps 5–7 should go together (shipping + VAT are intertwined). Steps 8–11 are independent cleanups.

---

## 8. Acceptance Criteria

- [ ] No import of `SHIPPING_COST_EUROS` or `SHIPPING_COST_CENTS` in any `.ts`/`.tsx` file
- [ ] Checkout with LV→LV T2T route charges €1.90 shipping (not €2.00)
- [ ] Checkout with EE→LT T2T route charges €3.50 shipping
- [ ] Local pickup checkout charges €0.00 shipping
- [ ] Cart basket summary shows "Calculated at checkout" for shipping, not €2.00
- [ ] Every new order has `commission_vat_rate`, `commission_net_cents`, `commission_vat_cents` set
- [ ] Every new T2T order has `shipping_vat_rate`, `shipping_net_cents`, `shipping_vat_cents` set
- [ ] EE-destination orders have VAT rate 0.2200; LV/LT-destination orders have 0.2100
- [ ] `credit_seller_wallet` RPC reads `seller_wallet_credit_cents` from order, does not recalculate
- [ ] `credit_seller_wallet` RPC does not overwrite `platform_commission_cents` on the order
- [ ] Checkout returns 400 if seller_country is null for T2T shipping
- [ ] Accept order returns label error if seller country is not LV/LT/EE (no silent `'LT'` default)
- [ ] No `contact_seller` check in cart route
- [ ] No `stripe_payment_intent_id` column on orders table
- [ ] No `stripe_connect_account_id` column on seller_profiles table
- [ ] No `payout_transactions` or `seller_payouts` tables
- [ ] No `service_fee` column on orders table
- [ ] `total_amount_valid` constraint is `total_amount = items_total + shipping_cost`
- [ ] All 4 cron jobs registered in pg_cron (`SELECT * FROM cron.job` shows 4 entries)
- [ ] `expire-cart-reservations` runs every minute (pure SQL)
- [ ] `complete-delivered-orders` runs every 15 minutes (pure SQL, calls `credit_seller_wallet`)
- [ ] `expire-seller-deadlines` runs every 5 minutes (pg_net → Edge Function)
- [ ] `sync-tracking` runs every 30 minutes (pg_net → Edge Function)
- [ ] pg_net extension enabled
- [ ] Existing completed order has backfilled VAT data

---

## 9. Decisions

1. **Cart shows "Calculated at checkout"** — no shipping number until destination is selected at checkout. Cleanest approach, no false expectations.

2. **VAT is back-calculated from gross (VAT-inclusive) amounts.** The 10% commission is the total the seller pays. VAT is extracted from within that 10%, not added on top. Example: €25 item → €2.50 commission gross → at 21% VAT, the net commission is €2.07 and VAT is €0.43.

3. **Stripe cleanup included in this PRD** — clean slate before launch. No data exists in the Stripe-era tables.

4. **Auction and basket checkout remain separate paths.** Both get identical shipping + VAT fixes. Unification is deferred to a future cleanup.

5. **`commission_vat_rate` follows destination country** under EU OSS rules: 21% for LV/LT, 22% for EE. Same rate for shipping VAT.

6. **Existing order data left as-is** for shipping cost (€2.00 was what was charged). VAT columns backfilled using LV domestic rate (the only historical order was LV→LV).

7. **Default parcel size for pricing is 'M'** — all sizes currently have the same price per route in Unisend. The `getShippingPrice()` function accepts size for future differentiation. Actual parcel size is selected by the seller at accept time (for label generation), not at checkout.

---

## 10. Cross-References

- **Flow 2 PRD** enforces `country` and `phone` at listing publish time → by the time a listing reaches checkout, seller_country should always be set. The country validation in this PRD (3.5) is defense-in-depth.
- **Flow 3 PRD** renames `instant_buy` → `claim` and removes Contact Seller paths. The cart check removal in this PRD (3.6) removes the last Contact Seller reference in the purchase flow.
- **Flow 3 PRD** migration runs first (renames transaction_method values). This PRD's migration (114) runs after.
