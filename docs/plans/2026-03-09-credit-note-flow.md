# Credit Note Flow (Post-Completion Refunds) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable post-completion refunds with automatic credit note generation, wallet clawback, and buyer refund processing.

**Architecture:** When staff resolves a dispute on a completed order as "refunded", the system: (1) claws back the seller's wallet credit via `debit_seller_wallet` RPC, (2) refunds the buyer via existing EveryPay/wallet refund logic, (3) generates a credit note document referencing the original invoice. All DB infrastructure (sequences, RPC, document_type) already exists.

**Tech Stack:** Next.js 14 Server Components, Supabase RPC, EveryPay refund API, TypeScript

---

## Context: What Already Exists

- `debit_seller_wallet` RPC — atomic wallet clawback (tested, working)
- `generate_credit_note_number()` RPC — returns `CN-YYYY-NNNNN` (in DB, in types)
- `platform_documents` table — accepts `document_type = 'credit_note'` with `original_document_id`
- `processRefund()` / `processPartialRefund()` in `lib/services/refund.ts` — handles EveryPay + wallet refunds (pre-completion only)
- `DocumentLayout`, `DocumentLineItems`, `DocumentTotals` — shared document components
- `resolveVatBreakdown()`, `LATVIA_VAT_RATE` — VAT calculation utils
- `requireServerAuth()` — shared auth helper for Server Components
- `getCommissionInvoiceData()` — pattern to follow for credit note data fetching

## Important Column Names (verified against DB)

- `user_profiles`: `full_name` (NOT `display_name`)
- `orders`: `buyer_wallet_debit_cents` (NOT `wallet_debit_cents`)
- `orders`: NO `everypay_charge_cents` column — compute from `total_amount - buyer_wallet_debit_cents`
- `wallets`: `user_id` as PK (NO `id` column)
- `withdrawal_requests`: `processed_at` (NOT `completed_at`), `bank_reference` (NOT `sepa_reference`)

---

### Task 1: `processPostCompletionRefund()` Service Function

**Files:**
- Modify: `packages/marketplace/lib/services/refund.ts`
- Modify: `packages/marketplace/lib/services/document-service.ts` (add `createCreditNote`)

**Step 1: Add `createCreditNote` to document-service.ts**

Add after the existing `createPayoutStatement` function (line ~302):

```typescript
/**
 * Create a credit note document when a post-completion refund is processed.
 * References the original commission invoice via original_document_id.
 */
export async function createCreditNote(
  supabase: SupabaseClient,
  orderId: string,
  sellerId: string,
  originalDocumentId: string,
  data: Record<string, unknown>,
): Promise<{ documentNumber: string } | null> {
  const { data: result, error } = await supabase.rpc('generate_credit_note_number');
  if (error || !result) return null;

  const documentNumber = result as string;

  const { error: insertError } = await supabase
    .from('platform_documents')
    .insert({
      document_type: 'credit_note',
      document_number: documentNumber,
      order_id: orderId,
      seller_id: sellerId,
      original_document_id: originalDocumentId,
      data,
    });

  if (insertError) return null;

  return { documentNumber };
}
```

**Step 2: Add `processPostCompletionRefund` to refund.ts**

Add at the end of `refund.ts`. This function orchestrates three steps:
1. Claw back seller wallet via `debit_seller_wallet` RPC
2. Refund buyer via existing `processRefund` logic (reuse `calculateRefundAmounts`, `refundToWallet`, EveryPay adapter)
3. Generate credit note document

```typescript
import { createCreditNote } from './document-service';
import { resolveVatBreakdown, LATVIA_VAT_RATE } from '@/lib/bookkeeping-utils';

export interface PostCompletionRefundResult {
  success: boolean;
  creditNoteNumber?: string;
  walletClawbackCents?: number;
  buyerRefundResult?: RefundResult;
  error?: string;
}

/**
 * Process a refund on a completed order (post wallet-credit).
 * 1. Claws back seller wallet credit via debit_seller_wallet RPC
 * 2. Refunds buyer via EveryPay/wallet
 * 3. Generates credit note referencing original invoice
 */
export async function processPostCompletionRefund(
  supabase: SupabaseClient,
  orderId: string,
  refundReason: string,
  refundEveryPay: (paymentRef: string, amountCents: number) => Promise<{ success: boolean; reference?: string; error?: string }>
): Promise<PostCompletionRefundResult> {
  // Fetch order with all needed fields
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select(`
      id, status, order_number, total_amount, items_total, shipping_cost,
      buyer_id, seller_id, buyer_wallet_debit_cents,
      everypay_payment_reference, payment_method,
      platform_commission_cents, seller_wallet_credit_cents,
      commission_net_cents, commission_vat_cents, commission_vat_rate,
      shipping_net_cents, shipping_vat_cents, shipping_vat_rate,
      sender_country, invoice_number, wallet_credited_at
    `)
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Order not found' };
  }

  if (!order.wallet_credited_at) {
    return { success: false, error: 'Order wallet was never credited — use standard refund' };
  }

  const clawbackCents = order.seller_wallet_credit_cents;

  // Step 1: Claw back seller wallet
  const { data: debitResult, error: debitError } = await supabase.rpc('debit_seller_wallet', {
    p_order_id: orderId,
    p_amount_cents: clawbackCents,
  });

  if (debitError) {
    return { success: false, error: `Wallet clawback failed: ${debitError.message}` };
  }

  const debit = debitResult as { success: boolean; error?: string };
  if (!debit.success) {
    return { success: false, error: `Wallet clawback failed: ${debit.error}` };
  }

  // Step 2: Refund buyer (reuse existing refund logic)
  // Temporarily allow refund by not checking status (order is completed/disputed)
  const { walletPortionCents, everypayPortionCents } = calculateRefundAmounts(
    order.total_amount,
    order.buyer_wallet_debit_cents,
  );

  let walletRefundedCents = 0;
  let everypayRefundedCents = 0;
  let requiresManualSepa = false;

  // Refund wallet portion to buyer
  if (walletPortionCents > 0) {
    const walletResult = await refundToWallet(supabase, order.buyer_id, walletPortionCents, orderId);
    if (walletResult.success) walletRefundedCents = walletPortionCents;
  }

  // Refund EveryPay portion
  if (everypayPortionCents > 0 && order.everypay_payment_reference) {
    if (order.payment_method === 'bank_link') {
      // Bank link: flag for manual SEPA
      requiresManualSepa = true;
      try {
        await refundEveryPay(order.everypay_payment_reference, everypayPortionCents);
      } catch { /* best-effort for bank links */ }
    } else {
      const epResult = await refundEveryPay(order.everypay_payment_reference, everypayPortionCents);
      if (epResult.success) {
        everypayRefundedCents = everypayPortionCents;
        if (epResult.reference) {
          await supabase
            .from('orders')
            .update({ refund_everypay_reference: epResult.reference })
            .eq('id', orderId);
        }
      }
    }
  }

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'refunded',
      refund_status: requiresManualSepa ? 'manual_sepa_required' : 'completed',
      refund_amount: order.total_amount,
      refund_reason: refundReason,
      refund_method: everypayPortionCents === 0 ? 'wallet_only' : order.payment_method === 'bank_link' ? 'everypay_bank_link' : 'everypay_card',
      refund_initiated_at: new Date().toISOString(),
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Step 3: Generate credit note
  // Find original invoice document
  const { data: originalDoc } = await supabase
    .from('platform_documents')
    .select('id')
    .eq('order_id', orderId)
    .eq('document_type', 'commission_invoice')
    .single();

  const vatRate = order.commission_vat_rate ?? LATVIA_VAT_RATE;
  const commission = resolveVatBreakdown(
    order.platform_commission_cents / 100,
    order.commission_net_cents,
    order.commission_vat_cents,
  );
  const shipping = resolveVatBreakdown(
    order.shipping_cost,
    order.shipping_net_cents,
    order.shipping_vat_cents,
  );

  const creditNoteData = {
    order_id: orderId,
    order_number: order.order_number,
    invoice_number: order.invoice_number,
    refund_reason: refundReason,
    items_total: order.items_total,
    shipping_cost: order.shipping_cost,
    total_amount: order.total_amount,
    platform_commission_cents: order.platform_commission_cents,
    seller_wallet_credit_cents: order.seller_wallet_credit_cents,
    commission_net: commission.net,
    commission_vat: commission.vat,
    commission_vat_rate: vatRate,
    shipping_net: shipping.net,
    shipping_vat: shipping.vat,
    buyer_refund: {
      wallet_cents: walletRefundedCents,
      everypay_cents: everypayRefundedCents,
      requires_manual_sepa: requiresManualSepa,
    },
    seller_clawback_cents: clawbackCents,
  };

  let creditNoteNumber: string | undefined;
  if (originalDoc) {
    const cnResult = await createCreditNote(
      supabase, orderId, order.seller_id, originalDoc.id, creditNoteData,
    );
    creditNoteNumber = cnResult?.documentNumber;
  }

  // Store credit note number on order
  if (creditNoteNumber) {
    await supabase
      .from('orders')
      .update({ credit_note_number: creditNoteNumber })
      .eq('id', orderId);
  }

  return {
    success: true,
    creditNoteNumber,
    walletClawbackCents: clawbackCents,
    buyerRefundResult: {
      success: true,
      walletRefundedCents,
      everypayRefundedCents,
      requiresManualSepa,
    },
  };
}
```

**Step 3: Verify `credit_note_number` column exists on orders**

Check if `orders.credit_note_number` exists. If not, add via migration. The column stores the CN-YYYY-NNNNN reference (like `invoice_number` stores COM-YYYY-NNNNN).

Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'credit_note_number';`

If missing, create migration `20260309_add_credit_note_number.sql`:
```sql
ALTER TABLE orders ADD COLUMN credit_note_number TEXT;
```

**Step 4: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 5: Commit**

```
feat: add processPostCompletionRefund with credit note generation
```

---

### Task 2: Credit Note Data Fetching

**Files:**
- Modify: `packages/marketplace/lib/services/document-service.ts`

**Step 1: Add `CreditNoteData` interface and `getCreditNoteData` function**

Add interface after `PayoutStatementData` (~line 113):

```typescript
export interface CreditNoteData {
  document: {
    id: string;
    document_number: string;
    data: Record<string, unknown>;
    created_at: string;
    original_document_id: string | null;
  };
  order: {
    id: string;
    order_number: string;
    status: string;
    invoice_number: string | null;
    items_total: number;
    shipping_cost: number;
    total_amount: number;
    platform_commission_cents: number;
    seller_wallet_credit_cents: number;
    commission_net_cents: number | null;
    commission_vat_cents: number | null;
    commission_vat_rate: number | null;
    shipping_net_cents: number | null;
    shipping_vat_cents: number | null;
    shipping_vat_rate: number | null;
    sender_country: string | null;
    refund_amount: number | null;
    refund_reason: string | null;
  };
  seller: {
    id: string;
    full_name: string;
    country: string | null;
  };
}
```

Add function after `getPayoutStatementData`:

```typescript
/**
 * Fetch all data needed to render a credit note.
 * Returns null if order/document not found or user lacks access.
 */
export async function getCreditNoteData(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  isStaff: boolean,
): Promise<CreditNoteData | null> {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, invoice_number,
      items_total, shipping_cost, total_amount,
      platform_commission_cents, seller_wallet_credit_cents,
      commission_net_cents, commission_vat_cents, commission_vat_rate,
      shipping_net_cents, shipping_vat_cents, shipping_vat_rate,
      sender_country, refund_amount, refund_reason, seller_id
    `)
    .eq('id', orderId)
    .single();

  if (!order) return null;

  // Access check: seller or staff
  if (!isStaff && order.seller_id !== userId) return null;

  // Credit note only exists for refunded orders
  if (order.status !== 'refunded') return null;

  const [{ data: document }, { data: seller }] = await Promise.all([
    supabase
      .from('platform_documents')
      .select('id, document_number, data, created_at, original_document_id')
      .eq('order_id', orderId)
      .eq('document_type', 'credit_note')
      .single(),
    supabase
      .from('user_profiles')
      .select('id, full_name, country')
      .eq('id', order.seller_id)
      .single(),
  ]);

  if (!document || !seller) return null;

  return { document, order, seller };
}
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```
feat: add getCreditNoteData for credit note page rendering
```

---

### Task 3: Credit Note Page

**Files:**
- Create: `packages/marketplace/app/[locale]/orders/[id]/credit-note/page.tsx`

**Step 1: Create the page**

Follow the exact same pattern as the invoice page. Key differences:
- Title: "Credit Note"
- Shows negative line items (reversal of commission + shipping)
- References original invoice number
- Shows refund reason

```typescript
import { requireServerAuth } from '@/lib/auth/server-auth';
import { getCreditNoteData } from '@/lib/services/document-service';
import { resolveVatBreakdown, LATVIA_VAT_RATE } from '@/lib/bookkeeping-utils';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentLineItems, type LineItem } from '@/components/documents/DocumentLineItems';
import { DocumentTotals } from '@/components/documents/DocumentTotals';
import { formatPrice } from '@/lib/services/pricing';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CreditNotePage({ params }: Props) {
  const { locale, id: orderId } = await params;
  const { user, isStaff, serviceClient } = await requireServerAuth(locale);

  const data = await getCreditNoteData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">Credit note not available</h1>
          <p className="mt-2 text-text-secondary">
            This credit note is not yet available or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  const { document, order, seller } = data;

  const vatRate = order.commission_vat_rate ?? LATVIA_VAT_RATE;
  const commission = resolveVatBreakdown(
    order.platform_commission_cents / 100,
    order.commission_net_cents,
    order.commission_vat_cents,
  );
  const shipping = resolveVatBreakdown(
    order.shipping_cost,
    order.shipping_net_cents,
    order.shipping_vat_cents,
  );

  // Credit note shows negative amounts (reversal)
  const lineItems: LineItem[] = [
    {
      description: `Reversal: marketplace commission (10% of ${formatPrice(order.items_total)})`,
      grossEuros: -commission.gross,
      netEuros: -commission.net,
      vatRate,
      vatEuros: -commission.vat,
    },
    {
      description: 'Reversal: shipping management',
      grossEuros: -shipping.gross,
      netEuros: -shipping.net,
      vatRate: order.shipping_vat_rate ?? LATVIA_VAT_RATE,
      vatEuros: -shipping.vat,
    },
  ];

  const totalGross = -(commission.gross + shipping.gross);
  const totalNet = -(commission.net + shipping.net);
  const totalVat = -(commission.vat + shipping.vat);

  return (
    <DocumentLayout
      title="Credit Note"
      documentNumber={document.document_number}
      date={document.created_at}
      recipient={
        <div>
          <p className="font-medium">{seller.full_name}</p>
          {seller.country && <p>Country: {seller.country}</p>}
        </div>
      }
    >
      {/* References */}
      <div className="mb-6 space-y-1 text-sm text-text-secondary">
        <p>Order: {order.order_number}</p>
        {order.invoice_number && <p>Original invoice: {order.invoice_number}</p>}
        {order.refund_reason && <p>Reason: {order.refund_reason}</p>}
      </div>

      {/* Line items (negative = reversal) */}
      <DocumentLineItems items={lineItems} />

      {/* Totals */}
      <DocumentTotals
        rows={[
          { label: 'Total net', amount: totalNet },
          { label: `VAT (${(vatRate * 100).toFixed(0)}%)`, amount: totalVat },
          { label: 'Credit note total', amount: totalGross, bold: true },
        ]}
      />

      {/* Explanation */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">Refund summary</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>Seller wallet clawback</span>
            <span>{formatPrice((order.seller_wallet_credit_cents ?? 0) / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform commission reversed</span>
            <span>{formatPrice(Math.abs(totalGross))}</span>
          </div>
          <div className="flex justify-between font-medium text-polar-night">
            <span>Buyer refund</span>
            <span>{formatPrice(order.refund_amount ?? order.total_amount)}</span>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}
```

**Step 2: Verify `DocumentLineItems` handles negative amounts**

Read `packages/marketplace/components/documents/DocumentLineItems.tsx` and confirm it renders negative values correctly (with minus sign). If it uses `formatPrice()`, check that utility handles negatives.

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```
feat: add credit note page at /orders/[id]/credit-note
```

---

### Task 4: Credit Note Link in OrderPricingSummary

**Files:**
- Modify: `packages/marketplace/components/order-detail/OrderPricingSummary.tsx`

**Step 1: Expand document links to show for refunded orders too**

Currently the document links only show when `order.status === 'completed'` (line 119). Change the condition to also show for `'refunded'` status, and add credit note link.

Replace the document links block (lines 118-141) with:

```typescript
{/* Document links */}
{(['completed', 'refunded'].includes(order.status)) && (() => {
  const links: { href: string; label: string }[] = [];
  if (viewerRole === 'seller' || viewerRole === 'staff') {
    if (order.invoice_number) {
      links.push({ href: `/${locale}/orders/${order.id}/invoice`, label: viewerRole === 'seller' ? 'View invoice' : 'Invoice' });
    }
    if (order.credit_note_number) {
      links.push({ href: `/${locale}/orders/${order.id}/credit-note`, label: viewerRole === 'seller' ? 'View credit note' : 'Credit note' });
    }
  }
  if (viewerRole === 'buyer' || viewerRole === 'staff') {
    links.push({ href: `/${locale}/orders/${order.id}/confirmation`, label: viewerRole === 'buyer' ? 'Order confirmation' : 'Confirmation' });
  }
  return links.length > 0 ? (
    <div className="mt-4 flex flex-wrap gap-3 border-t border-border-subtle pt-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-polar-night"
        >
          <Download className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </div>
  ) : null;
})()}
```

**Step 2: Check `order` type in the component props includes `credit_note_number` and `invoice_number`**

Read the component's interface/props to see if these fields are already passed. If not, add them to the order type and ensure the parent page queries them.

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```
feat: show credit note link in order pricing summary for refunded orders
```

---

### Task 5: Wire Up Dispute Resolution to Post-Completion Refund

**Files:**
- Modify: `packages/marketplace/app/api/orders/[id]/dispute/route.ts` (the PUT handler for staff resolution)

**Step 1: Check how dispute resolution currently handles refund**

Read the PUT handler in the dispute route. When staff sets `dispute_resolution = 'refunded'`, it currently calls `processRefund()`. For completed orders (wallet already credited), it should instead call `processPostCompletionRefund()`.

**Step 2: Add conditional logic**

In the resolution handler, after verifying the order is disputed:

```typescript
if (disputeResolution === 'refunded') {
  if (order.wallet_credited_at) {
    // Post-completion: clawback + credit note
    const result = await processPostCompletionRefund(
      serviceClient, orderId, disputeResolutionNote || 'Dispute resolved in favour of buyer',
      createRefundAdapter(),
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } else {
    // Pre-completion: standard refund
    const result = await processRefund(serviceClient, orderId, createRefundAdapter());
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }
}
```

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```
feat: wire dispute resolution to post-completion refund with credit note
```

---

### Task 6: DB Migration for `credit_note_number` Column

**Files:**
- Create: `packages/marketplace/supabase/migrations/20260309_add_credit_note_number.sql` (if column missing)

**Step 1: Check if column exists**

Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'credit_note_number';`

**Step 2: If missing, create migration and apply**

```sql
ALTER TABLE orders ADD COLUMN credit_note_number TEXT;
```

**Step 3: Regenerate TypeScript types**

Use Supabase MCP `generate_typescript_types` and extract to `database.types.ts`.

**Step 4: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 5: Commit**

```
feat: add credit_note_number column to orders table
```

---

### Task 7: End-to-End Verification

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Test via DB**

Using the test order `4f2108b6-56d1-41ca-bbaa-bb8ab89bd478`:
1. Call `processPostCompletionRefund` via a temporary debug API route
2. Verify: seller wallet debited, buyer wallet credited, order status = refunded
3. Verify: platform_documents has credit_note entry with correct data snapshot
4. Verify: credit note page renders at `/orders/{id}/credit-note`
5. Verify: OrderPricingSummary shows credit note link

**Step 4: Clean up test data and commit**

```
test: verify credit note end-to-end flow
```
