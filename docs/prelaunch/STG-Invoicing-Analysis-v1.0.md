# STG Invoicing & Document Obligations Analysis

**Version:** 1.0
**Date:** 9 March 2026
**Scope:** Minimum required document package for Q2 2026 launch
**Status:** Analysis complete — awaiting business decisions before PRD

---

## Executive summary

STG currently generates **zero formal documents** for its transactions. The codebase has strong financial data foundations (per-order VAT columns, commission tracking, wallet ledger) but no document rendering, no sequential numbering, and no downloadable records for users. Additionally, **VAT calculation bugs** were discovered: both commission and shipping VAT are being calculated at the buyer's destination country rate instead of the seller's country rate, and the Estonian rate is stale.

**Critical accounting insight:** Under the commercial agent model, shipping is a logistics management service from STG to the seller — not a service to the buyer. The buyer funds it at checkout, but the VAT invoice goes to the seller. Both commission and shipping must appear on a single platform services invoice to the seller. Without this, shipping revenue in STG's bank account is unidentified income.

**Four documents are needed for launch**, in priority order:

1. **Platform services invoice to seller** (rēķins) — covers both commission and shipping management; STG's legally required tax document
2. **Buyer order confirmation** — commercial document, not a tax document
3. **Payout statement to seller** — supporting document for SEPA transfers
4. **Credit note** — issued when refunding a completed order

**Two VAT bugs must be fixed before launch (launch blockers):**

- Both commission and shipping VAT use the buyer's destination country — they should both use the seller's/sender's country (Article 46 for commission, Article 50 for shipping). With all three countries live from day one, this would produce incorrect VAT on every cross-border order.
- Estonia VAT rate is `0.22` in the codebase but increased to `0.24` (24%) on 1 July 2025. Every Estonian seller's transactions would understate VAT by 2 percentage points.

---

## Part 1: Current state — what exists and what's missing

### What's already built

**Per-order VAT tracking columns** — Every order stores:
- `commission_net_cents`, `commission_vat_cents`, `commission_vat_rate`
- `shipping_net_cents`, `shipping_vat_cents`, `shipping_vat_rate`
- `sender_country` (seller), `destination_country` (buyer)
- `platform_commission_cents`, `seller_wallet_credit_cents`

**OSS-ready VAT rate structure** — `pricing.ts` has a `VAT_RATES` lookup by country. However, the Estonian rate is **wrong**: the code has `EE: 0.22` but Estonia increased to **24%** on 1 July 2025 (permanently). See Part 2 for details.

**DAC7 infrastructure** — Seller tax info collection with TIN validation per country, compliance status tracking, DAC7 warning banners in seller dashboard, staff CSV export endpoint. Data fields match DAC7 reporting requirements.

**Bookkeeping utilities** — Staff dashboard has a bookkeeping CSV export with per-order commission and shipping VAT breakdown. Date range presets for period filtering.

**Email notifications** — 13 email templates covering the full order lifecycle: confirmation, acceptance, shipping, delivery, disputes, refunds. None contain VAT breakdowns.

**Seller dashboard** — Three tabs (orders, earnings, reviews). Orders tab shows individual order details with `OrderPricingSummary` component displaying items, commission deduction, and net earnings. Wallet transaction history and withdrawal history exist. No downloadable documents.

### What's missing

| Gap | Impact | Effort |
|-----|--------|--------|
| No platform services invoice to seller | Legal non-compliance for VAT-registered SIA; shipping revenue unaccounted | Medium |
| No buyer order confirmation document | No formal purchase record for buyers | Low |
| No payout statement | Seller has no record linking SEPA transfer to orders | Low |
| No credit notes | No formal reversal document when refunding | Low |
| No sequential document numbering | Required by PVN likums Article 129 | Low |
| No VAT breakdown on shipping for buyer | Buyer can't see VAT on STG's shipping service | Low |
| Estonia VAT rate stale (22% → 24%) | All EE transactions would understate VAT by 2pp | Trivial |
| Commission AND shipping VAT use wrong country | Financial data is incorrect for cross-border orders | Low — same fix for both (swap destinationCountry → senderCountry) |

---

## Part 2: VAT calculation bugs — two issues found

### Bug 1: Estonia VAT rate is 22% instead of 24%

`pricing.ts` line 165 has:

```typescript
EE: 0.22,
```

Estonia's standard VAT rate increased from 22% to **24% on 1 July 2025** (permanently — the planned 2028 reversion was repealed). Every transaction involving an Estonian seller would understate VAT by 2 percentage points on both commission and shipping.

**Fix:** Change to `EE: 0.24` in `pricing.ts` and update all test expectations in `pricing.test.ts` (7 references to `0.22`).

**Urgency:** Trivial code change, must land before any real transactions.

### Bug 2: Both commission and shipping VAT use the wrong country

`calculateOrderPricingWithVat()` in `pricing.ts` (line 204–213) accepts a single `destinationCountry` parameter and applies that VAT rate to **both** commission and shipping:

```typescript
// Current (incorrect)
const vatRate = getVatRate(destinationCountry);
const commissionVat = calculateVatSplit(base.commissionCents, vatRate);  // ← Wrong: uses buyer's country
const shippingVat = calculateVatSplit(shippingCostCents, vatRate);       // ← Wrong: uses buyer's country
```

### The correct rules

| Revenue line | Legal basis | VAT rate determined by |
|---|---|---|
| **Platform commission (10%)** | Article 46 — intermediary B2C: taxed where the underlying transaction is supplied | **Seller's country** |
| **Shipping fee** | Article 50 (cross-border) / Article 45 (domestic) — B2C transport taxed at place of departure; for domestic legs, supplier's establishment applies; both resolve to sender's country | **Sender's country (= seller's country)** |

Both revenue lines resolve to the **seller's/sender's country** — but for different legal reasons. Commission follows the intermediary rule (service supplied where the goods transaction occurs, i.e., where the seller is). Shipping follows the transport rule (place of departure, i.e., where the parcel enters the logistics network).

### Full VAT rate matrix by route

| Route | Commission VAT | Shipping VAT | Reported via |
|---|---|---|---|
| LV→LV | 21% | 21% | Standard LV return |
| LV→LT | 21% | 21% | Standard LV return |
| LV→EE | 21% | 21% | Standard LV return |
| LT→LV | 21% | 21% | OSS (LT) |
| LT→LT | 21% | 21% | OSS (LT) |
| LT→EE | 21% | 21% | OSS (LT) |
| EE→LV | 24% | 24% | OSS (EE) |
| EE→EE | 24% | 24% | OSS (EE) |
| EE→LT | 24% | 24% | OSS (EE) |

**Key insight:** For any given order, commission and shipping always carry the same VAT rate. The rate is determined entirely by where the seller is located. This simplifies implementation significantly — a single `getVatRate(senderCountry)` call covers both.

**OSS reporting note:** When the seller is in Latvia, all VAT (commission + shipping) goes on STG's standard Latvian VAT return — not OSS. OSS is only used when the place of supply is outside Latvia (i.e., LT or EE sellers). Since STG is launching in all three countries simultaneously, OSS reporting is needed from day one.

### Why the current code is wrong

The code currently derives VAT from `destinationCountry` (buyer). For cross-border transactions this produces incorrect results:

- LV seller → EE buyer: Code applies 24% (EE). Correct rate is 21% (LV) for both lines.
- EE seller → LV buyer: Code applies 21% (LV). Correct rate is 24% (EE) for both lines.

Since STG is launching in all three Baltic countries simultaneously in Q2 2026, cross-border transactions (e.g., LV seller → EE buyer, EE seller → LV buyer) will occur from day one. **This is a launch blocker.**

### Required changes

**`pricing.ts`** — `calculateOrderPricingWithVat()` should use `senderCountry` (not `destinationCountry`) for both commission and shipping VAT:

```typescript
// Corrected
export function calculateOrderPricingWithVat(
  itemsTotalCents: number,
  shippingCostCents: number,
  senderCountry: string | null | undefined  // Seller's country — determines VAT for both lines
): OrderPricing & OrderVat {
  const base = calculateOrderPricing(itemsTotalCents, shippingCostCents);
  const vatRate = getVatRate(senderCountry);
  const commissionVat = calculateVatSplit(base.commissionCents, vatRate);
  const shippingVat = calculateVatSplit(shippingCostCents, vatRate);
  return { ...base, commissionVat, shippingVat };
}
```

The function signature barely changes — it still takes a single country parameter. But the semantics flip from "buyer destination" to "seller/sender origin." All call sites in `checkout.ts` must pass `input.senderCountry` instead of `input.destinationCountry`.

**`checkout.ts`** — Change all calls from `input.destinationCountry` to `input.senderCountry`. The `senderCountry` field already exists in `CheckoutInput` and is populated from the seller's country in the checkout API route.

**`bookkeeping-utils.ts`** — Currently hardcodes `LATVIA_VAT_RATE = 0.21` for everything. Must use per-order stored VAT columns (`commission_vat_cents`, `shipping_vat_cents`) instead of recalculating. The per-order columns are the source of truth.

**Data migration** — For any pre-launch test orders where `sender_country` ≠ `destination_country`, recalculate VAT columns. If all test data is LV→LV, no migration needed.

---

## Part 3: The four required documents

### Document 1: Platform services invoice to seller

**Legal basis:** PVN likums Articles 125–127. STG provides two services to the seller: marketplace intermediation (commission) and logistics management (shipping). Both must be invoiced to the seller as a single VAT document.

**Why shipping is invoiced to the seller, not the buyer:** Even though the buyer pays for shipping at checkout, from a tax and accounting perspective, STG is providing a logistics management service to the seller — STG contracts Unisend on the seller's behalf and handles the entire shipping workflow. Without invoicing the seller for the shipping fee, that money would sit in STG's bank account as unidentified income. By invoicing the seller for both commission and shipping, all platform revenue is properly documented and VAT is correctly accounted for via OSS.

**Tax point (when to generate):** At **order completion** — when `credit_seller_wallet` RPC fires (delivery confirmed + inspection period passed, or auto-completion). This is when both services (intermediation + logistics) are fully rendered.

**Why not at payment:** At payment time, neither service is complete. The seller hasn't shipped yet, the order could be cancelled, and no commission or shipping fee would be earned.

**Why not at payout:** A payout may bundle multiple completed orders. Each order needs its own invoice. Payouts are settlement events, not service events.

**Content — simplified VAT invoice (Article 126, applicable when total under €150 ex-VAT):**

| Field | Source | Example |
|---|---|---|
| Document title | Static | "Platform services invoice" / "Platformas pakalpojumu rēķins" |
| Sequential number | Generated | `COM-2026-00001` |
| Issue date | `wallet_credited_at` on order | 2026-05-15 |
| Supplier: STG name | Static | Second Turn Games SIA |
| Supplier: Reg. number | Static | 50203665371 |
| Supplier: VAT number | Static | LV50203665371 |
| Supplier: Address | Static | [STG registered address] |
| Recipient: Seller name | `user_profiles.full_name` | Jānis Bērziņš |
| Order reference | `orders.order_number` | ORD-2026-001234 |
| **Line 1: Marketplace commission** | | |
| Description | Static | Marketplace intermediation (10% of item price) |
| Gross amount | `platform_commission_cents / 100` | €5.00 |
| Net amount | `commission_net_cents / 100` | €4.13 |
| **Line 2: Shipping management** | | |
| Description | Static | Logistics management (Unisend terminal-to-terminal) |
| Gross amount | `shipping_cost` (in euros, from order) | €1.90 |
| Net amount | `shipping_net_cents / 100` | €1.57 |
| **VAT summary** | | |
| VAT rate | From `sender_country` (seller's country) | 21% |
| Total VAT | `commission_vat_cents + shipping_vat_cents` / 100 | €1.20 |
| **Invoice total (gross)** | Commission gross + shipping gross | **€6.90** |
| | | |
| *Informational line (not part of invoice):* | | |
| Total collected from buyer | `orders.total_amount` | €51.90 |
| Platform services deducted | Invoice total above | −€6.90 |
| **Credited to your wallet** | `seller_wallet_credit_cents / 100` | **€45.00** |

**Key point:** Both line items carry the **same VAT rate** (seller's country rate). Commission follows Article 46, shipping follows Article 50/45 — but both resolve to the seller's country. A single VAT rate per invoice simplifies both generation and OSS reporting.

**Seller payout math is unchanged:** `walletCreditCents = itemsTotalCents - commissionCents` (currently line 74 of `pricing.ts`). The buyer's shipping payment passes through STG and is deducted as the shipping management fee — the net effect is identical. No changes to the pricing service payout calculation are needed.

### Document 2: Buyer order confirmation

**Legal basis:** Not a VAT invoice. Commercial confirmation document. Qualifies as a supporting document (attaisnojuma dokuments) under Grāmatvedības likums Article 11(5).

**When to generate:** At **successful payment** (immediately after EveryPay callback or wallet-only checkout completes). This is the buyer's purchase receipt.

**Important reframe:** Under the commercial agent model, the buyer's entire payment (items + shipping) is collected by STG on behalf of the seller. The buyer does not have a direct VAT relationship with STG for either the goods or the shipping. The platform services invoice (with VAT) goes to the seller, not the buyer. The buyer's document is a payment confirmation, not a tax document.

**Content:**

| Field | Source | Example |
|---|---|---|
| Document title | Static | "Order confirmation" / "Pasūtījuma apstiprinājums" |
| Order number | `orders.order_number` | ORD-2026-001234 |
| Date | `orders.paid_at` | 2026-05-12 |
| Platform | Static | Second Turn Games SIA, reg. 50203665371, VAT LV50203665371 |
| Seller name | `user_profiles.full_name` (seller) | Jānis Bērziņš |
| Items | `order_items` joined | Catan (4th Edition) — Very Good — €50.00 |
| Items subtotal | `orders.items_total` | €50.00 |
| Shipping | `orders.shipping_cost` | €1.90 |
| **Total paid** | `orders.total_amount` | **€51.90** |
| Payment method | `orders.payment_method` | Card (EveryPay) |
| Wallet applied | `orders.buyer_wallet_debit_cents` | €0.00 |
| Delivery | Terminal name + address | Rīga Akropole, Maskavas iela 257 |

**Note on shipping VAT for buyer:** Since shipping is now formally a service from STG to the seller (not the buyer), the VAT breakdown on shipping belongs on the seller's invoice, not the buyer's confirmation. The buyer's document shows the total shipping amount they paid. If you still want to show the VAT breakdown to the buyer for transparency (as discussed earlier), it can appear as informational text (e.g., "incl. VAT 21%") but it's not a tax obligation toward the buyer.

### Document 3: Payout statement

**Legal basis:** Supporting document under Grāmatvedības likums. Not a tax document.

**When to generate:** At **payout execution** — when the SEPA transfer is initiated from STG's bank account to the seller's IBAN.

**Content:**

| Field | Source | Example |
|---|---|---|
| Document title | Static | "Payout statement" / "Izmaksas pārskats" |
| Statement number | Generated | `PO-2026-00001` |
| Date | Withdrawal `processed_at` | 2026-05-20 |
| Recipient | Seller name + IBAN (masked) | Jānis Bērziņš, LV***1234 |
| Completed orders included | List of orders credited since last payout | ORD-2026-001234: €45.00, ORD-2026-001267: €18.00 |
| Total commissions deducted | Sum of commissions | €7.00 |
| Platform services invoices referenced | List of invoice numbers | COM-2026-00001, COM-2026-00003 |
| **Net payout amount** | Withdrawal amount | **€63.00** |
| SEPA reference | Transfer reference | STG-PO-2026-00001 |

### Document 4: Credit note

**Legal basis:** PVN likums Article 131. Required when correcting a previously issued VAT invoice.

**When to generate:** When an order is **refunded after completion** (after the platform services invoice was already issued). If the order is cancelled before completion (before the invoice), no credit note is needed because no invoice existed.

**Content:** References the original platform services invoice number, shows the negative amounts for both commission and shipping lines, uses its own sequential numbering series (`CN-2026-00001`).

---

## Part 4: Shipping — are we handling it correctly?

### Current state: revenue flow is correct, VAT country is wrong

The shipping fee flows correctly in the codebase in terms of money:

- **Buyer pays:** items + shipping → EveryPay/wallet (collected by STG on behalf of seller)
- **Seller receives:** items − 10% commission → wallet
- **STG keeps:** 10% commission + shipping fee (invoiced to seller as platform services)

**Accounting reframe:** The shipping fee is not "buyer-facing STG revenue" — it's a logistics management service from STG to the seller. STG arranges Unisend transport on the seller's behalf. The buyer funds it at checkout, but the VAT invoice for shipping goes to the seller alongside the commission. Without this invoice, the shipping money in STG's bank account would be unidentified income.

Shipping prices are route-based from the `SHIPPING_PRICES` matrix (LV→LV: €1.90, LV→LT: €2.10, LV→EE: €2.10, etc.), not a flat €2 anymore. Each order stores the actual shipping cost charged.

### VAT on shipping: Article 50 for cross-border, Article 45 for domestic — both resolve to seller's country

The legal basis depends on whether the shipment is cross-border or domestic:

- **Cross-border (intra-Community) routes** (e.g., LT→EE, EE→LV): **Article 50** applies. B2C intra-Community transport of goods is taxed at the place of departure — the place where the physical transport begins. The parcel departs from the seller's terminal, so the seller's country determines the VAT rate. This is a mandatory exception that overrides the general B2C rule; Lithuanian tax authorities would view applying Latvian VAT to transport departing from Lithuania as misattribution of their tax revenue.

- **Domestic routes** (e.g., LV→LV, EE→EE): **Article 45** (general B2C rule) applies — the place of supply is where the supplier is established. For domestic routes, the seller's country and the departure/destination country are the same, so the result is identical.

- **Latvian-origin cross-border routes** (LV→LT, LV→EE): Both Article 50 (departure = Latvia) and Article 45 (STG established in Latvia) point to Latvia. This is a "safe harbor" — the rate is 21% under either interpretation.

The practical implementation is the same for all cases: `shipping_vat_rate = getVatRate(senderCountry)`. The legal basis differs by route type, but the system logic is a single rule.

The current code applies `destinationCountry` (buyer) to shipping VAT. This is wrong. The fix is the same as for commission — use `senderCountry` instead. See Part 2 for the full route matrix.

**Deemed supplier caveat:** If STG ever pivots from the "commercial agent" model to a "deemed supplier" model (where STG is treated as selling the game itself), the shipping becomes ancillary to the goods supply and shifts to the buyer's destination under distance sales rules. This does not apply to the current commercial agent model.

**Practical consequence:** The shipping VAT rate is always the seller's country rate regardless of where the buyer is. A Latvian seller shipping to Estonia charges 21% shipping VAT, not 24%. An Estonian seller shipping to Latvia charges 24%, not 21%. The `destination_country` only matters for determining the Unisend route price, not the VAT rate.

**OSS reporting for shipping:** Shipping from Latvia is reported on STG's standard Latvian VAT return, not OSS — even when the parcel goes to Lithuania or Estonia. Shipping from LT or EE sellers goes through OSS. Since all three countries are live from launch, OSS reporting is needed immediately.

### What needs adding

The shipping VAT breakdown now belongs on the **seller's platform services invoice** (as Line 2), not on the buyer's order confirmation. The buyer's document simply shows total shipping paid. The `OrderPricingSummary` component for the seller view should surface both commission and shipping as separate deductions with VAT.

The existing per-order columns (`shipping_net_cents`, `shipping_vat_cents`, `shipping_vat_rate`) provide all the data needed for the seller's invoice — they just need to be displayed alongside the commission columns on the same document.

---

## Part 5: Sequential numbering design

### Numbering series

| Document type | Prefix | Format | Example |
|---|---|---|---|
| Platform services invoice | `COM` | `COM-YYYY-NNNNN` | `COM-2026-00001` |
| Credit note | `CN` | `CN-YYYY-NNNNN` | `CN-2026-00001` |
| Payout statement | `PO` | `PO-YYYY-NNNNN` | `PO-2026-00001` |

Buyer order confirmations use the existing `order_number` (e.g., `ORD-2026-001234`) — no separate numbering series needed.

### Database implementation

A `document_sequences` table or Postgres sequence per series. The platform services invoice number must be generated atomically at the moment `credit_seller_wallet` succeeds, within the same transaction if possible. Race conditions on concurrent order completions are the primary risk.

Recommended approach: Postgres `SEQUENCE` objects per series, per year:

```sql
CREATE SEQUENCE IF NOT EXISTS doc_seq_com_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS doc_seq_cn_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS doc_seq_po_2026 START 1;
```

---

## Part 6: Implementation approach — HTML with print styling

Per the decision to use HTML pages in the dashboard with print styling:

### Buyer side

- **Order detail page** (`/orders/[id]`) — Add a "Download confirmation" or "Print" button that opens a print-styled HTML view of the order confirmation. Can be a separate route like `/orders/[id]/confirmation` with `@media print` styling.
- **Order confirmation email** — Enhance the existing `OrderConfirmationBuyerEmail` template to include STG company details and shipping VAT breakdown. Not a replacement for the dashboard document, but should carry the same information.

### Seller side

- **Order detail page** (seller view, `/seller/orders/[id]` or unified `/orders/[id]`) — Add a "View invoice" link that opens the print-styled HTML platform services invoice. Only available after order completion.
- **Earnings tab** — Add a "Documents" section or column in transaction history linking to platform services invoices and payout statements.
- **Payout detail** — When viewing a withdrawal in `WithdrawalHistory`, add a "View statement" link.

### Staff side

- Staff transaction detail already shows full pricing breakdown. No additional documents needed for staff, but the bookkeeping CSV export should be updated to use per-order VAT columns instead of hardcoded 21%.

---

## Part 7: Interaction with existing PRDs and roadmap

### Dependencies

| Item | Relationship |
|---|---|
| Dispute Engine PRD | Credit notes are only needed when refunding after completion. Dispute resolution triggers refunds. Implement invoicing first (generates invoice at completion), then dispute engine (may trigger credit notes). |
| Flow 4 PRD | Already deferred "buyer receipt with VAT breakdown" to a future PRD. This analysis is that future PRD's foundation. |
| Auto-Payouts PRD | Payout statements attach to withdrawal events. Whether manual or auto-triggered, the statement generation is the same. |
| DAC7 | Platform services invoices provide the per-transaction fee data that DAC7 requires. The DAC7 export should reference invoice numbers for auditability. |

### Pre-launch priority order

1. **Fix Estonia VAT rate** — One-line change from `0.22` to `0.24` plus test updates. Trivial but must not ship wrong.
2. **Fix VAT country bug** — Swap `destinationCountry` → `senderCountry` for both commission and shipping. Launch blocker — cross-border orders will exist from day one across all three countries.
3. **ToS update** — Add "Shipping fees include VAT based on the country of dispatch" before launch.
4. **Platform services invoice to seller** — Legal obligation, sequential numbering, two line items (commission + shipping), generated at order completion.
5. **Buyer order confirmation** — Payment confirmation with total amounts paid.
6. **Payout statement** — Can follow shortly after launch if needed, but better to have from day one.
7. **Credit note** — Only relevant after the dispute engine is implemented and orders can be refunded post-completion.

---

## Part 8: Open questions for accountant/pats.lv

While this analysis covers the technical and legal framework, the following items should be confirmed with your bookkeeper before implementation:

1. **Invoice language:** Should platform services invoices be issued in the seller's locale (LV/LT/ET) or always in Latvian? PVN likums doesn't mandate Latvian for invoices to non-Latvian recipients, and EU VAT Directive allows any EU language. Recommendation: seller's locale with Latvian as fallback.

2. **Invoice retention in Supabase:** Grāmatvedības likums Article 27 requires storage within the EU. Supabase project `ettbijaifahenypkmsts` — confirm the region is EU-based (the compliance docs folder has a `supabase-eu-region-verification.png` which suggests this was already verified).

3. **OSS quarterly reporting format:** Confirm that the per-order VAT columns (commission + shipping, grouped by seller's country) provide sufficient granularity for the OSS quarterly return. Since both commission and shipping VAT follow the seller's country, the OSS return should group by member state of supply (LT or EE) rather than by revenue line type. Latvian-seller transactions go on the standard LV VAT return, not OSS.

4. **Shipping VAT confirmation phrase:** Ask the accountant to confirm: "Since we are reselling transport as a principal B2C service, are we correct to apply Article 50 (Place of Departure) for our Union OSS filings?" This validates the `shipping_vat_rate = seller_country_rate` approach for cross-border legs.

---

## Part 9: Terms of Service update required

The current Terms of Service should be updated before launch to include clear language about how VAT applies to shipping fees. Recommended phrasing:

> Shipping fees include VAT based on the country of dispatch.

This is necessary because the buyer might expect their own country's VAT rate on shipping (destination principle), but the correct legal treatment under Article 50 is the departure country's rate. Making this explicit in the ToS avoids confusion and provides legal cover if a buyer questions why shipping VAT on an Estonian seller's parcel is 24% when the buyer is in Latvia (21% domestic rate).

---

## Summary: minimum launch package

| Document | Trigger | Recipient | Legal status | Sequential # |
|---|---|---|---|---|
| Platform services invoice | Order completion | Seller | VAT invoice (simplified), 2 line items: commission + shipping | `COM-YYYY-NNNNN` |
| Order confirmation | Payment success | Buyer | Commercial document (not a VAT invoice) | Uses `order_number` |
| Payout statement | SEPA transfer | Seller | Supporting document | `PO-YYYY-NNNNN` |
| Credit note | Refund post-completion | Seller | VAT correction (reverses both lines) | `CN-YYYY-NNNNN` |

**Plus two VAT fixes:**

1. Estonia rate: `0.22` → `0.24` in `pricing.ts` (trivial, one line + tests)
2. Swap `destinationCountry` → `senderCountry` in `calculateOrderPricingWithVat()` — both commission and shipping VAT should use the seller's/sender's country (Article 46 + Article 50)

---

*Every game deserves a second turn.*
