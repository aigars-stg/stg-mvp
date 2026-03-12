# STG-PRD: Cron Job Audit & Scheduling Fix

**Document ID:** STG-PRD-Cron-Job-Audit-v1.0  
**Date:** 2026-03-12  
**Status:** Ready for implementation  
**Priority:** Launch blocker (Phase 1), High (Phase 2), Maintenance (Phase 3)

---

## Problem statement

An audit of the live Supabase database reveals that only 5 of the ~16 required scheduled jobs are actually running. Critical jobs — including seller deadline expiration, tracking sync, shipping deadline enforcement, and dispute escalation — have SQL functions and/or API route handlers written but were never wired to pg_cron. The result is that orders can get permanently stuck, buyer funds held indefinitely, and sellers can act on expired orders.

Additionally, a refund audit reveals that **3 cancelled orders totaling €47.38 have settled payments with no refund ever processed**. All current orders are test transactions (EveryPay test environment), so no real funds are at risk today — but the same silent-failure patterns will apply to production payments at launch. The refund code exists in API routes but has no retry mechanism — if an EveryPay API call fails, the money is silently lost. There is no sweep job, no staff alert, and no dashboard visibility for this.

The immediate trigger: order STG-2026-000007 has been stuck in `pending_seller` for 19+ hours past its 24h deadline. The seller still sees active Accept/Decline buttons despite the badge showing "Expired."

---

## Architecture context

### Current scheduling infrastructure

STG uses two patterns for scheduled jobs, both via `pg_cron`:

**Pattern A — Pure SQL:** pg_cron calls a PostgreSQL function directly.
```
pg_cron → SELECT some_function()
```

**Pattern B — Edge Function via pg_net:** pg_cron calls `call_edge_function(name)`, a helper that uses `pg_net` to HTTP POST to a Supabase Edge Function with Vault-stored `service_role_key` auth.
```
pg_cron → call_edge_function('name') → pg_net HTTP POST → Supabase Edge Function
```

**Infrastructure confirmed present:**
- `pg_cron` v1.6.4 — installed and running 5 active jobs
- `pg_net` v0.19.5 — installed, last used 2026-03-04
- `call_edge_function(text)` — helper function exists in `public` schema
- Vault secret `service_role_key` — created 2025-12-18

**Not available:** Vercel Cron (free plan allows only 1 job). All scheduling must use pg_cron.

### Current live pg_cron jobs

| jobid | jobname | schedule | command | status |
|-------|---------|----------|---------|--------|
| 1 | expire-reservations | `* * * * *` | `SELECT cleanup_expired_cart_items()` | ✅ Running |
| 3 | complete-delivered-orders | `0 1 * * *` | `SELECT complete_delivered_orders()` | ✅ Running |
| 12 | refresh-game-pricing-stats | `5 * * * *` | `SELECT refresh_game_pricing_stats()` | ✅ Running |
| 13 | cleanup-security-audit-logs | `0 3 * * 0` | `SELECT cleanup_old_security_audit_logs()` | ✅ Running |
| 14 | expire-wanted-listings | `0 0 * * *` | `SELECT expire_wanted_listings()` | ✅ Running |

### Full audit: Functions/routes that exist but are NOT scheduled

| Function / Route | Type | Exists as | Missing effect |
|-----------------|------|-----------|----------------|
| `handle_expired_seller_deadlines()` | SQL function | DB ✅ | Orders stuck in `pending_seller` forever |
| Shipping deadline cancellation | Next.js route logic only | `api/cron/expire-seller-deadlines` | Accepted orders never cancelled if seller doesn't ship |
| Shipping reminders (24h) | Next.js route logic only | `api/cron/expire-seller-deadlines` | Sellers not reminded to ship |
| `escalate_expired_disputes()` | SQL function | DB ✅ | Disputes stuck in `awaiting_seller` forever |
| `cron-sync-tracking` | Edge Function | `supabase/functions/` ✅ | Order status never updates after shipping |
| `cron-process-auctions` | Edge Function | `supabase/functions/` ✅ | Ended auctions not processed |
| `cron-expire-auction-payments` | Edge Function | `supabase/functions/` ✅ | Unpaid auction wins not handled |
| `cron-auction-ending-soon` | Edge Function | `supabase/functions/` ✅ | No ending-soon notifications |
| `cron-cleanup-accounts` | Edge Function | `supabase/functions/` ✅ | GDPR hard-delete never runs |
| `cleanup_old_login_activity()` | SQL function | DB ✅ | Login records grow unbounded |
| `release_expired_reservations()` | SQL function | DB ✅ | Partially covered by job #1 |

### Additional bugs found during audit

**Bug A — RPC race condition:** `seller_accept_order()` and `seller_decline_order()` only check `status = 'pending_seller'`. They do NOT check `seller_response_deadline > NOW()`. A seller can accept/decline an expired order in the window between deadline expiry and (currently never-running) cron cancellation.

**Bug B — UI buttons not disabled:** `SellerAcceptDecline.tsx` renders both buttons whenever `order.status === 'pending_seller'`, regardless of the `timeRemaining === 'Expired'` state. The "Expired" badge is purely cosmetic.

**Bug C — Cancellation reason not surfaced:** The order detail page shows a generic "Order Cancelled" message for all cancellation scenarios. The `cancellation_reason` field is stored in the DB, used in emails, and used in system messages — but never fetched or displayed on the order page itself. Buyers cannot tell why their order was cancelled.

### Refund audit findings — money stuck in 3 cancelled orders

> **Note:** All orders to date are test transactions using the EveryPay test environment. No real buyer funds are at risk. However, the code paths are identical to production — these same failures will occur with real money at launch.

A query of all cancelled orders reveals **3 orders with settled EveryPay payments and zero refunds processed**:

| Order | Amount | Payment method | Cancelled | Reason | `refunded_at` | `refund_status` |
|-------|--------|---------------|-----------|--------|-------------|----------------|
| STG-TEST-001 | €24.18 | unknown | 2026-03-02 | Seller timeout | NULL | NULL |
| STG-2026-000007 | €12.10 | bank_link | 2026-03-12 | Seller timeout | NULL | NULL |
| STG-2026-000008 | €11.10 | card | 2026-03-11 | Seller declined | NULL | NULL |

STG-2026-000008 is the most concerning: the seller actively declined through the UI, the RPC cancelled the order, but the EveryPay refund in the decline route failed silently — the entire refund block is wrapped in `try/catch` (line 155 of `decline/route.ts`) that just logs and continues.

**Complete refund scenario map:**

| Scenario | Trigger | Refund code | Payment → buyer | Safety net |
|----------|---------|-------------|----------------|-----------|
| Seller declines | Inline in `/api/seller/orders/[id]/decline` | void/refund + wallet | Silent catch; no retry | ❌ None |
| Seller timeout (24h) | Cron (broken) → Edge Function | void/refund + wallet | Cron not running at all | ❌ None |
| Seller cancels after accepting | Inline in `/api/seller/orders/[id]/cancel` | `processRefund()` | Errors logged, not retried | ❌ None |
| Shipping timeout | Cron (broken) → Edge Function | void/refund + wallet | Cron not running at all | ❌ None |
| Staff resolves dispute (buyer favor) | Inline in `/api/admin/disputes/[id]/resolve` | `processRefund()` / `processPostCompletionRefund()` | Errors returned to staff UI | ⚠️ Staff sees error |
| Seller accepts dispute claim | Inline in `/api/seller/orders/[id]/dispute/respond` | `processRefund()` | Non-blocking, errors logged | ❌ None |
| Staff manual refund | Staff action via `/api/admin/refund` | `processRefund()` or `processPartialRefund()` | Errors returned to staff | ⚠️ Staff sees error |
| Payment callback failure | Inline in EveryPay webhook | void/refund | Errors sent to Sentry | ⚠️ Sentry alert |
| Bank link refund | Any of above | EveryPay marks refunded; actual money returned via manual SEPA | `refund_status = 'manual_sepa_required'` | ⚠️ Requires manual SEPA |

**Key problems:**
1. **No retry mechanism** — if an EveryPay API call fails (timeout, 500, network issue), the refund is lost forever
2. **No sweep job** — no cron checks for cancelled orders missing refunds
3. **No staff alert** — no dashboard section showing orders needing refund attention
4. **Silent failures** — seller decline and seller dispute acceptance wrap refund errors in try/catch with no surfacing

### Other deadline-driven flows (audited — no action needed)

| Flow | API guard | UI guard | Status |
|------|-----------|----------|--------|
| Dispute seller response (48h) | ✅ Checks `dispute_seller_deadline > NOW()` | ✅ Hides form when `isExpired` | Safe |
| Auction payment (48h) | ✅ Checks `auction_payment_deadline < new Date()` | N/A (redirect flow) | Safe |
| Seller accept/decline (24h) | ❌ No deadline check | ❌ Buttons always active | **Broken — Tasks 1.1 + 1.2** |

---

## Pain points and corrections (read before implementing)

These issues were discovered during the final review and contradict assumptions in earlier sections. Claude Code must follow these corrections.

### 1. Edge Function `cron-expire-seller-deadlines` already exists — do NOT create a new one

The function is deployed at version 7 in Supabase with slug `cron-expire-seller-deadlines`. It already handles: RPC call → EveryPay refund → wallet refund → email → dispute escalation. **Task 1.3 fixes bugs in this existing function and deploys version 8.** Do not create a separate "side effects" function or a two-job architecture.

### 2. `transaction_messages` table does not exist

The PRD previously referenced `INSERT INTO transaction_messages(...)` in several SQL functions. **This table does not exist.** The actual schema is:
- `conversations` table (has `order_id` FK)
- `messages` table (has `conversation_id` FK, `is_system_message`, `system_message_type`)

To post a system message from SQL, use the existing RPC:
```sql
PERFORM post_transaction_system_message(p_order_id, p_message_type, p_content);
```
This RPC handles conversation lookup via `get_or_create_transaction_conversation()`.

### 3. `credit_wallet()` RPC has only 4 parameters

The deployed Edge Function incorrectly passes `p_type`. The correct signature is:
```sql
credit_wallet(p_user_id uuid, p_amount_cents integer, p_order_id uuid, p_description text DEFAULT 'Refund')
```
There is NO `p_type` parameter. The function internally uses type `'refund_credit'` for all calls.

### 4. Wallet refunds in SQL functions should use `credit_wallet()` RPC, not raw INSERTs

Raw `INSERT INTO wallets` / `INSERT INTO wallet_transactions` would bypass the atomic upsert + transaction recording logic in `credit_wallet()`, and would use inconsistent transaction types (e.g., `'refund'` vs `'refund_credit'`). Always `PERFORM credit_wallet(...)` from PL/pgSQL functions.

### 5. Void before refund for EveryPay

The Next.js decline route does void → refund fallback. The deployed Edge Function only does refund. Void is cheaper and instant for pre-authorized payments. All EveryPay release logic should try void first, catching the error and falling back to refund.

### 6. `cron-process-payouts` Edge Function is deprecated (no-op)

It's deployed but is a no-op stub with a deprecation message. No schedule needed — the wallet + manual withdrawal system replaced it.

### 7. No in-app notifications for order cancellations

When an order is created, the seller gets a `new_order` notification in the `notifications` table. But when an order is cancelled (cron timeout, seller decline, shipping timeout), **neither buyer nor seller gets an in-app notification**. The only signal is an email (which could fail silently) and a system message in the conversation thread (which many users won't check proactively). For comparison, auction Edge Functions properly insert notifications for winners, expired auctions, etc. Order cancellations should do the same — Task 1.12 addresses this.

### 8. `escalate_expired_disputes()` is NOT SECURITY DEFINER

Every other cron-callable function is SECURITY DEFINER (`handle_expired_seller_deadlines`, `complete_delivered_orders`, `credit_wallet`, `post_transaction_system_message`). `escalate_expired_disputes()` is not. It works today because pg_cron runs as `postgres` superuser bypassing RLS, but it's inconsistent and would break if called from a different context. Task 1.8 migration should fix this.

### 9. EveryPay void logic is untestable in test environment

Every order in the database has `everypay_payment_state = 'settled'` — the EveryPay test account either doesn't support capture delay or it's not configured. The void-before-refund logic in Task 1.3 will always fall through to the refund path during testing. **The void path can only be validated after production EveryPay has capture delay enabled via Swedbank.** Add to launch checklist.

### 10. Race condition: `complete_delivered_orders` vs dispute filing

`complete_delivered_orders` picks up orders where `status = 'delivered'` and `delivered_at < NOW() - 2 days`. The dispute endpoint allows disputes on `'delivered'` orders within 2 days. Both windows expire at the same 48h boundary, creating a narrow race where the cron could credit the seller wallet and flip to `'completed'` moments before a buyer submits a dispute. The dispute endpoint's allowed statuses (`['shipped', 'in_transit', 'delivered']`) exclude `'completed'`, so the buyer would be rejected. Not directly related to this PRD — flag as post-launch improvement (add `'completed'` to disputeAllowedStatuses within a grace window, or have the cron skip orders in the last hour of the window).

### 11. DAC7 trigger doesn't reverse on refund

The `track_dac7_metrics_on_order_completion` trigger increments `dac7_annual_transaction_count` and `dac7_annual_sales_total` when an order reaches `delivered` or `completed`. If the order is later refunded (dispute resolution), the DAC7 metrics are never decremented. This inflates seller reporting thresholds over time. Not critical for MVP volume — flag as post-launch improvement.

### 12. `seller_accept_order` has no SECURITY DEFINER or search_path

Unlike `seller_decline_order` (SECURITY DEFINER), `seller_accept_order` runs as the calling user with no explicit `search_path`. It works because RLS allows sellers to update their own `pending_seller` orders. Task 1.1 modifies this function — the deadline guard will run in the same non-SECURITY-DEFINER context, which is fine because the guard only reads `v_order` (already fetched with `FOR UPDATE`). Just be aware when writing the migration.

---

## Implementation plan

### Phase 1 — Launch blockers (seller deadlines + tracking sync + RPC guards)

#### Task 1.1: Add deadline guard to seller RPC functions

**File:** Migration (new)  
**Pattern:** SQL migration via Supabase

Add a deadline check to both `seller_accept_order()` and `seller_decline_order()` so that even without the cron running, sellers cannot act on expired orders.

**`seller_accept_order` — add after the status check:**
```sql
IF v_order.seller_response_deadline IS NOT NULL AND v_order.seller_response_deadline < NOW() THEN
  RETURN json_build_object('success', false, 'error', 'Seller response deadline has expired');
END IF;
```

**`seller_decline_order` — add the same check after the status check.**

**Important:** `seller_accept_order` is NOT SECURITY DEFINER (runs as calling user), while `seller_decline_order` IS SECURITY DEFINER. The deadline guard works in both contexts because it only reads `v_order` which was already fetched with `SELECT ... FOR UPDATE`. Do not change the SECURITY DEFINER status of either function in this migration — keep their existing security models.

**Verification:** Call `seller_accept_order` on order `d40489eb-4eac-4e9b-a6a3-f21f0505ac92` (the currently stuck order) — it must return `success: false`.

#### Task 1.2: Disable UI buttons for expired orders

**File:** `packages/marketplace/components/order-detail/SellerAcceptDecline.tsx`

The component currently receives `timeRemaining` as a display prop. When `timeRemaining === 'Expired'`:
1. Disable both Accept and Decline buttons (`disabled={true}`)
2. Replace the action description text with a message explaining the order will be auto-cancelled shortly
3. Hide the decline form if it was open

**Implementation detail:** The `timeRemaining` prop is already computed in `useUnifiedOrderDetail.ts` and set to the string `'Expired'` when the deadline has passed (line 282). Use this value:

```tsx
const isExpired = timeRemaining === 'Expired';
```

When `isExpired` is true:
- Both buttons: add `disabled={true}` and reduce opacity styling
- Replace description paragraph with: `t('actionRequired.expiredDescription')` (new translation key)
- Add a new translation key `actionRequired.expiredDescription` to all four locale files with text along the lines of: "The response window has closed. This order will be automatically cancelled and the buyer refunded."

#### Task 1.3: Fix and schedule the existing expire-seller-deadlines Edge Function

**Key discovery:** The Edge Function `cron-expire-seller-deadlines` already exists and is deployed at version 7 in Supabase. It already handles the full pipeline: calls the `handle_expired_seller_deadlines()` RPC to cancel orders and relist items, then processes EveryPay refunds, wallet refunds, cancellation emails via Resend, and dispute deadline escalation. **Do not create a new function or split into two jobs.** Fix the bugs in the deployed version and schedule it.

**Architecture:** Single Edge Function, single pg_cron job. The Edge Function calls the SQL RPC internally as step 1 (cancel + relist), then handles side effects (refund + email). This is simpler and avoids the timing/sequencing problems of a two-job split.

**Bugs to fix in the deployed Edge Function:**

**Bug 1 — `credit_wallet` RPC call has a non-existent parameter:**
```ts
// BROKEN (deployed version):
await supabase.rpc('credit_wallet', {
  p_user_id: buyer_id,
  p_amount_cents: walletDebitCents,
  p_type: 'refund_credit',  // ← DOES NOT EXIST in function signature
  p_order_id: order_id,
  p_description: 'Refund to wallet',
})

// FIXED:
await supabase.rpc('credit_wallet', {
  p_user_id: buyer_id,
  p_amount_cents: walletDebitCents,
  p_order_id: order_id,
  p_description: 'Refund — seller did not respond within 24 hours',
})
```

The actual `credit_wallet()` signature is: `(p_user_id uuid, p_amount_cents integer, p_order_id uuid, p_description text DEFAULT 'Refund')`. Remove the `p_type` parameter.

**Bug 2 — No void-before-refund logic:**
The deployed function only calls `refundEveryPay()`. For payments still in pre-authorized state, void is cheaper and instant. Add a `voidEveryPay()` helper and try void first, falling back to refund on failure (matching the pattern in the decline route):

```ts
async function voidEveryPay(paymentReference: string): Promise<void> {
  const apiUrl = Deno.env.get('EVERYPAY_API_URL')!
  const apiUsername = Deno.env.get('EVERYPAY_API_USERNAME')!
  const apiSecret = Deno.env.get('EVERYPAY_API_SECRET')!

  const body = {
    api_username: apiUsername,
    payment_reference: paymentReference,
    nonce: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }

  const res = await fetch(`${apiUrl}/payments/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(`${apiUsername}:${apiSecret}`),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(`Void failed: ${data?.error?.message || res.statusText}`)
  }
}
```

Then in the refund loop:
```ts
// Try void first (cheaper for pre-auth), fall back to refund
if (everypayPortionCents > 0 && order.everypay_payment_reference) {
  try {
    await voidEveryPay(order.everypay_payment_reference)
    console.log(`[Cron] EveryPay void succeeded for order ${order_id}`)
  } catch {
    await refundEveryPay(order.everypay_payment_reference, everypayPortionCents)
    console.log(`[Cron] EveryPay refund processed for order ${order_id} (void failed)`)
  }
}
```

**Bug 3 — No system message posted to order conversation:**
Add after the refund succeeds:
```ts
// Post system message to conversation thread
await supabase.rpc('post_transaction_system_message', {
  p_order_id: order_id,
  p_message_type: 'order_cancelled',
  p_content: 'Order automatically cancelled: seller did not respond within 24 hours. Your payment will be refunded.',
})
```

**Bug 4 — No `refund_status` / `refund_method` tracking:**
The deployed function only sets `refunded_at` and `refund_amount`. Update the order update to also set refund tracking fields:
```ts
await supabase.from('orders').update({
  refunded_at: new Date().toISOString(),
  refund_amount: amount,
  refund_status: 'completed',
  refund_method: walletDebitCents > 0 ? 'mixed' : 'everypay_card',
  refund_initiated_at: new Date().toISOString(),
}).eq('id', order_id)
```
For bank_link payments, set `refund_status: 'manual_sepa_required'` instead of `'completed'`.

**Bug 5 — No idempotency on dispute escalation:**
The deployed function already handles dispute escalation, but it duplicates the `escalate_expired_disputes()` SQL function. Since Task 1.8 schedules that SQL function separately, remove the dispute escalation block from the Edge Function to avoid double-processing.

**File to update:** `packages/marketplace/supabase/functions/cron-expire-seller-deadlines/index.ts`

**Deployment:** Use `supabase functions deploy cron-expire-seller-deadlines` or the Supabase MCP `deploy_edge_function` tool. This creates version 8 of the existing function.

**Schedule (add in the cron scheduling migration):**
```sql
SELECT cron.schedule(
  'expire-seller-deadlines',
  '*/5 * * * *',
  $$SELECT call_edge_function('cron-expire-seller-deadlines')$$
);
```

**Verification:**
```sql
-- After 5-10 minutes, check it ran
SELECT d.jobid, j.jobname, d.status, d.return_message, d.start_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname = 'expire-seller-deadlines'
ORDER BY d.start_time DESC LIMIT 3;

-- Check pg_net response
SELECT id, status_code, error_msg, created
FROM net._http_response ORDER BY created DESC LIMIT 3;
-- Expected: status_code = 200
```

#### Task 1.4: Schedule tracking sync

**File:** Migration (new)

The Edge Function `cron-sync-tracking` already exists and is fully implemented. It just needs a pg_cron schedule:

```sql
SELECT cron.schedule(
  'sync-tracking',
  '*/30 * * * *',
  $$SELECT call_edge_function('cron-sync-tracking')$$
);
```

**Verification:** After scheduling, check `cron.job_run_details` for the new jobid and confirm status = `succeeded`. Also check `net._http_response` for a 200 status.

#### Task 1.7: Create SQL function and schedule for shipping deadline expiration

**File:** Migration (new)

Currently the shipping deadline cancellation logic only exists in the Next.js route `api/cron/expire-seller-deadlines/route.ts` (lines 232-323). A SQL function needs to be created for the core state changes.

**Important implementation notes:**
- Use `credit_wallet()` RPC for wallet refunds (not raw INSERT into wallets/wallet_transactions). This RPC handles wallet creation, atomic balance updates, and consistent transaction type (`refund_credit`).
- Use `post_transaction_system_message()` RPC for system messages (not INSERT into `transaction_messages` — that table does not exist). The actual schema is `conversations` → `messages`, and the RPC handles conversation lookup internally.
- EveryPay refunds are handled by the refund safety net (Task 1.10), not this SQL function.

**New function `handle_expired_shipping_deadlines()`:**

```sql
CREATE OR REPLACE FUNCTION handle_expired_shipping_deadlines()
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_cancelled_count INTEGER := 0;
  v_refunds_needed JSON[];
  v_has_tracking BOOLEAN;
  v_everypay_portion_cents INTEGER;
BEGIN
  FOR v_order IN
    SELECT id, order_number, buyer_id, seller_id, total_amount,
           everypay_payment_reference, buyer_wallet_debit_cents
    FROM orders
    WHERE status = 'accepted'
      AND shipping_deadline IS NOT NULL
      AND shipping_deadline < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Skip if there are tracking events (seller did ship, just late)
    SELECT EXISTS(
      SELECT 1 FROM tracking_events WHERE order_id = v_order.id LIMIT 1
    ) INTO v_has_tracking;

    IF v_has_tracking THEN
      CONTINUE;
    END IF;

    -- Cancel order
    UPDATE orders
    SET
      status = 'cancelled',
      cancellation_reason = 'Seller did not ship within the shipping deadline',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_order.id;

    -- Relist items
    UPDATE listings
    SET status = 'active', sold_at = NULL, updated_at = NOW()
    WHERE id IN (SELECT listing_id FROM order_items WHERE order_id = v_order.id);

    -- Wallet refund via existing RPC (handles wallet creation + transaction record)
    IF COALESCE(v_order.buyer_wallet_debit_cents, 0) > 0 THEN
      PERFORM credit_wallet(
        v_order.buyer_id,
        v_order.buyer_wallet_debit_cents,
        v_order.id,
        'Refund — seller did not ship in time'
      );
    END IF;

    -- System message via existing RPC (handles conversation lookup)
    PERFORM post_transaction_system_message(
      v_order.id,
      'order_cancelled',
      'Order automatically cancelled: seller did not ship within the deadline. Your payment will be refunded.'
    );

    v_cancelled_count := v_cancelled_count + 1;

    -- Track EveryPay refund needed (processed by refund safety net)
    v_everypay_portion_cents := ROUND(v_order.total_amount * 100) - COALESCE(v_order.buyer_wallet_debit_cents, 0);
    IF v_order.everypay_payment_reference IS NOT NULL AND v_everypay_portion_cents > 0 THEN
      v_refunds_needed := array_append(v_refunds_needed, json_build_object(
        'order_id', v_order.id,
        'buyer_id', v_order.buyer_id,
        'everypay_payment_reference', v_order.everypay_payment_reference,
        'everypay_portion_cents', v_everypay_portion_cents
      ));
    END IF;
  END LOOP;

  RETURN json_build_object(
    'cancelled_count', v_cancelled_count,
    'refunds_needed', v_refunds_needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Schedule:**
```sql
SELECT cron.schedule(
  'expire-shipping-deadlines',
  '*/5 * * * *',
  $$SELECT handle_expired_shipping_deadlines()$$
);
```

**Note:** EveryPay refunds for shipping deadline cancellations are handled by the refund safety net (Task 1.10), which sweeps all cancelled orders with `refunded_at IS NULL`. No explicit refund processing is needed in this function — it only handles state changes.

#### Task 1.8: Schedule dispute escalation

**File:** Migration (new)

The SQL function `escalate_expired_disputes()` already exists. It flips `dispute_status` from `awaiting_seller` to `under_review` when `dispute_seller_deadline` has passed.

**Fix:** The function is currently missing SECURITY DEFINER (see Pain Point #8). Add it in the same migration:

```sql
-- Fix: add SECURITY DEFINER for consistency with all other cron-callable functions
CREATE OR REPLACE FUNCTION escalate_expired_disputes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE orders SET
    dispute_status = 'under_review',
    updated_at = NOW()
  WHERE dispute_status = 'awaiting_seller'
    AND dispute_seller_deadline < NOW()
    AND dispute_seller_responded_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$function$;

SELECT cron.schedule(
  'escalate-expired-disputes',
  '*/15 * * * *',
  $$SELECT escalate_expired_disputes()$$
);
```

**Note:** The Vercel route also sends an email to the seller when their deadline passes. This email is a nice-to-have but not critical — the dispute will proceed to staff review regardless. The deployed `cron-expire-seller-deadlines` Edge Function previously handled this, but Task 1.3 removes that block to avoid double-processing with this dedicated SQL job. A dedicated dispute notification Edge Function can be added later if needed.

#### Task 1.9: Surface cancellation reason on order detail page

Currently the buyer (and seller) see a generic "Order Cancelled — This order has been cancelled and a refund has been initiated" regardless of why the order was cancelled. The `cancellation_reason` field is already stored in the database with distinct values per scenario, used in emails, and used in system messages — but never fetched or displayed on the order detail page.

**Distinct `cancellation_reason` values in use:**

| Value | Trigger |
|-------|---------|
| `'Seller declined'` | Seller actively clicked Decline |
| `'Seller did not respond within 24 hours'` | Seller deadline cron |
| `'Seller did not ship within the shipping deadline'` | Shipping deadline cron |
| `'Seller cancelled before shipping.'` | Seller cancelled after accepting |

**Step 1 — Add field to API response**

**File:** `packages/marketplace/app/api/transactions/[orderId]/conversation/route.ts`

Add `cancellation_reason` to the `.select()` query (alongside the existing `cancelled_at`).

**Step 2 — Add to OrderDetailOrder type**

**File:** `packages/marketplace/lib/types/order-detail.ts`

Add `cancellation_reason?: string | null;` to the type (at the top level, not inside `timestamps`).

**Step 3 — Map in the API response builder**

Wherever the API response maps the raw DB row to the `OrderDetailOrder` shape, include `cancellation_reason`.

**Step 4 — Display in OrderStatusNotice**

**File:** `packages/marketplace/components/order-detail/OrderStatusNotice.tsx`

In the `status === 'cancelled'` block (lines 31–57), replace the hardcoded `t('cancelled.body')` with the cancellation reason when available:

```tsx
<p className="text-sm text-text-secondary mb-3">
  {order.cancellation_reason
    ? t(`cancelled.reasons.${mapReasonToKey(order.cancellation_reason)}`)
    : t('cancelled.body')}
</p>
```

Where `mapReasonToKey` maps the DB string to a translation key:

```tsx
function mapReasonToKey(reason: string): string {
  if (reason.includes('did not respond')) return 'sellerTimeout';
  if (reason.includes('declined')) return 'sellerDeclined';
  if (reason.includes('did not ship')) return 'shippingTimeout';
  if (reason.includes('cancelled before shipping')) return 'sellerCancelled';
  return 'default';
}
```

**Step 5 — Add translation keys**

Add to all four locale files under `Orders.detail.cancelled.reasons`:

```json
"reasons": {
  "sellerTimeout": "The seller did not respond within 24 hours. A refund has been initiated.",
  "sellerDeclined": "The seller declined this order. A refund has been initiated.",
  "shippingTimeout": "The seller did not ship within the deadline. A refund has been initiated.",
  "sellerCancelled": "The seller cancelled this order before shipping. A refund has been initiated.",
  "default": "This order has been cancelled and a refund has been initiated."
}
```

For the seller's view, the same reasons apply but phrased from their perspective. Since the existing `cancelled.body` is the same for both roles, we can start with a single set of buyer-oriented strings and refine per-role later if needed.

#### Task 1.10: Create refund safety net sweep

**Problem:** If any EveryPay refund call fails during seller decline, seller cancel, dispute resolution, or cron-triggered cancellation, the order gets cancelled but the buyer's money stays with the platform. There is no retry mechanism.

**Solution:** A scheduled Edge Function that sweeps for orders in `cancelled` status with `refunded_at IS NULL` and a valid `everypay_payment_reference`, then processes the missing refunds.

**New Edge Function:** `cron-refund-safety-net`

**File:** `packages/marketplace/supabase/functions/cron-refund-safety-net/index.ts`

**Important implementation notes:**
- Use `credit_wallet(p_user_id, p_amount_cents, p_order_id, p_description)` for wallet refunds — note: only 4 parameters, no `p_type` (this was a bug in the expire-seller-deadlines Edge Function)
- Try void before refund for EveryPay (matching the pattern in `lib/everypay/client.ts`)
- Handle `bank_link` payments separately — flag as `manual_sepa_required`
- Use the same EveryPay HTTP helpers as the expire-seller-deadlines Edge Function (inline fetch, Basic auth)

**Logic:**

1. Query orders needing refunds:
```sql
SELECT id, order_number, buyer_id, total_amount,
       everypay_payment_reference, everypay_payment_state,
       buyer_wallet_debit_cents, payment_method
FROM orders
WHERE status = 'cancelled'
  AND refunded_at IS NULL
  AND everypay_payment_reference IS NOT NULL
  AND cancelled_at < NOW() - INTERVAL '5 minutes'  -- avoid racing with inline refunds
ORDER BY cancelled_at ASC
LIMIT 10;
```

2. For each order:
   a. Calculate EveryPay portion: `ROUND(total_amount * 100) - COALESCE(buyer_wallet_debit_cents, 0)`
   b. If `payment_method = 'bank_link'`:
      - Call EveryPay refund (best-effort, marks refunded in their system)
      - Refund wallet portion via `credit_wallet` RPC if applicable
      - Set `refund_status = 'manual_sepa_required'`
      - Set `refunded_at = NOW()`
   c. If card payment and EveryPay portion > 0:
      - Try void first, fall back to refund (same void-before-refund pattern)
      - Refund wallet portion via `credit_wallet` RPC if applicable
      - Set `refund_status = 'completed'`
      - Set `refunded_at = NOW()`, `refund_amount = total_amount`
   d. If only wallet portion (no EveryPay portion):
      - Refund wallet via `credit_wallet` RPC
      - Set `refund_status = 'completed'`
   e. On failure: set `refund_status = 'failed'`, `refund_error = '<message>'` — the sweep will skip it next run (only picks up NULL refund_status)

3. Also sweep for `refund_status = 'failed'` orders older than 1 hour (retry):
```sql
SELECT ... FROM orders
WHERE refund_status = 'failed'
  AND refund_initiated_at < NOW() - INTERVAL '1 hour'
LIMIT 5;
```
   Reset `refund_status = NULL` to allow the main sweep to pick them up again. Limit retries to 3 attempts by tracking a `refund_attempt_count` or simply capping by checking if `cancelled_at` is more than 24 hours old (at which point flag for manual review).

**Schedule:**
```sql
SELECT cron.schedule(
  'refund-safety-net',
  '*/10 * * * *',
  $$SELECT call_edge_function('cron-refund-safety-net')$$
);
```

**Also query for `refund_status = 'manual_sepa_required'`** — this Edge Function should NOT process these (they need manual SEPA), but it should log them for visibility.

#### Task 1.11: Add refund alerts to staff dashboard

**File:** `packages/marketplace/app/[locale]/staff/orders/page.tsx`

Add a prominent alert banner at the top of the staff orders page when there are orders needing refund attention. Query:

```sql
SELECT count(*) as needs_refund FROM orders
WHERE (status = 'cancelled' AND refunded_at IS NULL AND everypay_payment_reference IS NOT NULL)
   OR refund_status = 'failed'
   OR (refund_status = 'manual_sepa_required' AND refund_completed_at IS NULL);
```

Display as a red banner: "X orders need refund attention" with a link/filter to show just those orders.

Also add a "Process Refund" button on the staff order detail page (`staff/orders/[id]/page.tsx`) for cancelled orders with no refund, calling the existing `/api/admin/refund` endpoint.

#### Task 1.12: Add in-app notifications for order cancellations

**Problem:** When a new order is placed, the seller gets a `new_order` notification in the `notifications` table. But when an order is cancelled (seller timeout, seller decline, shipping timeout), neither buyer nor seller gets an in-app notification. The only signals are email (which can fail silently) and a system message in the conversation thread. Buyers have no proactive way to discover their order was cancelled.

**Where to add notifications:**

**A. In the `cron-expire-seller-deadlines` Edge Function (Task 1.3 fix):**

Add after the refund succeeds, before sending the email:
```ts
// In-app notification to buyer
await supabase.from('notifications').insert({
  user_id: buyer_id,
  type: 'order_cancelled',
  title: `Order #${order.order_number} cancelled`,
  body: 'The seller did not respond in time. Your refund is being processed.',
  data: { order_id },
})
```

**B. In the `handle_expired_shipping_deadlines()` SQL function (Task 1.7):**

Add after the system message, inside the loop:
```sql
-- In-app notification to buyer
INSERT INTO notifications (user_id, type, title, body, data)
VALUES (
  v_order.buyer_id,
  'order_cancelled',
  'Order #' || v_order.order_number || ' cancelled',
  'The seller did not ship in time. Your refund is being processed.',
  jsonb_build_object('order_id', v_order.id)
);
```

**C. In the seller decline route (`api/seller/orders/[id]/decline/route.ts`):**

Add after the email send block (around line 191):
```ts
// In-app notification to buyer
const serviceClient = createServiceClient();
await serviceClient.from('notifications').insert({
  user_id: order.buyer_id,
  type: 'order_cancelled',
  title: `Order #${order.order_number} cancelled`,
  body: 'The seller declined this order. Your refund is being processed.',
  data: { order_id: orderId },
}).catch(() => {}); // Non-blocking
```

**D. In the seller cancel route (`api/seller/orders/[id]/cancel/route.ts`):**

Add after the refund block (around line 103):
```ts
await adminSupabase.from('notifications').insert({
  user_id: order.buyer_id,
  type: 'order_cancelled',
  title: `Order #${order.order_number} cancelled`,
  body: 'The seller cancelled this order before shipping. Your refund is being processed.',
  data: { order_id: orderId },
}).catch(() => {});
```

**Note:** The `notifications` table has no RLS restrictions on INSERT (policy `"Authenticated can insert notifications"` allows all), so these inserts work from any authenticated or service-role context. The notification `type` value `'order_cancelled'` is new — check `NotificationCard.tsx` to ensure it renders gracefully for unknown types (it should fall back to a generic display).

### Phase 2 — High priority (shipping reminders + auction jobs + account cleanup)

#### Task 2.1: Create SQL function for shipping reminders

**File:** Migration (new)

Currently shipping reminders only exist in the Vercel route. Since sending emails requires an external API (Resend), this should be an Edge Function.

**New Edge Function:** `cron-shipping-reminders`

Logic:
1. Query orders where `status = 'accepted'`, `shipping_deadline IS NOT NULL`, `shipping_reminder_sent_at IS NULL`, `seller_responded_at < NOW() - INTERVAL '24 hours'`
2. Exclude orders that have tracking events (seller already shipped)
3. For each order: send reminder email to seller, then update `shipping_reminder_sent_at`

**Schedule:**
```sql
SELECT cron.schedule(
  'shipping-reminders',
  '0 */6 * * *',
  $$SELECT call_edge_function('cron-shipping-reminders')$$
);
```

#### Task 2.2: Schedule auction Edge Functions

**File:** Migration (new)

All three Edge Functions exist and are fully implemented. They just need schedules.

```sql
-- Process ended auctions (determines winners)
SELECT cron.schedule(
  'process-ended-auctions',
  '* * * * *',
  $$SELECT call_edge_function('cron-process-auctions')$$
);

-- Expire unpaid auction wins (48h deadline)
SELECT cron.schedule(
  'expire-auction-payments',
  '*/5 * * * *',
  $$SELECT call_edge_function('cron-expire-auction-payments')$$
);

-- Auction ending soon notifications (60min warning)
SELECT cron.schedule(
  'auction-ending-soon',
  '*/15 * * * *',
  $$SELECT call_edge_function('cron-auction-ending-soon')$$
);
```

**Note:** These Edge Functions use Resend for emails. Confirm that `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in the Supabase Edge Function env vars (Dashboard → Edge Functions → Secrets).

#### Task 2.3: Schedule account cleanup

**File:** Migration (new)

```sql
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 2 * * *',
  $$SELECT call_edge_function('cron-cleanup-accounts')$$
);
```

### Phase 3 — Maintenance (login cleanup + reservation safety net)

#### Task 3.1: Schedule login activity cleanup

**File:** Migration (new)

```sql
SELECT cron.schedule(
  'cleanup-login-activity',
  '0 4 * * 0',
  $$SELECT cleanup_old_login_activity()$$
);
```

#### Task 3.2: Add reservation cleanup safety net

**File:** Migration (new)

`release_expired_reservations()` catches any listing with `reserved_until < NOW()`, broader than `cleanup_expired_cart_items()` which only handles basket-linked reservations. Add as a less frequent safety net:

```sql
SELECT cron.schedule(
  'release-stale-reservations',
  '*/10 * * * *',
  $$SELECT release_expired_reservations()$$
);
```

---

## Immediate manual fix

All orders to date are test transactions using the EveryPay test environment — no real buyer funds are at risk. The three unrefunded cancelled orders (STG-TEST-001, STG-2026-000007, STG-2026-000008) can be cleaned up with a simple DB update rather than processing actual refunds.

**Run via Supabase Dashboard → SQL Editor:**

```sql
-- Mark all test cancelled orders as refunded (no real money involved)
UPDATE orders
SET refund_status = 'completed',
    refund_amount = total_amount,
    refunded_at = NOW(),
    refund_note = 'Test environment — no real payment to refund',
    updated_at = NOW()
WHERE status = 'cancelled'
  AND refunded_at IS NULL
  AND everypay_payment_reference IS NOT NULL;

-- Verify: should return 0
SELECT count(*) FROM orders
WHERE status = 'cancelled'
  AND refunded_at IS NULL
  AND everypay_payment_reference IS NOT NULL;
```

Also relist any stuck items from the expired order STG-2026-000007 (if not already done):
```sql
UPDATE listings SET status = 'active', sold_at = NULL, updated_at = NOW()
WHERE id IN (
  SELECT listing_id FROM order_items
  WHERE order_id = 'd40489eb-4eac-4e9b-a6a3-f21f0505ac92'
);
```

**Note:** While no real money is at risk today, the same silent-failure refund patterns will apply to production payments at launch. All findings in this PRD (missing cron jobs, RPC race conditions, refund safety net, staff dashboard alerts) remain launch blockers regardless of test vs. production environment.

---

## Expected final state of pg_cron jobs

After all three phases, the `cron.job` table should contain:

| jobname | schedule | command | type |
|---------|----------|---------|------|
| expire-reservations | `* * * * *` | `SELECT cleanup_expired_cart_items()` | Pure SQL |
| complete-delivered-orders | `0 1 * * *` | `SELECT complete_delivered_orders()` | Pure SQL |
| refresh-game-pricing-stats | `5 * * * *` | `SELECT refresh_game_pricing_stats()` | Pure SQL |
| cleanup-security-audit-logs | `0 3 * * 0` | `SELECT cleanup_old_security_audit_logs()` | Pure SQL |
| expire-wanted-listings | `0 0 * * *` | `SELECT expire_wanted_listings()` | Pure SQL |
| **expire-seller-deadlines** | `*/5 * * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing, fixed)** |
| **expire-shipping-deadlines** | `*/5 * * * *` | `SELECT handle_expired_shipping_deadlines()` | **Pure SQL (new)** |
| **escalate-expired-disputes** | `*/15 * * * *` | `SELECT escalate_expired_disputes()` | **Pure SQL (existing fn)** |
| **sync-tracking** | `*/30 * * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing)** |
| **process-ended-auctions** | `* * * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing)** |
| **expire-auction-payments** | `*/5 * * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing)** |
| **auction-ending-soon** | `*/15 * * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing)** |
| **shipping-reminders** | `0 */6 * * *` | `SELECT call_edge_function(...)` | **Edge Function (new)** |
| **refund-safety-net** | `*/10 * * * *` | `SELECT call_edge_function(...)` | **Edge Function (new)** |
| **cleanup-deleted-accounts** | `0 2 * * *` | `SELECT call_edge_function(...)` | **Edge Function (existing)** |
| **cleanup-login-activity** | `0 4 * * 0` | `SELECT cleanup_old_login_activity()` | **Pure SQL (existing fn)** |
| **release-stale-reservations** | `*/10 * * * *` | `SELECT release_expired_reservations()` | **Pure SQL (existing fn)** |

**Total: 17 jobs** (5 existing + 12 new)

---

## File change summary

### Phase 1 (launch blocker)

| Action | File path | What changes |
|--------|-----------|-------------|
| New migration | `supabase/migrations/YYYYMMDD_fix_seller_deadline_rpc_guards.sql` | Add deadline check to `seller_accept_order` and `seller_decline_order` |
| New migration | `supabase/migrations/YYYYMMDD_create_shipping_deadline_handler.sql` | Create `handle_expired_shipping_deadlines()` function (with notifications) |
| New migration | `supabase/migrations/YYYYMMDD_fix_escalate_disputes_security.sql` | Add SECURITY DEFINER + search_path to `escalate_expired_disputes()` |
| New migration | `supabase/migrations/YYYYMMDD_schedule_phase1_cron_jobs.sql` | Schedule: expire-seller-deadlines, expire-shipping-deadlines, escalate-expired-disputes, sync-tracking, refund-safety-net |
| Edit + Deploy | `supabase/functions/cron-expire-seller-deadlines/index.ts` | Fix credit_wallet params, add void-before-refund, add system message posting, add refund_status tracking, add buyer notification, remove duplicate dispute escalation |
| New Edge Function | `supabase/functions/cron-refund-safety-net/index.ts` | Sweep for cancelled-but-unrefunded orders, retry failed refunds |
| Edit | `components/order-detail/SellerAcceptDecline.tsx` | Disable buttons when expired |
| Edit | `app/api/transactions/[orderId]/conversation/route.ts` | Add `cancellation_reason` to select query |
| Edit | `lib/types/order-detail.ts` | Add `cancellation_reason` field |
| Edit | `components/order-detail/OrderStatusNotice.tsx` | Display cancellation reason with mapped translation keys |
| Edit | `messages/en.json` | Add `actionRequired.expiredDescription` + `cancelled.reasons.*` keys |
| Edit | `messages/lv.json` | Add `actionRequired.expiredDescription` + `cancelled.reasons.*` keys |
| Edit | `messages/lt.json` | Add `actionRequired.expiredDescription` + `cancelled.reasons.*` keys |
| Edit | `messages/et.json` | Add `actionRequired.expiredDescription` + `cancelled.reasons.*` keys |
| Edit | `app/[locale]/staff/orders/page.tsx` | Add refund alert banner for orders needing attention |
| Edit | `app/[locale]/staff/orders/[id]/page.tsx` | Add "Process Refund" button for unrefunded cancelled orders |
| Edit | `app/api/seller/orders/[id]/decline/route.ts` | Add buyer notification on decline |
| Edit | `app/api/seller/orders/[id]/cancel/route.ts` | Add buyer notification on cancel |

### Phase 2 (high priority)

| Action | File path | What changes |
|--------|-----------|-------------|
| New Edge Function | `supabase/functions/cron-shipping-reminders/index.ts` | Shipping reminder emails |
| New migration | `supabase/migrations/YYYYMMDD_schedule_phase2_cron_jobs.sql` | Schedule: shipping-reminders, process-ended-auctions, expire-auction-payments, auction-ending-soon, cleanup-deleted-accounts |

### Phase 3 (maintenance)

| Action | File path | What changes |
|--------|-----------|-------------|
| New migration | `supabase/migrations/YYYYMMDD_schedule_phase3_cron_jobs.sql` | Schedule: cleanup-login-activity, release-stale-reservations |

---

## Verification checklist

After each phase, run these checks:

### Phase 1 verification

```sql
-- 1. Confirm all Phase 1 jobs are scheduled and active
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN (
  'expire-seller-deadlines',
  'expire-shipping-deadlines',
  'escalate-expired-disputes',
  'sync-tracking',
  'refund-safety-net'
)
ORDER BY jobname;
-- Expected: 5 rows, all active = true

-- 2. Confirm RPC guard works
SELECT seller_accept_order(
  'd40489eb-4eac-4e9b-a6a3-f21f0505ac92'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid
);
-- Expected: {"success": false, "error": "...expired..." or "...not found..."}

-- 3. Confirm no pending_seller orders with expired deadlines exist
SELECT count(*) FROM orders
WHERE status = 'pending_seller'
  AND seller_response_deadline < NOW();
-- Expected: 0

-- 4. Confirm jobs are executing (wait 5-10 minutes after deploy)
SELECT d.jobid, j.jobname, d.status, d.start_time
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname LIKE 'expire-%' OR j.jobname = 'sync-tracking'
ORDER BY d.start_time DESC
LIMIT 10;

-- 5. Confirm Edge Function calls are succeeding
SELECT id, status_code, error_msg, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
-- Expected: status_code = 200

-- 6. Confirm no cancelled orders without refunds (after safety net runs)
SELECT count(*) FROM orders
WHERE status = 'cancelled'
  AND refunded_at IS NULL
  AND everypay_payment_reference IS NOT NULL
  AND cancelled_at < NOW() - INTERVAL '15 minutes';
-- Expected: 0 (after safety net sweep)
```

### Phase 2 verification

```sql
-- Confirm all Phase 2 jobs are scheduled
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN (
  'shipping-reminders', 'process-ended-auctions',
  'expire-auction-payments', 'auction-ending-soon',
  'cleanup-deleted-accounts'
)
ORDER BY jobname;
-- Expected: 5 rows, all active = true
```

---

## Edge Function environment variables

The existing `cron-expire-seller-deadlines` function should already have these secrets configured. The new `cron-refund-safety-net` function will need the same EveryPay secrets. Confirm all are set in Supabase Dashboard → Edge Functions → Secrets:

| Variable | Required by | Notes |
|----------|------------|-------|
| `SUPABASE_URL` | All Edge Functions | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | All Edge Functions | Auto-set by Supabase |
| `EVERYPAY_API_URL` | cron-expire-seller-deadlines, cron-refund-safety-net | Production: `https://pay.every-pay.eu` |
| `EVERYPAY_API_USERNAME` | cron-expire-seller-deadlines, cron-refund-safety-net | From EveryPay portal |
| `EVERYPAY_API_SECRET` | cron-expire-seller-deadlines, cron-refund-safety-net | From EveryPay portal |
| `RESEND_API_KEY` | All email-sending Edge Functions | From Resend dashboard |
| `RESEND_FROM_EMAIL` | All email-sending Edge Functions | `Second Turn <info@secondturn.games>` |
| `APP_URL` | Edge Functions with links | `https://www.secondturn.games` |

---

## Known issues (post-launch improvements)

These were found during the audit but don't need to block the current implementation.

**1. Race condition: `complete_delivered_orders` vs dispute filing (Pain Point #10)**
Both the 2-day auto-completion cron and the 2-day dispute window expire at the same boundary. The cron could credit the seller wallet and set `'completed'` moments before a buyer submits a dispute, which would then be rejected. Fix: add `'completed'` to `disputeAllowedStatuses` with a grace period check, or have the cron skip orders in the last hour of the window.

**2. DAC7 trigger doesn't reverse on refund (Pain Point #11)**
`track_dac7_metrics_on_order_completion` increments seller metrics when an order reaches `delivered`/`completed`, but never decrements when refunded via dispute. This inflates DAC7 thresholds. Fix: add a decrement trigger on refund status transitions.

**3. EveryPay void logic untestable in test environment (Pain Point #9)**
All test orders auto-settle. The void-before-refund path in Task 1.3 cannot be validated until production EveryPay has capture delay enabled via Swedbank. Add to launch checklist: verify capture delay is active, test a void on a pre-authorized payment.

---

## Out of scope

- Converting existing Next.js cron routes to Edge Functions (they can coexist; the routes serve as manual trigger endpoints)
- Vercel Cron configuration (not available on free plan)
- Payout processing automation (not needed for MVP — manual SEPA transfers)
- DAC7 reporting automation
- Monitoring/alerting for failed cron jobs (post-launch improvement)

---

## Execution order for Claude Code

Execute phases sequentially. Within Phase 1, the recommended order is:

1. **Task 1.1** — RPC guards (immediate safety, no dependencies)
2. **Task 1.2** — UI button disable (immediate UX fix, no dependencies)
3. **Task 1.9** — Cancellation reason surfacing (API + type + UI + translations)
4. **Task 1.3** — Fix and deploy the existing expire-seller-deadlines Edge Function (5 bugs to fix + add notification)
5. **Task 1.7** — Create shipping deadline SQL function with notifications (migration)
6. **Task 1.8** — Fix `escalate_expired_disputes` SECURITY DEFINER (migration)
7. **Task 1.10** — Create and deploy refund-safety-net Edge Function
8. **Schedule all cron jobs** in one migration: expire-seller-deadlines (Task 1.3), expire-shipping-deadlines (Task 1.7), escalate-expired-disputes (Task 1.8), sync-tracking (Task 1.4), refund-safety-net (Task 1.10)
9. **Task 1.11** — Staff dashboard refund alerts + Process Refund button
10. **Task 1.12** — Add buyer notifications to seller decline + seller cancel routes

**Note:** Tasks 1.4, 1.5, 1.6 from the original v1.0 were consolidated into the new Task 1.3. The current Task 1.4 is "Schedule tracking sync." Numbering gaps (1.5, 1.6) are intentional.

After each task, run the relevant verification query from the checklist above before proceeding.
