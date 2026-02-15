# Help & Legal Content — Suggested Rewrites

**Date:** February 15, 2026
**Purpose:** Specific rewrite suggestions for identified issues, showing original text vs. suggested replacement with rationale.

---

## 1. Selling Guide — Fee/Earnings Section (Critical)

### Location: `content/help/en/selling.md`, line 16

**Original:**
```markdown
**What you will earn:** 100% of your listing price. Buyers pay our fees separately.
```

**Suggested:**
```markdown
**What you will earn:** 90% of your listing price. We deduct a 10% commission — buyers pay no service fee.
```

**Rationale:** Corrects the factual error. The 10% commission is real (per `SELLER_COMMISSION_RATE = 0.10`). The new wording is transparent about the fee while framing it positively — buyers pay no service fee, which is a genuine differentiator.

---

## 2. Selling Guide — FAQ "What fees do I pay?" (Critical)

### Location: `content/help/en/selling.md`, lines 443-448

**Original:**
```markdown
### What fees do I pay?

None. Sellers receive 100% of their listing price. Buyers pay our service fee and shipping.

See also: [Fees](/legal?section=fees)
```

**Suggested:**
```markdown
### What fees do I pay?

A 10% commission is deducted from your listing price for each Instant Buy sale. For a game listed at €25, you receive €22.50. Buyers pay the listed price plus €2 shipping — they pay no service fee.

Contact Seller listings have no platform fees.

See also: [Fees](/legal?section=fees)
```

**Rationale:** Matches the actual fee structure. Includes a concrete example (consistent with the fees page examples). Mentions Contact Seller has no fees, which provides useful context.

---

## 3. Selling Guide — Stripe References (Critical)

### Location: `content/help/en/selling.md`, lines 24-34

**Original:**
```markdown
### What You Need

| Requirement | For Contact Seller | For Instant Buy |
|-------------|-------------------|-----------------|
| Email address | Required | Required |
| Verified email | Required | Required |
| Phone number | Not required | Required |
| Bank account (Stripe) | Not required | Required |

**Contact Seller** listings are quicker to set up — you can start selling immediately and arrange payment directly with buyers.

**Instant Buy** listings offer buyer protection and automatic payments, but require Stripe setup first.
```

**Suggested:**
```markdown
### What You Need

| Requirement | For Contact Seller | For Instant Buy |
|-------------|-------------------|-----------------|
| Email address | Required | Required |
| Verified email | Required | Required |
| Phone number | Not required | Required |
| Identity verification | Not required | Required |
| Bank account (IBAN) | Not required | At first withdrawal |

**Contact Seller** listings are quicker to set up — you can start selling immediately and arrange payment directly with buyers.

**Instant Buy** listings offer buyer protection and automatic payments, but require identity verification first.
```

**Rationale:** Removes Stripe reference. Matches the actual onboarding flow from the seller agreement: identity verification is required upfront, IBAN is collected at first withdrawal.

---

### Location: `content/help/en/selling.md`, lines 210-218 (Setting Up Instant Buy)

**Original:**
```markdown
### Setting Up Instant Buy

If you have not set up Stripe yet, you will see an "Upgrade to Instant Buy" prompt. The setup takes about 5 minutes:

1. Click "Set Up Payouts"
2. Complete Stripe's verification (ID, address, bank account)
3. Return to Second Turn Games
4. You are ready to list Instant Buy items
```

**Suggested:**
```markdown
### Setting Up Instant Buy

If you have not completed seller verification yet, you will see an "Upgrade to Instant Buy" prompt. The setup takes about 5 minutes:

1. Click "Set Up Instant Buy"
2. Confirm your age (18+) and provide your name, date of birth, and address
3. Verification is confirmed
4. You are ready to list Instant Buy items

Your bank details (IBAN) will be collected when you request your first withdrawal — not during setup.
```

**Rationale:** Describes the actual verification flow. Adds the helpful note about IBAN timing, which reduces setup friction perception.

---

## 4. Selling Guide — Payout System (Critical)

### Location: `content/help/en/selling.md`, lines 303-309

**Original:**
```markdown
### 5. Get Paid

**2 days after delivery**, the order completes and funds are added to your balance.

Payouts happen automatically when your balance reaches your threshold (default €20), or you can request a payout anytime from your dashboard.

See also: [Fees and Payouts](/legal?section=fees) for payout details
```

**Suggested:**
```markdown
### 5. Get Paid

**2 days after delivery**, the order completes and your earnings (listing price minus 10% commission) are added to your wallet balance.

Withdraw to your bank account at any time from your dashboard — minimum €5, no fees, processed within 1-3 business days.

See also: [Fees and Payouts](/legal?section=fees) for payout details
```

**Rationale:** Removes the non-existent auto-payout system. Correctly describes the manual withdrawal process. Adds the commission mention for consistency.

---

### Location: `content/help/en/selling.md`, lines 471-480

**Original:**
```markdown
### Payout Thresholds

| Setting | Value |
|---------|-------|
| Auto-payout default | €20 |
| Auto-payout options | €10, €20, €50, €100 |
| Minimum manual payout | €5 |
| Payout fee | Free |
```

**Suggested:**
```markdown
### Withdrawals

| Setting | Value |
|---------|-------|
| Minimum withdrawal | €5 |
| Withdrawal fee | Free |
| Processing time | 1-3 business days |
| Method | IBAN bank transfer |
```

**Rationale:** Removes auto-payout references. Matches the fees page and seller agreement exactly.

---

## 5. Selling Guide — Seller Dashboard Section

### Location: `content/help/en/selling.md`, lines 407-416

**Original:**
```markdown
| Section | What Is There |
|---------|--------------|
| **Balance** | Available funds, pending funds, payout button |
| **Earnings Summary** | Total sales, last 30 days, payout history |
| **Orders** | Filter by status, countdown timers for deadlines |
| **Payout Settings** | Auto-payout threshold, Stripe dashboard link |
```

**Suggested:**
```markdown
| Section | What Is There |
|---------|--------------|
| **Balance** | Available funds, pending funds, withdraw button |
| **Earnings Summary** | Total sales, last 30 days, withdrawal history |
| **Orders** | Filter by status, countdown timers for deadlines |
| **Withdrawal Settings** | Bank account (IBAN), withdrawal history |
```

**Rationale:** Removes Stripe reference and auto-payout terminology. Uses "withdrawal" consistently with the legal docs.

---

## 6. Selling Guide — Validation Checks Section

### Location: `content/help/en/selling.md`, lines 226-232

**Original:**
```markdown
### Validation Checks

Before publishing, we verify:
- All required fields completed
- Email verified
- Photos uploaded (if Acceptable condition)
- Stripe setup complete (if Instant Buy)
```

**Suggested:**
```markdown
### Validation Checks

Before publishing, we verify:
- All required fields completed
- Email verified
- Photos uploaded (if Acceptable condition)
- Seller verification complete (if Instant Buy)
```

**Rationale:** Removes Stripe reference.

---

## 7. Buyer Guide — Condition Rating List

### Location: `content/legal/buyer-guide.md`, line 102

**Original:**
```markdown
| **Condition rating** | New, Like New, Very Good, Good, or Acceptable |
```

**Suggested (if "New" is not a valid grade):**
```markdown
| **Condition rating** | Like New, Very Good, Good, or Acceptable |
```

**Suggested (if "New" is a valid grade):**
```markdown
| **Condition rating** | New (sealed), Like New, Very Good, Good, or Acceptable |
```

**Rationale:** Must align with the grading guide. If "New" is valid, it should be added to the grading guide too. If not, remove from buyer guide and seller agreement.

---

## 8. Shipping Guide — Broken Internal Links

### Location: `content/help/en/shipping.md`, lines 341-343

**Original:**
```markdown
## Related Help

- [Condition Grading Guide](/help?section=grading) — How to grade your games accurately
- [Selling Guide](/help/selling) — Complete guide to selling on Second Turn Games
- [DAC7 Tax Reporting](/help/dac7) — Tax reporting thresholds for sellers
```

**Suggested:**
```markdown
## Related Help

- [Condition Grading Guide](/help?section=grading) — How to grade your games accurately
- [Selling Guide](/help?section=selling) — Complete guide to selling on Second Turn Games
- [DAC7 Tax Reporting](/help?section=dac7) — Tax reporting thresholds for sellers
```

**Rationale:** Fixes broken links. The help routing uses query params, not path segments.

---

## 9. Selling Guide — Broken Internal Links

### Location: `content/help/en/selling.md`, line 297

**Original:**
```markdown
See also: [Shipping Guide](/help/shipping) for packing tips and terminal details
```

**Suggested:**
```markdown
See also: [Shipping Guide](/help?section=shipping) for packing tips and terminal details
```

### Location: `content/help/en/selling.md`, line 402

**Original:**
```markdown
- **Use the right size** — See our [Shipping Guide](/help/shipping)
```

**Suggested:**
```markdown
- **Use the right size** — See our [Shipping Guide](/help?section=shipping)
```

**Rationale:** Fixes broken links to use the correct query param routing format.

---

## 10. Pricing Page — Shipping Network Mention

### Location: `content/legal/pricing.md`, line 64

**Original:**
```markdown
Flat-rate shipping via Unisend parcel terminals to any location in the Baltics:
```

**Suggested:**
```markdown
Flat-rate shipping via parcel terminals (Unisend, Latvijas Pasts, uDrop) to any location in the Baltics:
```

**Rationale:** Consistency with all other documents that list all three networks.

---

## 11. Buyer Guide — Duplicate Section Number

### Location: `content/legal/buyer-guide.md`, line 279

**Original:**
```markdown
### 8.4 If Your Parcel Does Not Arrive
```

**Suggested:**
```markdown
### 8.5 If Your Parcel Does Not Arrive
```

**Rationale:** Section 8.4 already exists (Tracking Your Order). This should be 8.5.

---

## 12. Selling Guide — "Used" in Condition Notes Example

### Location: `content/help/en/selling.md`, line 91

**Original:**
```markdown
| "Used" | "Rulebook has coffee stain on cover, rules readable" |
```

**Suggested:**
```markdown
| "Some wear and tear" | "Rulebook has coffee stain on cover, rules readable" |
```

**Rationale:** Brand voice guide says to avoid "used" — prefer "pre-loved" or "previously owned." While this is in a "bad example" column, replacing with an equally vague but on-brand alternative avoids showing the avoided word.

---

## 13. Legal Overview — Opening Line

### Location: `content/legal/overview.md`, line 7

**Original:**
```markdown
We know — not exactly a page-turner. But these documents explain how Second Turn Games works, what we do with your information, and what is expected from everyone in our community.
```

**Suggested:**
```markdown
These documents explain how Second Turn Games works, what we do with your information, and what everyone in our community can expect. We have kept things as clear as we can — and where the legal language gets dense, you will find explanations like this:
```

**Rationale:** Removes the cliché "page-turner" joke. The brand voice guide says humour should support communication, not feel forced. Self-deprecating legal humour is overused. The replacement is still warm and straightforward without the cringe factor.

---

## 14. Seller Agreement — Contact Email for Reporting

### Location: `content/legal/seller-terms.md`, line 460

**Original:**
```markdown
2. Or contact us at **info@secondturn.games**
```

**Suggested:**
```markdown
2. Or contact us at **safety@secondturn.games**
```

**Rationale:** Consistency with the Terms of Service section 6.6, which uses `safety@secondturn.games` for fraud and safety reports.

---

## 15. FAQ q7 — Payment Timing Wording

### Location: `messages/en.json` — `Help.faq.q7.answer`

**Original (paraphrased):**
> You receive 90% of the item price after the buyer confirms delivery (or the 2-day dispute window closes).

**Suggested:**
> You receive 90% of the item price after the order completes — automatically 2 days after delivery, or earlier if the buyer confirms receipt.

**Rationale:** The default flow is auto-completion after 2 days, not buyer confirmation. The original wording implies the buyer must take action. The wallet credit happens when the order moves to "completed" status, which is automatic.

---

## 16. PlainTermsBox Component — Hardcoded English

### Location: `components/legal/PlainTermsBox.tsx`, line 11

**Original:**
```tsx
<span>In plain terms</span>
```

**Suggested:**
```tsx
// Use useTranslations hook:
const t = useTranslations('Legal');
// ...
<span>{t('plainTermsLabel')}</span>
```

And add to translation files:
```json
{
  "Legal": {
    "plainTermsLabel": "In plain terms"
  }
}
```

**Rationale:** Makes the component translatable for LV/LT/ET locales. This is one of the most visible strings in the legal hub.

---

## 17. Legal Page — SEO Metadata

### Location: `app/[locale]/legal/page.tsx`, lines 9-13

**Original:**
```typescript
export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Terms of service, privacy policy, seller agreement, and other legal documents for Second Turn Games.',
};
```

**Suggested:**
```typescript
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Legal.page' });
  return {
    title: t('title'),
    description: t('description'),
  };
}
```

**Rationale:** Matches the pattern used by the help page. Enables proper SEO for all four supported locales.

---

## Priority Order for Fixes

| Priority | Rewrites | Est. Effort |
|----------|----------|-------------|
| 1 (Critical) | #1-6: Fix selling guide fee model, Stripe refs, payout system | Medium — mostly text changes in selling.md |
| 2 (Critical) | #7: Resolve condition grade count (4 vs 5) | Low — decide and update 2-3 files |
| 3 (Important) | #8-9: Fix broken internal links | Low — find/replace in 2 files |
| 4 (Important) | #10-11: Pricing page networks, buyer guide numbering | Low — single-line fixes |
| 5 (Minor) | #12-15: Brand voice, email, FAQ wording | Low — small text tweaks |
| 6 (Translation) | #16-17: Hardcoded English in components | Medium — requires translation key additions |

---

*Review conducted February 15, 2026.*
