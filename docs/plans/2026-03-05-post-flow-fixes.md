# Post-Flow Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address issues discovered during Flows 1-4: wire up dispute refunds + emails, fix newsletter linking, harden shipping pricing, clean up dead cron config, add Q&A email notifications, remove `as any` casts.

**Architecture:** Quick fixes first, then the two feature-like tasks (dispute refunds, Q&A emails). All paths relative to `packages/marketplace/`.

**Tech Stack:** Next.js 14 App Router, Supabase, Resend email, EveryPay payments

---

## Task 1: Fix `link_newsletter_to_user` and `handle_new_user`

The Flow 1 migration was never applied — `handle_new_user` doesn't call `link_newsletter_to_user`. Also the consolidated schema's version of `link_newsletter_to_user` lost the `LOWER(TRIM())` normalization from the original.

**Files:**
- Create: `supabase/migrations/115_fix_newsletter_linking.sql`

**Step 1: Apply migration via Supabase MCP**

```sql
-- Fix link_newsletter_to_user to normalize email (regression from consolidation)
CREATE OR REPLACE FUNCTION link_newsletter_to_user(p_user_id UUID, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE newsletter_subscribers
  SET user_id = p_user_id, updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email)) AND user_id IS NULL;
END;
$$;

-- Update handle_new_user to call link_newsletter_to_user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, preferred_locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );
  PERFORM link_newsletter_to_user(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Backfill: link existing newsletter subscribers to their user accounts
UPDATE newsletter_subscribers ns
SET user_id = up.id, updated_at = NOW()
FROM user_profiles up
WHERE LOWER(TRIM(ns.email)) = LOWER(TRIM(up.email))
  AND ns.user_id IS NULL;
```

**Step 2: Save migration file locally**

**Step 3: Verify** — `SELECT count(*) FROM newsletter_subscribers WHERE user_id IS NOT NULL` should be > 0 (or 0 if no overlap exists, which is fine).

---

## Task 2: Remove Dead pg_cron Edge Function Schedules

The pg_cron jobs reference Edge Functions via `call_edge_function()`, but the vault `service_role_key` secret isn't configured and `cron-expire-seller-deadlines` Edge Function doesn't exist. All 4 jobs are handled by Vercel Cron → Next.js API routes. Remove the pg_cron schedules to stop silent failures.

**Files:**
- Create: `supabase/migrations/116_remove_dead_cron_schedules.sql`

**Step 1: Check what cron jobs exist**

Run via Supabase MCP: `SELECT jobid, schedule, command FROM cron.job ORDER BY jobid`

**Step 2: Apply migration to unschedule Edge Function cron jobs**

```sql
-- Remove pg_cron schedules that call non-existent Edge Functions
-- All business logic is handled by Vercel Cron → Next.js API routes
SELECT cron.unschedule('expire-seller-deadlines');
SELECT cron.unschedule('process-auctions');
SELECT cron.unschedule('sync-tracking');
SELECT cron.unschedule('cleanup-accounts');
```

Note: Only unschedule jobs that use `call_edge_function()`. If any job does direct SQL (like `complete_delivered_orders`), keep it.

**Step 3: Verify** — `SELECT * FROM cron.job` should show only the direct-SQL jobs (if any).

**Step 4: Save migration file locally**

---

## Task 3: Harden `getShippingPrice` Return Type

Currently returns `0` for unknown routes, which would show as "free shipping". Since `TerminalCountry` type prevents non-Baltic at compile time, the risk is low, but a `null` return is safer for runtime edge cases.

**Files:**
- Modify: `lib/unisend/types.ts` — change return type to `number | null`, return `null` instead of `0`
- Modify: `app/api/checkout/create-session/route.ts` — handle `null` return
- Modify: `app/api/auctions/[id]/checkout/route.ts` — handle `null` return
- Modify: `app/[locale]/checkout/page.tsx` — handle `null` return

**Step 1:** Edit `getShippingPrice` in `lib/unisend/types.ts`:
```typescript
export function getShippingPrice(
  senderCountry: TerminalCountry,
  receiverCountry: TerminalCountry,
  size: ParcelSize = 'M'
): number | null {
  return SHIPPING_PRICES[senderCountry]?.[receiverCountry]?.[size] ?? null;
}
```

**Step 2:** Edit `create-session/route.ts` — after calling `getShippingPrice()`, add null check:
```typescript
const shippingCostEuros = getShippingPrice(sellerCountry, input.destinationCountry, 'M');
if (shippingCostEuros == null) {
  return NextResponse.json(
    { error: 'Shipping not available for this route' },
    { status: 400 }
  );
}
```

**Step 3:** Same pattern in `auctions/[id]/checkout/route.ts`

**Step 4:** In `checkout/page.tsx` — handle null by showing an error state or disabling checkout. The shipping price is used for display, so:
```typescript
const shippingCostEuros = getShippingPrice(basket.seller_country, selectedTerminal.countryCode, 'M');
// If null, shippingCostEuros defaults to 0 for display but checkout API will reject
```
Actually, keep the display simple — the API routes will reject invalid routes. In the page, use `?? 0` for display since the API will catch it.

**Step 5:** Run `pnpm type-check`

---

## Task 4: Remove `as any` Casts in Listings Route

The auction cooldown migration added columns not in generated types. Regenerate types to include them.

**Files:**
- Modify: `lib/supabase/database.types.ts` — regenerate
- Modify: `app/api/listings/route.ts` — remove `as any` casts and eslint-disable comments

**Step 1:** Apply the auction cooldown migration if not already applied. Check if columns exist first:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'listings' AND column_name IN ('auction_end_strategy', 'auction_cooldown_hours')
```

If columns don't exist, apply `supabase/migrations/20260302_add_auction_cooldown.sql` via MCP.

**Step 2:** Regenerate Supabase types via MCP `generate_typescript_types`

**Step 3:** Write updated types to `lib/supabase/database.types.ts`

**Step 4:** Edit `app/api/listings/route.ts` lines 459-462 — remove `as any` casts and eslint-disable comments:
```typescript
auction_end_strategy: row.auction_end_strategy || 'fixed',
auction_cooldown_hours: row.auction_cooldown_hours || null,
```

**Step 5:** Run `pnpm type-check`

---

## Task 5: Wire Up Dispute Refund Processing

The resolve route updates order status but doesn't actually process refunds. The `processRefund` function exists but only handles full refunds. Need to support partial refunds too.

**Files:**
- Modify: `lib/services/refund.ts` — add `processPartialRefund` function
- Modify: `app/api/admin/disputes/[id]/resolve/route.ts` — call refund + email functions

**Step 1:** Add `processPartialRefund` to `refund.ts`:

```typescript
/**
 * Process a partial refund for a specific amount
 * Used for dispute resolutions with buyer_partial_refund
 */
export async function processPartialRefund(
  supabase: SupabaseClient,
  orderId: string,
  refundAmountCents: number,
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; error?: string }>
): Promise<RefundResult> {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, total_amount, buyer_id, buyer_wallet_debit_cents, everypay_payment_reference')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: 'Order not found' };
  }

  const walletDebitCents = order.buyer_wallet_debit_cents || 0;
  // Refund wallet portion first (up to what was debited), remainder from EveryPay
  const walletRefundCents = Math.min(refundAmountCents, walletDebitCents);
  const everypayRefundCents = refundAmountCents - walletRefundCents;

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;

  if (everypayRefundCents > 0 && order.everypay_payment_reference) {
    const epResult = await refundEveryPay(order.everypay_payment_reference, everypayRefundCents);
    if (!epResult.success) {
      return { success: false, walletRefundedCents: 0, everypayRefundedCents: 0, error: `EveryPay refund failed: ${epResult.error}` };
    }
    everypayRefundedCents = everypayRefundCents;
  }

  if (walletRefundCents > 0) {
    const walletResult = await refundToWallet(supabase, order.buyer_id, walletRefundCents, orderId);
    if (!walletResult.success) {
      return { success: false, walletRefundedCents: 0, everypayRefundedCents, error: `Wallet refund failed: ${walletResult.error}` };
    }
    walletRefundedCents = walletRefundCents;
  }

  return { success: true, walletRefundedCents, everypayRefundedCents };
}
```

**Step 2:** Edit the dispute resolve route to:

a) Expand the order select to include refund-relevant fields:
```typescript
.select('id, order_number, status, dispute_status, buyer_id, seller_id, total_amount, buyer_wallet_debit_cents, everypay_payment_reference')
```

b) After the order update (line 123), add refund processing:
```typescript
// Process refund if applicable
if (resolution_type === 'buyer_full_refund') {
  const { refundPayment } = await import('@/lib/everypay/client');
  const refundResult = await processRefund(adminSupabase, orderId, async (ref, cents) => {
    try {
      await refundPayment(ref, cents);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });
  if (!refundResult.success) {
    console.error(`Refund failed for order ${order.order_number}:`, refundResult.error);
  }
} else if (resolution_type === 'buyer_partial_refund' && refund_amount_cents) {
  const { refundPayment } = await import('@/lib/everypay/client');
  const refundResult = await processPartialRefund(adminSupabase, orderId, refund_amount_cents, async (ref, cents) => {
    try {
      await refundPayment(ref, cents);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });
  if (!refundResult.success) {
    console.error(`Partial refund failed for order ${order.order_number}:`, refundResult.error);
  }
}
```

c) After refund processing, send resolution emails to both buyer and seller:
```typescript
// Send resolution emails to buyer and seller
const { data: profiles } = await adminSupabase
  .from('user_profiles')
  .select('id, full_name, email')
  .in('id', [order.buyer_id, order.seller_id]);

if (profiles) {
  const isSellerFavor = resolution_type === 'seller_favor';
  for (const profile of profiles) {
    sendDisputeResolved({
      recipientName: profile.full_name || 'User',
      recipientEmail: profile.email,
      orderNumber: order.order_number,
      resolution: resolution_type,
      resolutionNote: resolution_notes.trim(),
      isSellerFavor,
    }).catch(err => console.error('Dispute email failed:', err));
  }
}
```

**Step 3:** Add imports at top of resolve route:
```typescript
import { processRefund, processPartialRefund } from '@/lib/services/refund';
import { sendDisputeResolved } from '@/lib/email/send-order-emails';
```

**Step 4:** Note: `processRefund` sets `status: 'refunded'` itself (line 136 of refund.ts), but the resolve route already set it. This is redundant but harmless — same value written twice. Don't change this to keep refund.ts self-contained.

**Step 5:** Run `pnpm type-check`

---

## Task 6: Add Q&A Email Notifications

When a buyer posts a question on a listing, notify the seller. When someone replies, notify the question author.

**Files:**
- Create: `lib/email/templates/new-question.tsx` — email template
- Modify: `lib/email/send-order-emails.ts` — add `sendNewQuestionEmail` and `sendNewReplyEmail`
- Modify: `app/api/listings/[id]/questions/route.ts` — call email after question posted
- Modify: `app/api/listings/[id]/questions/[questionId]/replies/route.ts` — call email after reply posted

**Step 1:** Create `lib/email/templates/new-question.tsx`:

```tsx
import { Html, Head, Body, Container, Section, Text, Button, Hr } from '@react-email/components';

interface NewQuestionEmailProps {
  recipientName: string;
  gameName: string;
  questionContent: string;
  authorName: string;
  listingUrl: string;
  isReply?: boolean;
}

export function NewQuestionEmail({
  recipientName,
  gameName,
  questionContent,
  authorName,
  listingUrl,
  isReply = false,
}: NewQuestionEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Hi {recipientName},
            </Text>
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              {isReply
                ? `${authorName} replied to a question on "${gameName}":`
                : `${authorName} asked a question about "${gameName}":`}
            </Text>
            <Section style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '16px', margin: '16px 0' }}>
              <Text style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                "{questionContent}"
              </Text>
            </Section>
            <Button
              href={listingUrl}
              style={{
                backgroundColor: '#111827',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              View & Reply
            </Button>
          </Section>
          <Hr style={{ margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>
            Second Turn Games — Every game deserves a second turn
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 2:** Add send functions to a new file `lib/email/send-question-emails.ts`:

```typescript
import { sendEmail } from './resend';
import { NewQuestionEmail } from './templates/new-question';
import { loggers } from '@/lib/logging';

export async function sendNewQuestionEmail(params: {
  sellerName: string;
  sellerEmail: string;
  gameName: string;
  questionContent: string;
  authorName: string;
  listingUrl: string;
}) {
  try {
    await sendEmail({
      to: params.sellerEmail,
      subject: `New question about "${params.gameName}"`,
      react: NewQuestionEmail({
        recipientName: params.sellerName,
        gameName: params.gameName,
        questionContent: params.questionContent,
        authorName: params.authorName,
        listingUrl: params.listingUrl,
      }),
    });
    loggers.email.info({ listingUrl: params.listingUrl }, 'Question notification sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ error }, 'Failed to send question notification');
    return { success: false };
  }
}

export async function sendNewReplyEmail(params: {
  recipientName: string;
  recipientEmail: string;
  gameName: string;
  replyContent: string;
  authorName: string;
  listingUrl: string;
}) {
  try {
    await sendEmail({
      to: params.recipientEmail,
      subject: `New reply on "${params.gameName}"`,
      react: NewQuestionEmail({
        recipientName: params.recipientName,
        gameName: params.gameName,
        questionContent: params.replyContent,
        authorName: params.authorName,
        listingUrl: params.listingUrl,
        isReply: true,
      }),
    });
    loggers.email.info({ listingUrl: params.listingUrl }, 'Reply notification sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ error }, 'Failed to send reply notification');
    return { success: false };
  }
}
```

**Step 3:** Edit `questions/route.ts` POST — after `formattedQuestion` is built (line 257), replace the TODO:

```typescript
// Send email notification to seller (fire-and-forget)
const { data: sellerProfile } = await supabase
  .from('user_profiles')
  .select('full_name, email')
  .eq('id', listing.seller_id)
  .single();

const { data: askerProfile } = await supabase
  .from('user_profiles')
  .select('full_name')
  .eq('id', user!.id)
  .single();

if (sellerProfile?.email) {
  const { sendNewQuestionEmail } = await import('@/lib/email/send-question-emails');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://secondturn.games';
  sendNewQuestionEmail({
    sellerName: sellerProfile.full_name || 'Seller',
    sellerEmail: sellerProfile.email,
    gameName: listing.game_name || 'your listing',
    questionContent: content,
    authorName: askerProfile?.full_name || 'Someone',
    listingUrl: `${baseUrl}/en/games/${listingId}`,
  }).catch(() => {});
}
```

Note: Need to add `game_name` to the listing select query (line 187):
```typescript
.select('id, seller_id, status, game_name')
```

Wait — `game_name` might not be directly on listings. Need to check. If it comes from the `games` join, use the listing title or fetch game name separately.

Actually, check what columns `listings` has — it likely has `title` or joins to `games`. Use whatever is available. If `listings` doesn't have a name column, just use the listing ID for now.

**Step 4:** Edit `replies/route.ts` POST — after `formattedReply` is built (line 134), replace the TODO:

```typescript
// Send email notification to question author (fire-and-forget, skip if seller replying to own listing)
if (parentQuestion.user_id !== user!.id) {
  const { data: authorProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', parentQuestion.user_id)
    .single();

  const { data: replierProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single();

  if (authorProfile?.email) {
    const { sendNewReplyEmail } = await import('@/lib/email/send-question-emails');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://secondturn.games';
    sendNewReplyEmail({
      recipientName: authorProfile.full_name || 'User',
      recipientEmail: authorProfile.email,
      gameName: listing.game_name || 'a listing',
      replyContent: content,
      authorName: replierProfile?.full_name || 'Someone',
      listingUrl: `${baseUrl}/en/games/${listingId}`,
    }).catch(() => {});
  }
}
```

Need to also add `user_id` to the parentQuestion select (line 43) — already has it.
Need to also fetch listing game name — add to listing select (line 79):
```typescript
.select('id, status, game_name')
```

**Step 5:** Run `pnpm type-check`

---

## Verification

After all tasks complete:

```bash
pnpm type-check
pnpm test
pnpm build:ds && pnpm build:marketplace

# Verify no remaining as-any in checkout/order routes
grep -r "as any" packages/marketplace/app/api/checkout/ packages/marketplace/app/api/auctions/ packages/marketplace/app/api/seller/orders/ packages/marketplace/app/api/webhooks/ packages/marketplace/app/api/listings/route.ts

# Verify TODOs cleaned up
grep -rn "TODO.*refund\|TODO.*email notification\|TODO.*Send" packages/marketplace/app/api/admin/disputes/ packages/marketplace/app/api/listings/
```
