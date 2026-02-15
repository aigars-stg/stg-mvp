# Help & Legal Content — Inconsistencies Between Docs and Code

**Date:** February 15, 2026
**Purpose:** Detailed list of factual inconsistencies between help/legal content and the actual codebase, with exact quotes from both sides.

---

## 1. Seller Fee Model: "No fees" vs. 10% Commission

### In the help content (WRONG):

**File:** `content/help/en/selling.md`, line 16
> **What you will earn:** 100% of your listing price. Buyers pay our fees separately.

**File:** `content/help/en/selling.md`, lines 445-446
> **What fees do I pay?**
> None. Sellers receive 100% of their listing price. Buyers pay our service fee and shipping.

### In the legal/pricing content (CORRECT):

**File:** `content/legal/overview.md`, lines 82-83
> **Sellers pay a 10% commission** on the item price, deducted from earnings.

**File:** `content/legal/fees.md`, lines 36-37
> | Platform commission | **10% of item price** |

**File:** `content/legal/seller-terms.md`, lines 254-255
> **Second Turn Games charges a 10% commission on the item price for each Instant Buy sale.**

### In the code (CORRECT):

**File:** `lib/pricing/constants.ts`, lines 26-28
```typescript
export const SELLER_COMMISSION_RATE = 0.10; // 10%
```

**File:** `lib/services/pricing.ts` — `calculateSellerEarnings()` function
```typescript
// Commission = 10% of item price
// Wallet credit = items - commission
```

### Verdict:
The selling help guide is factually incorrect. Sellers pay a 10% commission. All legal documents and the pricing code confirm this. The help guide's claim of "100% / no fees" is a holdover from an earlier model or a drafting error.

---

## 2. Payment Provider: Stripe vs. EveryPay

### In the help content (WRONG):

**File:** `content/help/en/selling.md`, line 29
> | Bank account (Stripe) | Not required | Required |

**File:** `content/help/en/selling.md`, lines 212-218
> If you have not set up Stripe yet, you will see an "Upgrade to Instant Buy" prompt. The setup takes about 5 minutes:
> 1. Click "Set Up Payouts"
> 2. Complete Stripe's verification (ID, address, bank account)
> 3. Return to Second Turn Games
> 4. You are ready to list Instant Buy items

**File:** `content/help/en/selling.md`, line 231
> Stripe setup complete (if Instant Buy)

**File:** `content/help/en/selling.md`, line 415
> Payout Settings | Auto-payout threshold, Stripe dashboard link

### In the legal content and code (CORRECT):

**File:** `content/legal/privacy.md`, lines 142-151
> ### EveryPay (Payment Processing)
> | **Purpose** | Payment processing (card payments and bank links) |
> | **Data Location** | EU (Estonia) |

**File:** `content/legal/seller-terms.md`, lines 93-95 (actual onboarding flow)
> 1. **Age Confirmation** — You must be at least 18 years old
> 2. **Identity Information** — Providing your legal name, date of birth, and address
> 3. **Bank Account Setup** — Providing your IBAN for withdrawals (collected at first withdrawal request)

**File:** `lib/services/checkout.ts` — uses EveryPay API for payment processing

**File:** `messages/en.json` — `Help.faq.q3.answer`
> "All payments are processed securely through EveryPay (Swedbank)..."

### Verdict:
The selling guide references Stripe Connect Express, but the platform uses EveryPay (Swedbank) for payment processing and a custom wallet/IBAN system for seller payouts. Stripe is not used anywhere in the codebase.

---

## 3. Auto-Payout Threshold System vs. Manual Withdrawal

### In the help content (WRONG):

**File:** `content/help/en/selling.md`, line 307
> Payouts happen automatically when your balance reaches your threshold (default €20), or you can request a payout anytime from your dashboard.

**File:** `content/help/en/selling.md`, lines 473-480
> ### Payout Thresholds
> | Setting | Value |
> | Auto-payout default | €20 |
> | Auto-payout options | €10, €20, €50, €100 |
> | Minimum manual payout | €5 |
> | Payout fee | Free |

### In the legal content and code (CORRECT):

**File:** `content/legal/fees.md`, lines 136-142
> | Minimum withdrawal | €5.00 |
> | Withdrawal fee | **Free** |
> | Processing time | 1-3 business days |
> | Method | IBAN bank transfer |

**File:** `content/legal/seller-terms.md`, lines 358-362
> You can request a withdrawal from your wallet at any time:
> - **Processing time**: 1-3 business days to reach your bank account
> - **Minimum withdrawal**: €5.00
> - **No fees** — you receive the full amount

**File:** `lib/services/withdrawal.ts`
The withdrawal service implements a manual request flow: sellers create a withdrawal request, staff processes it manually. There is no auto-payout feature.

### Verdict:
The selling guide describes an auto-payout threshold system that does not exist. The actual system is seller-initiated manual withdrawal with staff processing. The legal documents correctly describe the manual withdrawal flow.

---

## 4. Condition Grade Count: Four Grades vs. Five Grades

### In the grading guide (4 grades):

**File:** `content/help/en/grading-guide.md`, lines 11-12
> We use four grades: **Like New**, **Very Good**, **Good**, and **Acceptable**.

The entire grading guide describes exactly these four grades with detailed criteria for each.

### In the buyer guide (5 grades):

**File:** `content/legal/buyer-guide.md`, line 102
> | **Condition rating** | New, Like New, Very Good, Good, or Acceptable |

### In the seller agreement (5 grades):

**File:** `content/legal/seller-terms.md`, lines 233-239
> | **New** | Sealed, never opened |
> | **Like New** | Opened but unplayed or played once... |
> | **Very Good** | Light use... |
> | **Good** | Regular use... |
> | **Acceptable** | Heavy use... |

### Verdict:
The grading guide (help centre) defines four grades. The seller agreement and buyer guide include a fifth grade "New" (sealed, never opened). This is a content inconsistency. The canonical grade system needs to be decided and applied consistently.

---

## 5. Shipping Network Mention: Unisend-Only vs. All Three

### In the pricing page (INCOMPLETE):

**File:** `content/legal/pricing.md`, line 64
> Flat-rate shipping via Unisend parcel terminals to any location in the Baltics

### In other docs (COMPLETE):

**File:** `content/help/en/shipping.md`, lines 22-28
> | **Unisend** | Latvia, Lithuania, Estonia |
> | **Latvijas Pasts** | Latvia |
> | **uDrop** | Latvia, Lithuania, Estonia |

**File:** `content/legal/terms.md`, line 188
> All orders are shipped via parcel terminals (Unisend, Latvijas Pasts, uDrop)

**File:** `content/legal/fees.md`, line 113
> Terminal-to-terminal delivery (Unisend, Latvijas Pasts, or uDrop)

**File:** `content/legal/seller-terms.md`, lines 314-318
> - **Unisend** terminals
> - **Latvijas Pasts** terminals
> - **uDrop** terminals

### Verdict:
The pricing page only mentions Unisend. All other documents consistently list all three networks. The pricing page should be updated for consistency.

---

## 6. Internal Link Format: Query Params vs. Path-Based

### Links using query param format (CORRECT for the routing system):

**File:** `content/help/en/overview.md`
> - **[How to Sell](/help?section=selling)**
> - **[Condition Grading](/help?section=grading)**
> - **[Shipping](/help?section=shipping)**

**File:** `content/help/en/selling.md`, line 95
> See also: [Condition Grading Guide](/help?section=grading)

### Links using path format (BROKEN — will 404):

**File:** `content/help/en/selling.md`, line 297
> See also: [Shipping Guide](/help/shipping)

**File:** `content/help/en/selling.md`, line 402
> See our [Shipping Guide](/help/shipping)

**File:** `content/help/en/shipping.md`, line 341
> - [Condition Grading Guide](/help?section=grading) ← CORRECT
> - [Selling Guide](/help/selling) ← BROKEN
> - [DAC7 Tax Reporting](/help/dac7) ← BROKEN

### How the routing works:

**File:** `app/[locale]/help/page.tsx`
The help page uses `useSearchParams().get('section')` to determine which document to display. The route is `/help?section=selling`, not `/help/selling`.

**File:** `components/help/help-sections.ts`
```typescript
{ id: 'selling', label: 'How to Sell', href: '/help?section=selling' },
```

### Verdict:
Path-based links like `/help/selling` will not load the correct help section. The routing system expects query params. Three links in the shipping guide and two in the selling guide use the wrong format.

---

## 7. Seller Earnings Description: "100%" vs. "90%"

### In the selling guide FAQ (WRONG):

**File:** `messages/en.json` — `Help.faq.q2.answer`
> "...sellers receive 90% of the sale price directly to their wallet"

This is correct in the FAQ.

**File:** `content/help/en/selling.md`, line 16
> **What you will earn:** 100% of your listing price.

This contradicts the FAQ.

### In the legal overview (CORRECT):

**File:** `content/legal/overview.md`, lines 82-94
> **Sellers pay a 10% commission** on the item price, deducted from earnings.
> **Seller receives** | **€18.00**

### Verdict:
The selling guide headline claim of "100%" contradicts both the FAQ (which correctly says 90%) and the legal docs. This inconsistency exists within the help system itself.

---

## 8. Contact Email for Seller Reports: info@ vs. safety@

### In the seller agreement:

**File:** `content/legal/seller-terms.md`, line 460
> Or contact us at **info@secondturn.games**

### In the terms of service:

**File:** `content/legal/terms.md`, line 229
> Or contact us at **safety@secondturn.games**

### Verdict:
The seller agreement directs fraud/abuse reports to `info@`, while the Terms of Service directs them to `safety@`. The Terms also mentions `dsa@secondturn.games` for content reporting. The seller agreement should use `safety@` for fraud/abuse reports to be consistent.

---

## 9. Fee Change Advance Notice: 30 Days vs. Unspecified

### In the fees page (specific):

**File:** `content/legal/fees.md`, lines 192
> We will announce changes **at least 30 days** in advance

### In the Terms of Service (vague):

**File:** `content/legal/terms.md`, line 176
> We may update our fees from time to time. Changes will be announced on the platform.

### In the Seller Agreement (vague):

**File:** `content/legal/seller-terms.md`, line 261
> We reserve the right to adjust the commission rate in the future. Any such changes will be announced in advance

### Verdict:
The fees page promises 30 days, but the binding legal documents do not specify a timeframe. If the platform intends to give 30 days' notice, this should be in the Terms/Seller Agreement. If not, the fees page overpromises.

---

## Summary

| # | Inconsistency | Severity | Files Affected |
|---|---------------|----------|----------------|
| 1 | Seller fee: "no fees" vs. 10% commission | Critical | selling.md, overview.md, fees.md, constants.ts |
| 2 | Payment provider: Stripe vs. EveryPay | Critical | selling.md, privacy.md, en.json |
| 3 | Auto-payout vs. manual withdrawal | Critical | selling.md, fees.md, withdrawal.ts |
| 4 | Condition grades: 4 vs. 5 | Critical | grading-guide.md, buyer-guide.md, seller-terms.md |
| 5 | Shipping networks: Unisend-only vs. all three | Important | pricing.md, shipping.md, terms.md |
| 6 | Link format: query params vs. path-based | Important | selling.md, shipping.md, help-sections.ts |
| 7 | Seller earnings: "100%" vs. "90%" | Important | selling.md, en.json, overview.md |
| 8 | Report email: info@ vs. safety@ | Minor | seller-terms.md, terms.md |
| 9 | Fee change notice: 30 days vs. unspecified | Minor | fees.md, terms.md, seller-terms.md |

---

*Review conducted February 15, 2026.*
