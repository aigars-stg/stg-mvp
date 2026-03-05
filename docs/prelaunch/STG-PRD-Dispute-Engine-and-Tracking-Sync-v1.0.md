# STG-PRD-Dispute-Engine-and-Tracking-Sync-v1.0

**Product Requirements Document**
**Feature:** Dispute Resolution Engine, Unisend Tracking Sync, EveryPay Refund Integration
**Version:** 1.0 | March 2026
**Author:** Aigars (via Claude strategy session)
**For:** Claude Code implementation
**Supabase Project:** `ettbijaifahenypkmsts`
**Repo:** `github.com/aigars-stg/stg-mvp`

---

## 1. Context & Business Decision Log

### What this PRD covers

Three interconnected systems that must ship together:

1. **Unisend Tracking Sync** — polls Unisend API to advance order status through the lifecycle
2. **Dispute Resolution Engine** — buyer/seller dispute workflow with admin resolution
3. **EveryPay Refund Integration** — processes refunds back to original payment method

### Key business decisions (locked)

| Decision | Answer | Rationale |
|---|---|---|
| Refund destination | Original payment method (card or bank link), proportionally split if mixed with wallet | Pure buyers don't have wallets; trust requires card-back refunds |
| Dispute resolution model | Admin-only (Aigars reviews every dispute manually) | Early stage, low volume, need human judgement |
| Inspection window | 2 days after delivery | Balances buyer protection with seller cash flow |
| Shipping deadline | 2 business days after seller confirms (per seller agreement) | Already in seller ToS |
| Return shipping | STG covers (via Unisend PRODUCT_RETURN label) | Builds trust, valid claims only |
| Scenarios 6+7 | Combined into single "Not as described / missing components" dispute type | Reduces complexity, same resolution flow |
| Scenario 15 (payment failure) | Removed — STG waits for payment completion before creating order | Payment is synchronous |
| Unisend label cost | Only charged when shipped, not when label created | Confirmed by Aigars |
| Unisend claims | STG files directly as sender | Unisend only accepts claims from sender; STG creates the labels |

### Codebase discrepancies to be aware of

- **Font:** Codebase uses **Inter**, brand docs say **Comfortaa/Lato** — defer to codebase for this PRD
- **Stripe references:** Legacy functions and an old `create_order_from_basket` overload reference Stripe. Do NOT use or extend these. The current system uses EveryPay.
- **No exclamation marks** in UI copy (reserved for celebrations only per brand voice guide)

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     CRON JOBS (Supabase)                      │
│                                                              │
│  Every 15 min: sync_unisend_tracking()                       │
│  Every 15 min: handle_expired_seller_deadlines() ← EXISTS    │
│  Daily 01:00: complete_delivered_orders() ← EXISTS, PATCH    │
│  Every 1h:    escalate_expired_disputes()                    │
└────────────┬───────────────────────────┬─────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐  ┌─────────────────────────────────┐
│  Unisend API (polling) │  │  Database Functions (Supabase)   │
│  GET /api/v2/parcel/   │  │  • mark_order_disputed()  PATCH │
│  {parcelId}            │  │  • report_order_issue()   PATCH │
│                        │  │  • resolve_dispute()       NEW  │
│  No webhooks available │  │  • process_refund()        NEW  │
│  Poll every 30 min for │  │  • complete_delivered_orders()   │
│  active shipments      │  │    PATCH (add dispute guard)    │
└────────────────────────┘  └─────────────────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐  ┌─────────────────────────────────┐
│  EveryPay Refund API   │  │  Staff Dashboard (Next.js)       │
│  POST /api/v4/payments │  │  /[locale]/dashboard/admin/      │
│  /refund               │  │    disputes                      │
│  Basic Auth + nonce    │  │                                  │
│                        │  │  Dispute queue + detail + actions │
│  ⚠️ Swedbank bank link │  │  SEPA manual refund workflow     │
│  = mark only, no money │  │                                  │
│  movement. Must SEPA.  │  └─────────────────────────────────┘
└────────────────────────┘
```

---

## 3. Database Changes

### 3.1 Fix existing CHECK constraints

```sql
-- CRITICAL: Add in_transit to order status
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN ('pending_seller', 'accepted', 'shipped', 'in_transit',
             'delivered', 'completed', 'cancelled', 'disputed', 'refunded')
);

-- CRITICAL: Add lt, et to locale constraint
ALTER TABLE orders DROP CONSTRAINT orders_locale_check;
ALTER TABLE orders ADD CONSTRAINT orders_locale_check CHECK (
  locale IN ('en', 'lv', 'lt', 'et')
);
```

### 3.2 New columns on `orders` table

```sql
-- Shipping deadline (2 business days after seller_responded_at)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_deadline timestamptz;

-- Refund tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status varchar DEFAULT NULL;
-- Values: NULL, 'pending', 'processing', 'completed', 'failed', 'manual_sepa_required'
ALTER TABLE orders ADD CONSTRAINT orders_refund_status_check CHECK (
  refund_status IS NULL OR refund_status IN (
    'pending', 'processing', 'completed', 'failed', 'manual_sepa_required'
  )
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_everypay_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_sepa_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method varchar;
-- Values: 'everypay_card', 'everypay_bank_link', 'manual_sepa', 'wallet_only', 'mixed'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_initiated_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_completed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_error text;

-- Unisend claim tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_filed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unisend_claim_status varchar;
-- Values: NULL, 'filed', 'under_review', 'approved', 'denied'

-- Payment method record (for refund routing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar;
-- Values: 'card', 'bank_link', 'wallet_only', 'mixed'
-- Set at checkout time
```

### 3.3 New columns on `order_issues` table

```sql
-- Link to Unisend PRODUCT_RETURN label for returns
ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_label_barcode varchar;
ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_label_url text;
ALTER TABLE order_issues ADD COLUMN IF NOT EXISTS return_tracking_url text;
```

### 3.4 Schedule missing cron jobs

```sql
-- handle_expired_seller_deadlines: runs every 15 min
SELECT cron.schedule(
  'handle-expired-seller-deadlines',
  '*/15 * * * *',
  'SELECT handle_expired_seller_deadlines()'
);

-- Tracking sync: runs every 30 min
SELECT cron.schedule(
  'sync-unisend-tracking',
  '*/30 * * * *',
  $$ SELECT net.http_post(
    url := 'https://stg-mvp-marketplace.vercel.app/api/cron/sync-tracking',
    headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
  ) $$
);

-- Dispute escalation: runs every hour
SELECT cron.schedule(
  'escalate-expired-disputes',
  '5 * * * *',
  'SELECT escalate_expired_disputes()'
);
```

Note: `sync_unisend_tracking` calls an API route (not a DB function) because it needs to call the external Unisend API. The API route authenticates via a shared `CRON_SECRET` env var.

### 3.5 Cleanup legacy functions

Drop or mark as deprecated (do NOT delete if any code still references them — check first):

- `seller_can_receive_payouts()` — references Stripe columns
- `get_pending_payouts()` — references non-existent `service_fee` and `payout_status` columns
- `get_seller_payout_stats()` — references non-existent `seller_payouts` table
- The old `create_order_from_basket` overload with `p_stripe_payment_intent_id` and `p_service_fee` params

---

## 4. Unisend Tracking Sync

### 4.1 API details

- **Base URL:** `https://api-manosiuntos.post.lt/api/v2/`
- **Auth:** OAuth2 Bearer token
- **Endpoint:** `GET /api/v2/parcel/{parcelId}` — returns current status and events
- **No webhooks available** — polling is the only option
- **Rate limits:** Not explicitly documented. Use 30-min intervals, max ~48 orders polled per cycle. If volume grows, batch requests.
- **Tracking data retention:** 6 months (private) / 18 months (business)

### 4.2 API route: `POST /api/cron/sync-tracking`

```
Location: src/app/api/cron/sync-tracking/route.ts
Auth: Bearer token from CRON_SECRET env var
```

**Logic:**

1. Query all orders where `status IN ('accepted', 'shipped', 'in_transit')` AND `unisend_parcel_id IS NOT NULL`
2. For each order, call Unisend `GET /api/v2/parcel/{unisend_parcel_id}`
3. Parse tracking events from response
4. For each new event, call `add_tracking_event()` (already exists — inserts with ON CONFLICT DO NOTHING)
5. The `add_tracking_event()` function already handles status transitions via its CASE statement

### 4.3 Patch `add_tracking_event()` function

Current function has the `in_transit` bug. Update the CASE statement:

```sql
CASE p_state_type
  WHEN 'PARCEL_RECEIVED' THEN
    -- Seller dropped parcel at origin locker
    UPDATE orders SET status = 'shipped', updated_at = NOW()
    WHERE id = p_order_id AND status = 'accepted';
  WHEN 'ON_THE_WAY' THEN
    -- Parcel in transit between lockers
    UPDATE orders SET status = 'in_transit', updated_at = NOW()
    WHERE id = p_order_id AND status IN ('accepted', 'shipped');
  WHEN 'PARCEL_DELIVERED' THEN
    -- Parcel arrived at destination locker (buyer can now collect)
    UPDATE orders SET
      status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = p_order_id AND status IN ('shipped', 'in_transit');
  WHEN 'PARCEL_PICKED_UP' THEN
    -- Buyer collected from locker (informational, no status change)
    NULL;
  WHEN 'RETURNED_TO_SENDER' THEN
    -- Buyer didn't collect within 72h, parcel returned
    -- Don't auto-cancel — admin reviews or buyer contacts support
    NULL; -- Log the event, surface in dashboard
  ELSE
    NULL;
END CASE;
```

Note: The exact Unisend `state_type` values need verification against the authenticated API docs. The above are best estimates based on available documentation. **Before implementation, verify the actual enum values by calling the API with a test parcel.**

### 4.4 Patch `seller_accept_order()` — set shipping deadline

When seller accepts, set a 2-business-day shipping deadline:

```sql
-- Add to seller_accept_order():
shipping_deadline = NOW() + INTERVAL '2 days',
-- Note: "2 business days" ideally skips weekends.
-- For MVP, use 3 calendar days as a safe approximation.
-- Refine with actual business day logic later.
```

### 4.5 Shipping reminder email

New cron or check within `sync-tracking`:
- If `status = 'accepted'` AND `seller_responded_at + INTERVAL '1 day' < NOW()` AND no `PARCEL_RECEIVED` event exists
- Send reminder email to seller: "Reminder: please ship your order within [deadline]. You can drop it off at any Unisend parcel locker."

---

## 5. Dispute Resolution Engine

### 5.1 Dispute types (simplified)

| Type | Code | Description |
|---|---|---|
| Not as described | `not_as_described` | Wrong condition, edition, language, misleading photos, missing components |
| Not received | `not_received` | Tracking says delivered but buyer claims they don't have it |
| Damaged in transit | `damaged_in_transit` | Game arrived with shipping damage |
| Wrong item | `wrong_item` | Completely different game received |

Scenarios 6 and 7 from the analysis are merged into `not_as_described`.

### 5.2 Dispute state machine

```
                         DISPUTE OPENED
                              │
                              ▼
                      ┌───────────────┐
                      │awaiting_seller│ ← dispute_seller_deadline = NOW() + 72h
                      └───────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     Seller responds    Seller accepts    72h passes
     with evidence      buyer's claim     (no response)
              │               │               │
              ▼               ▼               ▼
       ┌─────────────┐  Auto-resolve    ┌─────────────┐
       │under_review  │  (buyer wins)   │under_review  │
       │(admin queue) │       │         │(admin queue) │
       └──────┬───────┘       │         │seller_no_    │
              │               │         │response=true │
              ▼               ▼         └──────┬───────┘
        Admin decides    Refund buyer          │
              │               │                ▼
     ┌────────┴────────┐      │         Admin decides
     ▼                 ▼      │         (usually buyer wins)
  Buyer wins      Seller wins │
     │                 │      │
     ▼                 ▼      ▼
  Refund buyer    Credit seller
  + return label  wallet, complete
  status=refunded status=completed
```

When seller accepts the buyer's claim, auto-resolve without admin intervention (the one exception to admin-only).

### 5.3 Patch `report_order_issue()` function

Add validation and populate dispute fields on orders:

```sql
-- ADD these checks before creating the issue:

-- Only allow disputes on delivered (or shipped/in_transit) orders
IF v_order.status NOT IN ('shipped', 'in_transit', 'delivered') THEN
  RETURN json_build_object('success', false, 'error', 'Disputes can only be opened on shipped or delivered orders');
END IF;

-- Enforce 2-day inspection window after delivery
IF v_order.delivered_at IS NOT NULL
   AND v_order.delivered_at < NOW() - INTERVAL '2 days' THEN
  RETURN json_build_object('success', false, 'error',
    'The inspection window for this order has closed. Please contact info@secondturn.games for assistance.');
END IF;

-- Check seller wallet hasn't been credited already
IF v_order.wallet_credited_at IS NOT NULL THEN
  RETURN json_build_object('success', false, 'error',
    'This order has already been completed. Please contact info@secondturn.games for assistance.');
END IF;

-- AFTER creating order_issue, also populate orders dispute fields:
UPDATE orders SET
  disputed_at = NOW(),
  dispute_reason = p_issue_type,
  dispute_description = p_description,
  dispute_status = 'awaiting_seller',
  dispute_seller_deadline = NOW() + INTERVAL '72 hours',
  updated_at = NOW()
WHERE id = p_order_id;
```

For buyers who miss the window or have post-completion issues: the error message points them to `info@secondturn.games`. You handle these manually case by case.

### 5.4 New function: `seller_respond_to_dispute()`

```sql
CREATE OR REPLACE FUNCTION seller_respond_to_dispute(
  p_order_id uuid,
  p_seller_id uuid,
  p_response text,          -- min 50 chars
  p_accept_claim boolean,   -- seller concedes
  p_photo_urls text[] DEFAULT '{}'
) RETURNS json
```

**Logic:**
1. Verify order exists and `seller_id = p_seller_id`
2. Verify `dispute_status = 'awaiting_seller'`
3. Verify `p_response` length >= 50 characters
4. Update orders:
   - `dispute_seller_response = p_response`
   - `dispute_seller_responded_at = NOW()`
   - `dispute_photo_urls = p_photo_urls`
   - If `p_accept_claim = true`:
     - `dispute_status = 'resolved'`
     - `dispute_resolution = 'refunded'`
     - `dispute_resolved_at = NOW()`
     - Return `{auto_resolve: true, refund_needed: true}` so the API route can trigger refund
   - If `p_accept_claim = false`:
     - `dispute_status = 'under_review'`

### 5.5 New function: `escalate_expired_disputes()`

Cron job (hourly) for disputes where seller didn't respond:

```sql
CREATE OR REPLACE FUNCTION escalate_expired_disputes() RETURNS integer
```

**Logic:**
1. Find orders where `dispute_status = 'awaiting_seller'` AND `dispute_seller_deadline < NOW()`
2. Update `dispute_status = 'under_review'`
3. Return count of escalated disputes

### 5.6 New function: `resolve_dispute()`

Admin resolution function:

```sql
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_order_id uuid,
  p_admin_id uuid,
  p_resolution varchar,      -- 'refunded', 'partial_refund', 'completed' (seller wins)
  p_resolution_note text,
  p_refund_amount_cents integer DEFAULT NULL  -- for partial refunds
) RETURNS json
```

**Logic:**
1. Verify caller `is_staff()`
2. Verify `dispute_status = 'under_review'` (or 'awaiting_seller' for admin override)
3. Update dispute fields:
   - `dispute_resolved_at = NOW()`
   - `dispute_resolution = p_resolution`
   - `dispute_resolution_note = p_resolution_note`
   - `dispute_resolved_by = p_admin_id`
   - `dispute_status = 'resolved'`
4. Based on resolution:
   - `'refunded'` → set `refund_status = 'pending'`, return `{refund_needed: true, amount: total_amount}`
   - `'partial_refund'` → set `refund_status = 'pending'`, return `{refund_needed: true, amount: p_refund_amount_cents}`
   - `'completed'` → call `credit_seller_wallet(p_order_id)`, set `status = 'completed'`
5. Close corresponding `order_issues` record: `status = 'resolved'`

### 5.7 Patch `complete_delivered_orders()` — dispute guard

Add this check to the WHERE clause:

```sql
AND NOT EXISTS (
  SELECT 1 FROM order_issues
  WHERE order_id = orders.id AND status IN ('open', 'investigating')
)
AND dispute_status IS NULL
```

This prevents auto-completing orders that have open disputes.

---

## 6. EveryPay Refund Integration

### 6.1 API details

- **Endpoint:** `POST https://pay.every-pay.eu/api/v4/payments/refund`
- **Auth:** HTTP Basic Auth (`api_username:api_secret`)
- **Request body:**
  ```json
  {
    "api_username": "ENV_EVERYPAY_API_USERNAME",
    "amount": "25.00",
    "payment_reference": "from orders.everypay_payment_reference",
    "nonce": "unique_uuid_per_request",
    "timestamp": "ISO8601 with timezone"
  }
  ```
- **Response:** Returns `initial_amount`, `standing_amount`, `payment_state`, `transaction_reference`
- **Partial refunds:** Supported. Multiple calls until `standing_amount = 0`.
- **Swedbank bank link limitation:** EveryPay API marks payment as refunded BUT does NOT move money. You must process a manual SEPA transfer from your Swedbank business account. Confirm current status with EveryPay support.
- **Card refunds:** Batched and sent to issuer bank at 23:59 UTC+2 daily. Not instant.
- **Time limit:** ~120 days (card scheme rules). Confirm with EveryPay.

### 6.2 API route: `POST /api/admin/refund`

```
Location: src/app/api/admin/refund/route.ts
Auth: Staff-only (verify is_staff via Supabase auth)
```

**Request body:**
```json
{
  "order_id": "uuid",
  "refund_type": "full" | "partial",
  "refund_amount_cents": 2500,  // only for partial
  "resolution_note": "text"
}
```

**Logic:**

1. Load order with `everypay_payment_reference`, `payment_method`, `total_amount`, `buyer_wallet_debit_cents`, `buyer_id`
2. Calculate refund split:
   - If `buyer_wallet_debit_cents > 0` AND card was also used:
     - Wallet refund = proportional share of refund amount
     - Card refund = remainder
   - If wallet only: `credit_wallet()` only
   - If card/bank_link only: EveryPay API only
3. If card portion > 0:
   - Call EveryPay refund API
   - On success: store `refund_everypay_reference`, set `refund_status = 'processing'`
   - On 422 error: set `refund_status = 'failed'`, store error
   - If payment was bank link (detect from EveryPay response or `payment_method`):
     - Set `refund_status = 'manual_sepa_required'`
     - Dashboard shows manual SEPA workflow
4. If wallet portion > 0:
   - Call `credit_wallet(buyer_id, wallet_portion_cents, order_id)`
5. Update order: `status = 'refunded'`, `refunded_at = NOW()`, `refund_amount = X`
6. Send emails to both parties
7. If dispute resolution: call `resolve_dispute()` first, then process refund

### 6.3 Manual SEPA workflow

When `refund_status = 'manual_sepa_required'`:

The staff dashboard shows:

```
⚠️ Manual SEPA transfer required
This payment was made via bank link. EveryPay cannot auto-refund.

Refund amount: €25.00
Buyer: [name] ([email])

Steps:
1. Log into Swedbank business account
2. Transfer €25.00 to buyer
   (You may need to request buyer's IBAN — click "Request IBAN from buyer")
3. Enter SEPA reference below
4. Click "Confirm SEPA sent"

SEPA reference: [_____________]
[Request IBAN from buyer]  [Confirm SEPA sent]
```

When admin clicks "Confirm SEPA sent":
- Set `refund_sepa_reference`, `refund_status = 'completed'`, `refund_completed_at = NOW()`

### 6.4 Return shipping (Unisend PRODUCT_RETURN)

When admin resolves a dispute in buyer's favour with full refund:

1. If applicable, generate a return label via Unisend API: `PRODUCT_RETURN` service on T2T
2. Only valid for shipments between LT, LV, EE
3. Store return barcode and tracking URL on the `order_issues` record
4. Send return label to buyer via email: "We've processed your refund. Please return the game using the attached shipping label."
5. STG covers this cost

---

## 7. Staff Dashboard

### 7.1 Route structure

```
src/app/[locale]/dashboard/admin/disputes/
  page.tsx          — Dispute queue (list view)
  [orderId]/
    page.tsx        — Dispute detail + resolution actions
```

Protected by `is_staff()` check.

### 7.2 Dispute queue page

Display three sections:

**Needs your action** — `dispute_status = 'under_review'` (sorted by oldest first)
**Awaiting seller** — `dispute_status = 'awaiting_seller'` (show countdown to deadline)
**Refund issues** — `refund_status IN ('failed', 'manual_sepa_required')`
**Recently resolved** — `dispute_status = 'resolved'` last 30 days

Each row shows: order number, dispute type, game name, amount, time in current state, buyer/seller names.

### 7.3 Dispute detail page

**Layout:** Two-column on desktop.

**Left column:**
- Order info (number, date, amount breakdown, payment method)
- Buyer's claim (type, description, photos)
- Seller's response (if any — text, photos)
- Full conversation history from `messages` table (if any)

**Right column:**
- Order timeline (all status transitions with timestamps)
- Tracking events (from `tracking_events` table)
- Original listing snapshot (from `order_items` — game name, condition, price, photo)

**Bottom action bar:**

```
Resolution: [Full refund ▼]  Amount: €[auto-filled]
Note: [required text field]
[Cancel]  [Resolve Dispute]

Additional actions:
[Generate return label]  [File Unisend claim]
```

The "Full refund" dropdown options:
- Full refund (buyer wins) — refunds `total_amount` to buyer
- Partial refund — enter custom amount
- Dismiss (seller wins) — credits seller wallet, completes order
- Request more evidence — sends email to buyer/seller asking for more info

### 7.4 SEPA manual refund flag

On the dispute detail and queue pages, clearly mark orders requiring manual SEPA:

```
💳 Card payment — auto-refund available
🏦 Bank link (Swedbank) — manual SEPA required ⚠️
```

---

## 8. Email Notifications

All emails use the existing email system (Next.js API routes or Supabase Edge Functions). Subject lines per brand voice guide — clear, specific, no clickbait.

### 8.1 Dispute lifecycle emails

| Event | Recipient | Subject |
|---|---|---|
| Dispute opened | Seller | "A buyer reported an issue with your order [#]" |
| Dispute opened | Buyer | "We've received your report for order [#]" |
| Seller responds | Buyer | "The seller has responded to your report" |
| Seller accepts claim | Buyer | "Good news — your refund for order [#] is being processed" |
| Seller deadline passed | Seller | "Response deadline passed for order [#]" |
| Admin resolves (buyer wins) | Buyer | "Your refund for order [#] has been processed" |
| Admin resolves (buyer wins) | Seller | "Order [#] dispute resolved" |
| Admin resolves (seller wins) | Buyer | "Order [#] dispute resolved" |
| Admin resolves (seller wins) | Seller | "Order [#] dispute resolved — payment released" |
| Return label generated | Buyer | "Return shipping label for order [#]" |
| Refund completed | Buyer | "Your refund of €[X] for order [#] is complete" |

### 8.2 Shipping reminder email

| Event | Recipient | Subject |
|---|---|---|
| 24h after accept, no ship | Seller | "Reminder: please ship order [#] by [deadline]" |
| Shipping deadline passed | Both | "Order [#] cancelled — seller did not ship" |
| Seller deadline (24h) | Both | "Order [#] cancelled — seller did not respond" |

### 8.3 Contact support fallback

In scenarios where automated dispute is not available (post-completion issues, buyer cancellation after seller accept, edge cases), the UI and error messages should include:

> "Need help? Contact us at info@secondturn.games"

This appears in:
- Dispute window expired error message
- Order already completed error message
- Any unrecoverable error state
- The order detail page as a persistent support link

---

## 9. Scenario-by-Scenario Implementation Map

### Auto-handled (no admin involvement)

| # | Scenario | Trigger | Action | Refund |
|---|---|---|---|---|
| 1 | Seller doesn't respond in 24h | `handle_expired_seller_deadlines()` cron | Auto-cancel, relist | Full, auto |
| 2 | Seller never ships (2+ days) | Tracking sync: no PARCEL_RECEIVED by deadline | Auto-cancel, relist | Full, auto |
| 3 | Buyer cancels before seller responds | New: buyer cancel endpoint (status = pending_seller only) | Cancel, relist | Full, auto |
| 4 | Seller accepts buyer's dispute claim | `seller_respond_to_dispute(accept=true)` | Auto-resolve | Full, auto |

### Admin-reviewed (your dashboard)

| # | Scenario | How it reaches you | What you see | Your actions |
|---|---|---|---|---|
| 5 | Not as described / missing parts | Buyer files dispute → seller responds or deadline passes → under_review | Listing vs. received photos, seller response | Full/partial refund or dismiss |
| 6 | Damaged in transit | Buyer files dispute with damage photos | Damage photos, tracking timeline, packing quality | Refund buyer. Decide: seller fault (no payout) or transit fault (seller still paid, file Unisend claim) |
| 7 | Wrong item | Buyer files dispute | Photos clearly showing wrong game | Refund buyer, generate return label |
| 8 | Not received (tracking says delivered) | Buyer files dispute | Tracking shows PARCEL_DELIVERED + PARCEL_PICKED_UP | Usually dismiss (fraud risk). Investigate if no PICKED_UP event. |
| 9 | Lost in transit (tracking stale) | Tracking sync flags stale shipment (7+ days no update) | Last tracking event, time since | Confirm lost → refund buyer from STG funds, file Unisend claim |
| 10 | Post-completion claim | Buyer emails info@secondturn.games | Email in your inbox | Goodwill refund + optional seller clawback via dashboard |
| 11 | EveryPay refund failed | `refund_status = 'failed'` in dashboard | Error details | Retry or manual SEPA |
| 12 | Bank link refund (Swedbank) | `refund_status = 'manual_sepa_required'` | Buyer details, amount | Process SEPA transfer, enter reference |

### Scenario 2 correction: Seller wants to cancel after accepting

- If before label generated / parcel shipped: allow via new `seller_cancel_accepted_order()` function. Auto-refund buyer.
- If after parcel shipped: seller cannot cancel. They must wait for delivery and the normal dispute process.
- Either way, buyer can also contact `info@secondturn.games` for manual assistance.

---

## 10. Help Section Content (Separate Task)

The `/help` section at `secondturn.games/help` should cover these topics to set expectations upfront. This is a separate implementation task but noted here for completeness.

### Suggested help articles:

**For Buyers:**
- "What to do when your game arrives" — inspect within 2 days, how to open a dispute, what evidence to provide, take photos
- "What happens if my game doesn't arrive" — tracking, waiting periods, when to report
- "How refunds work" — refund to original payment method, processing times (card: 3-10 days, bank: 1-3 days)
- "What if I changed my mind" — C2C marketplace, no withdrawal right, relist suggestion
- "How to contact us" — info@secondturn.games for anything outside the automated flow

**For Sellers:**
- "How to pack board games safely" — padding, box-in-box, fragile components, photo before shipping
- "Shipping deadlines and what happens if you don't ship" — 2 business days, auto-cancel, reminders
- "What happens if a buyer opens a dispute" — notification, 72h to respond, evidence tips, accept or contest
- "How to describe game condition accurately" — condition grades explained, what to photograph, honest descriptions prevent disputes
- "When do I get paid" — 2-day inspection window after delivery, wallet credit, withdrawal process

**General:**
- "Our buyer protection promise" — what's covered, what's not, dispute timeline
- "Shipping with Unisend parcel lockers" — how T2T works, 72h pickup window, what happens if not collected
- "Fees and pricing" — transparent breakdown

---

## 11. Acceptance Criteria

### Must pass before merge

- [ ] `in_transit` added to orders status CHECK constraint
- [ ] `lt`, `et` added to orders locale CHECK constraint
- [ ] `handle_expired_seller_deadlines` scheduled as cron job (every 15 min)
- [ ] Tracking sync cron polls Unisend API and inserts tracking events
- [ ] `add_tracking_event()` correctly transitions: accepted → shipped → in_transit → delivered
- [ ] `delivered_at` populated when PARCEL_DELIVERED event received
- [ ] `complete_delivered_orders()` skips orders with open disputes
- [ ] `report_order_issue()` enforces 2-day window and valid order status
- [ ] `report_order_issue()` populates dispute fields on orders table
- [ ] Error messages for expired window include `info@secondturn.games` contact
- [ ] `seller_respond_to_dispute()` works (accept + contest paths)
- [ ] Seller accept auto-resolves without admin
- [ ] `escalate_expired_disputes()` promotes to under_review after 72h
- [ ] Staff dashboard shows dispute queue with correct sections
- [ ] Staff dispute detail page shows buyer claim, seller response, listing snapshot, tracking
- [ ] Admin can resolve: full refund, partial refund, dismiss
- [ ] EveryPay refund API called correctly for card payments
- [ ] Bank link payments flagged as `manual_sepa_required` with SEPA workflow in dashboard
- [ ] Mixed payment refunds (card + wallet) split proportionally
- [ ] `credit_wallet()` called for wallet portion of refunds
- [ ] Order status transitions correctly: disputed → refunded / completed
- [ ] Dispute notification emails sent at each stage
- [ ] Shipping reminder email at 24h, auto-cancel at deadline
- [ ] `shipping_deadline` set when seller accepts
- [ ] All new UI copy follows brand voice (no exclamation marks, sentence case)
- [ ] All user-facing strings have translation keys for en, lv (lt, et as empty strings for now)

### Nice-to-have (can follow up)

- [ ] Unisend PRODUCT_RETURN label generation for returns
- [ ] Unisend claim filing (PDF generation)
- [ ] Seller cancellation-rate tracking and alerts
- [ ] Return tracking sync
- [ ] Dispute analytics in dashboard

---

## 12. Translation Keys

All new user-facing strings need keys in `en` and `lv` at minimum. Key namespace: `Disputes`.

```json
{
  "Disputes": {
    "windowExpired": "The inspection window for this order has closed. Please contact info@secondturn.games for assistance.",
    "orderCompleted": "This order has already been completed. Please contact info@secondturn.games for assistance.",
    "openDispute": "Report an issue",
    "disputeTypeNotAsDescribed": "Not as described or missing components",
    "disputeTypeNotReceived": "Not received",
    "disputeTypeDamaged": "Damaged during shipping",
    "disputeTypeWrongItem": "Wrong item received",
    "descriptionPlaceholder": "Describe the issue in detail (minimum 50 characters)",
    "photosRequired": "Add photos showing the issue",
    "submitDispute": "Submit report",
    "sellerResponsePrompt": "The buyer has reported an issue. Please review and respond within 72 hours.",
    "sellerAcceptClaim": "Accept claim and issue refund",
    "sellerContestClaim": "Contest this claim",
    "sellerResponsePlaceholder": "Explain your side (minimum 50 characters)",
    "awaitingSeller": "Waiting for seller response",
    "underReview": "Under review by our team",
    "resolved": "Resolved",
    "refundProcessing": "Refund is being processed",
    "refundComplete": "Refund complete",
    "contactSupport": "Need help? Contact us at info@secondturn.games"
  }
}
```

Latvian translations should use informal "tu" per brand voice guide.

---

## 13. Environment Variables Needed

```
# EveryPay refund API
EVERYPAY_API_USERNAME=       # already exists
EVERYPAY_API_SECRET=         # already exists
EVERYPAY_API_URL=https://pay.every-pay.eu/api/v4

# Unisend tracking API
UNISEND_API_URL=https://api-manosiuntos.post.lt/api/v2
UNISEND_API_TOKEN=           # OAuth2 bearer token (already exists for label creation)

# Cron auth
CRON_SECRET=                 # shared secret for cron API routes
```

---

## 14. File Structure (New/Modified Files)

```
src/app/
  api/
    cron/
      sync-tracking/route.ts          NEW — Unisend polling
    admin/
      refund/route.ts                 NEW — EveryPay refund + wallet
      disputes/
        resolve/route.ts              NEW — resolve_dispute caller
        return-label/route.ts         NEW — Unisend PRODUCT_RETURN (nice-to-have)
  [locale]/
    dashboard/
      admin/
        disputes/
          page.tsx                    NEW — dispute queue
          [orderId]/
            page.tsx                  NEW — dispute detail
      orders/
        [orderId]/
          dispute/
            page.tsx                  NEW — buyer dispute form
      seller/
        orders/
          [orderId]/
            dispute-response/
              page.tsx                NEW — seller response form

src/lib/
  everypay/
    refund.ts                         NEW — EveryPay refund API client
  unisend/
    tracking.ts                       NEW — Unisend tracking API client

supabase/
  migrations/
    YYYYMMDD_dispute_engine.sql       NEW — all DB changes from section 3
```

---

## 15. Out of Scope

Explicitly NOT part of this PRD:

- Automated dispute resolution rules (all disputes go to admin)
- Buyer-to-buyer dispute messaging within the platform
- Dispute appeal system
- Seller trust scoring / reputation impact from disputes
- Real-time tracking (push notifications)
- Help section content (noted as separate task in section 10)
- Zole game, daily engagement features
- Any changes to the listing flow or checkout flow
- Changes to the existing wallet withdrawal process
