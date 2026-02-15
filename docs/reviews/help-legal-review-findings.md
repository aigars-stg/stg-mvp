# Help & Legal Content Review — Findings

**Reviewer:** Claude (automated review)
**Date:** February 15, 2026
**Scope:** Help centre content, legal hub content, UI components, route pages, translation files
**Status:** Read-only review — no files modified

---

## Executive Summary

The help and legal content for Second Turn Games is well-written, well-structured, and largely consistent with the codebase and brand voice. The plain-terms boxes are effective and genuinely simplify legal language. The pricing and fee information is correctly documented against the actual constants.

However, this review identified **4 critical issues**, **9 important issues**, **12 minor issues**, and **6 suggestions**. The most significant problems are:

1. **Seller fee model contradiction** — The selling guide tells sellers they receive "100% of your listing price" and pay no fees. This directly contradicts the legal docs, fees page, and actual code, which all implement a 10% seller commission.
2. **Payment provider mismatch** — Help/legal docs reference "EveryPay (Swedbank)" as the payment processor, while the selling guide references "Stripe" for seller onboarding. The codebase uses EveryPay, not Stripe.
3. **Pricing page omits parcel terminal networks** — The pricing.md page only mentions "Unisend parcel terminals" for shipping, while all other docs correctly list all three networks (Unisend, Latvijas Pasts, uDrop).
4. **Buyer guide lists a "New" condition grade** that does not exist in the grading guide or the four-grade system used elsewhere.

---

## Critical Issues

### [Content Accuracy] Selling guide claims sellers pay no fees — contradicts actual 10% commission

**Severity:** Critical
**Location:** `content/help/en/selling.md` (lines 16, 445-446)
**Cross-ref:** `content/legal/fees.md` (line 9), `content/legal/overview.md` (line 82), `lib/pricing/constants.ts` (line 27)

**Current:**
- Line 16: `**What you will earn:** 100% of your listing price. Buyers pay our fees separately.`
- Lines 445-446: `**What fees do I pay?** None. Sellers receive 100% of their listing price. Buyers pay our service fee and shipping.`

**Problem:** This is factually wrong. The actual pricing model charges sellers a 10% commission (`SELLER_COMMISSION_RATE = 0.10`). The legal overview, fees page, seller agreement, and pricing service all correctly state sellers pay 10%. This contradiction could erode trust if sellers discover the commission after listing, and may create legal liability.

**Suggested:** Rewrite to: "**What you will earn:** 90% of your listing price. We deduct a 10% commission — buyers pay no service fee." and FAQ answer to: "A 10% commission is deducted from your listing price for each Instant Buy sale. Buyers pay the listed price plus €2 shipping — no service fee. See [Fees](/legal?section=fees) for details."

---

### [Content Accuracy] Selling guide references Stripe — codebase uses EveryPay

**Severity:** Critical
**Location:** `content/help/en/selling.md` (lines 29, 31, 196-218, 231, 415)
**Cross-ref:** `content/legal/privacy.md` (lines 142-151), `lib/services/checkout.ts`

**Current:** Multiple references to "Stripe" for seller payment setup:
- Line 29: `Bank account (Stripe) | Not required | Required`
- Line 31: `Contact Seller listings are quicker to set up — you can start selling immediately and arrange payment directly with buyers.`
- Lines 212-218: `"Set Up Payouts" → Complete Stripe's verification (ID, address, bank account)`
- Line 231: `Stripe setup complete (if Instant Buy)`
- Line 415: `Payout Settings | Auto-payout threshold, Stripe dashboard link`

**Problem:** The actual payment system is EveryPay (Swedbank) + platform wallet, not Stripe Connect. The privacy policy correctly names EveryPay. The seller verification flow in the seller agreement correctly describes identity verification + IBAN collection. Referencing Stripe is technically wrong and confusing.

**Suggested:** Replace all Stripe references with the actual onboarding flow: identity verification + IBAN for withdrawals. For example, "Set Up Payouts" should describe the identity verification process, not Stripe onboarding.

---

### [Content Accuracy] Selling guide describes auto-payouts and payout thresholds — not how the wallet works

**Severity:** Critical
**Location:** `content/help/en/selling.md` (lines 305-309, 415, 473-480)
**Cross-ref:** `lib/services/wallet.ts`, `lib/services/withdrawal.ts`

**Current:**
- Line 307: `Payouts happen automatically when your balance reaches your threshold (default €20), or you can request a payout anytime from your dashboard.`
- Lines 473-480: Auto-payout thresholds table (€10, €20, €50, €100 options, minimum manual payout €5)

**Problem:** The actual wallet/withdrawal system works differently. The withdrawal service (`withdrawal.ts`) is a manual request flow: sellers request a withdrawal with IBAN, staff processes it manually via bank transfer. There is no auto-payout threshold system in the codebase. The minimum withdrawal is €5 (that part is correct), but the auto-payout feature does not exist.

**Suggested:** Replace with: "Your earnings are credited to your platform wallet. Withdraw to your bank account at any time from your dashboard — minimum €5, no fees, processed within 1-3 business days."

---

### [Cross-Document Consistency] Buyer guide lists five condition grades including "New" — grading guide has four grades

**Severity:** Critical
**Location:** `content/legal/buyer-guide.md` (line 102)
**Cross-ref:** `content/help/en/grading-guide.md` (entire file), `content/legal/seller-terms.md` (lines 233-239)

**Current:** Buyer guide line 102: `**Condition rating** | New, Like New, Very Good, Good, or Acceptable`

**Problem:** The grading guide defines exactly four grades: Like New, Very Good, Good, and Acceptable. There is no "New" grade. However, the seller agreement (section 6.4) also lists "New: Sealed, never opened" as a fifth grade. This creates a three-way inconsistency: the grading guide has 4 grades, the seller terms have 5, and the buyer guide has 5. The codebase should be checked to determine the canonical grade list.

**Suggested:** Decide whether "New" (sealed) is a valid grade. If yes, add it to the grading guide. If no, remove it from the buyer guide and seller agreement.

---

## Important Issues

### [Content Accuracy] Shipping guide references only Latvia for flat rate, but system supports all Baltics

**Severity:** Important
**Location:** `content/legal/pricing.md` (line 64)
**Cross-ref:** `content/help/en/shipping.md` (lines 249-257), `lib/pricing/constants.ts` (line 14)

**Current:** Pricing page line 64: `Flat-rate shipping via Unisend parcel terminals to any location in the Baltics`

**Problem:** Only mentions Unisend. All other docs (shipping guide, fees page, seller agreement, terms) correctly list all three networks: Unisend, Latvijas Pasts, and uDrop. The pricing page should be consistent.

**Suggested:** Change to: "Flat-rate shipping via parcel terminals (Unisend, Latvijas Pasts, uDrop) to any location in the Baltics"

---

### [Content Accuracy] Seller agreement says Instant Buy requires being located in Latvia only

**Severity:** Important
**Location:** `content/legal/seller-terms.md` (lines 64-65)
**Cross-ref:** `content/help/en/shipping.md` (lines 22-28)

**Current:** Line 64-65: `Be located in Latvia (Estonian and Lithuanian sellers coming soon)`

**Problem:** The shipping guide describes three terminal networks covering all three Baltic countries. If sellers in Estonia and Lithuania can actually use the platform for Instant Buy via Unisend/uDrop (which covers all three countries), the seller agreement is outdated. If the restriction is real, the shipping guide needs to clarify this.

**Suggested:** Verify whether Estonian/Lithuanian sellers can currently use Instant Buy. Update either the seller agreement or shipping guide for consistency.

---

### [Cross-Document Consistency] Inconsistent link formats between help sections

**Severity:** Important
**Location:** Multiple help content files
**Cross-ref:** `components/help/help-sections.ts`

**Current:** Links within help content use two different formats:
- Query param style: `/help?section=grading` (used in overview.md, selling.md line 95)
- Path style: `/help/shipping` (used in selling.md line 297, line 402)

**Problem:** The help routing system uses query params (`/help?section=shipping`), not path-based routing (`/help/shipping`). The path-based links will 404 or load the wrong content. Similarly, the shipping guide's "Related Help" section (lines 342-343) uses `/help/selling` and `/help/dac7` which are path-based.

**Suggested:** Standardize all internal help links to use the query param format: `/help?section=selling`, `/help?section=shipping`, `/help?section=dac7`.

---

### [Cross-Document Consistency] DAC7 threshold wording inconsistency — "either" vs. "both"

**Severity:** Important
**Location:** `content/help/en/dac7.md` (lines 31-32), `content/legal/overview.md` (lines 145-149)

**Current:**
- DAC7 help guide (line 31): `We only report your information if you exceed **either** threshold in a calendar year`
- Legal overview (line 145): `EU rules (DAC7) require us to report seller information to tax authorities only if you exceed **either** threshold`
- But the DAC7 help guide section title is "The key word is either" and proceeds to explain it correctly.

**Problem:** While the explanation is eventually correct, the initial phrasing "if you exceed either threshold" is ambiguous. Some readers may interpret "either" as "both." The DAC7 guide itself contradicts by saying (line 14): `have you sold 30+ items? Or earned €2,000+? If BOTH answers are "no", you will not be reported` — this uses "both" correctly for the negative case but the positive case uses "either." The description should be clearer.

**Suggested:** Use phrasing like: "We report your information if you exceed **at least one** of the following thresholds" — this is unambiguous.

---

### [Brand Voice] Selling guide uses "used" in condition notes example

**Severity:** Important
**Location:** `content/help/en/selling.md` (line 91)
**Cross-ref:** `docs/STG-Brand-Voice-Guide.md` (line 251)

**Current:** Line 91: `| "Used" | "Rulebook has coffee stain on cover, rules readable" |`

**Problem:** The brand voice guide explicitly says to avoid "used" — prefer "pre-loved" or "previously owned." While this is in a "what NOT to say" example column, the word still appears prominently. The left column shows bad examples, which is the intent, but using the avoided word even in a negative example still trains users on it.

**Suggested:** Change the vague example to: `| "Some wear and tear" | "Rulebook has coffee stain on cover, rules readable" |`

---

### [Completeness] No buying guide in help centre — only in legal hub

**Severity:** Important
**Location:** `components/help/help-sections.ts`
**Cross-ref:** `content/legal/buyer-guide.md`

**Current:** The help centre has five sections: Overview, How to Sell, Condition Grading, Shipping, DAC7 & Taxes. There is no "How to Buy" guide.

**Problem:** Buyers are an equally important audience. The buyer guide exists only in the legal hub, which is more formal and less discoverable. The help centre should have a buyer-focused guide covering searching, buying, payment, tracking, and dispute resolution.

**Suggested:** Create a `content/help/en/buying.md` guide and add a "How to Buy" section to the help nav. The legal buyer guide can remain for the formal rights/protections content.

---

### [Translation Readiness] Help content exists only in English

**Severity:** Important
**Location:** `content/help/en/` (only locale directory)
**Cross-ref:** `lib/legal.ts` (line 56 — tries locale-based path first)

**Current:** Help content only exists in `content/help/en/`. Legal content exists in `content/legal/` (no locale subdirectory at all). The `lib/legal.ts` loader tries locale-based paths first, then falls back.

**Problem:** The platform supports four languages (EN, LV, LT, ET) but all help and legal content is English-only. For a Baltic marketplace, this is a significant gap. Latvian, Lithuanian, and Estonian users will see English legal documents, which may not meet local consumer protection requirements.

**Suggested:** Create translated versions of at least the critical legal documents (Terms, Privacy Policy) as required by EU consumer protection law. Help content translation can follow as a lower priority.

---

### [Technical/UX] Legal page SEO metadata is hardcoded in English, not using translations

**Severity:** Important
**Location:** `app/[locale]/legal/page.tsx` (lines 9-13)
**Cross-ref:** `app/[locale]/help/page.tsx` (lines 10-20)

**Current:** Legal page uses hardcoded metadata:
```typescript
export const metadata: Metadata = {
  title: 'Legal',
  description: 'Terms of service, privacy policy...',
};
```

**Problem:** Unlike the help page (which uses `getTranslations` for metadata), the legal page hardcodes English strings. This means the page title and description will be in English regardless of locale, which hurts SEO for Latvian/Lithuanian/Estonian users.

**Suggested:** Use `generateMetadata` with `getTranslations` like the help page does.

---

### [Technical/UX] Legal page breadcrumb uses hardcoded "Home" and "Legal" strings

**Severity:** Important
**Location:** `app/[locale]/legal/page.tsx` (lines 61-64)
**Cross-ref:** `app/[locale]/help/page.tsx` (lines 85-88)

**Current:**
```typescript
<BreadcrumbSchema items={[
  { name: 'Home', url: baseUrl },
  { name: 'Legal', url: `${baseUrl}/legal` },
]} />
```

**Problem:** The help page correctly uses translated breadcrumb strings (`t('page.breadcrumbHome')`, `t('page.breadcrumbHelp')`), but the legal page hardcodes English. This is inconsistent and breaks schema.org for non-English locales.

**Suggested:** Add `Legal.page.breadcrumbHome` and `Legal.page.breadcrumbLegal` to translation files and use them.

---

### [Technical/UX] Buyer guide has duplicate section numbering (two sections 8.4)

**Severity:** Important
**Location:** `content/legal/buyer-guide.md` (lines 275, 279)

**Current:** Section 8.4 appears twice:
- Line 275: `### 8.4 Tracking Your Order`
- Line 279: `### 8.4 If Your Parcel Does Not Arrive`

**Problem:** Duplicate section numbers create confusion and may cause anchor link collisions.

**Suggested:** Renumber the second one to `### 8.5 If Your Parcel Does Not Arrive`.

---

## Minor Issues

### [Brand Voice] Help nav labels are hardcoded in English in components

**Severity:** Minor
**Location:** `components/help/help-sections.ts`, `components/legal/legal-sections.ts`

**Current:** Section labels like "Help Centre", "How to Sell", "Terms of Service" are hardcoded English strings in the section definitions.

**Problem:** These labels are rendered directly in the navigation components (`HelpNav.tsx`, `LegalNav.tsx`). When the platform displays in Latvian/Lithuanian/Estonian, the nav labels will still be in English.

**Suggested:** Replace hardcoded labels with translation keys and use `useTranslations` in the nav components to render them.

---

### [Brand Voice] PlainTermsBox header "In plain terms" is hardcoded English

**Severity:** Minor
**Location:** `components/legal/PlainTermsBox.tsx` (line 11)

**Current:** `<span>In plain terms</span>`

**Problem:** This string is not wrapped in a translation call. It will appear in English for all locales.

**Suggested:** Use `useTranslations('Legal')` and a key like `plainTermsLabel`.

---

### [Brand Voice] "Section not found" error messages are hardcoded English

**Severity:** Minor
**Location:** `components/help/HelpHub.tsx` (line 30), `components/legal/LegalHub.tsx` (line 39)

**Current:** `<p>Section not found.</p>`

**Problem:** Not translatable for non-English locales.

**Suggested:** Use translation keys for error states.

---

### [Brand Voice] Listing types page has hardcoded "Instant Buy" and "Contact Seller" in table headers

**Severity:** Minor
**Location:** `app/[locale]/help/listing-types/page.tsx` (lines 89, 94, 127, 143)

**Current:** `Instant Buy` and `Contact Seller` are hardcoded in the JSX, not pulled from translations.

**Problem:** These will remain in English in all locales.

**Suggested:** Use translation keys for these labels.

---

### [Content Accuracy] Help FAQ q3 mentions "EveryPay (Swedbank)" — selling guide references "Stripe"

**Severity:** Minor (duplicate of critical issue, but in translation file)
**Location:** `messages/en.json` — `Help.faq.q3.answer`

**Current:** FAQ answer correctly references EveryPay.

**Problem:** Inconsistency with selling guide which references Stripe. The FAQ is correct; the selling guide is wrong. (Covered in Critical issue #2.)

---

### [Content Accuracy] FAQ q7 says "90% of item price after buyer confirms delivery"

**Severity:** Minor
**Location:** `messages/en.json` — `Help.faq.q7.answer`

**Current:** "You receive 90% of the item price after the buyer confirms delivery (or the 2-day dispute window closes)"

**Problem:** Technically correct but slightly misleading. The buyer does not "confirm" delivery — the order auto-completes 2 days after delivery. Buyer can confirm earlier, but the default is auto-completion.

**Suggested:** "You receive 90% of the item price after the order completes — automatically 2 days after delivery, or earlier if the buyer confirms."

---

### [Cross-Document Consistency] Overview.md references "Evalda Valtera 5-35" but some docs omit apartment number

**Severity:** Minor
**Location:** Various legal documents

**Current:** All legal documents consistently use "Evalda Valtera 5-35, Riga, LV-1021, Latvia" — this is actually consistent. No issue found on closer inspection.

---

### [Cross-Document Consistency] Fee change notice period differs between docs

**Severity:** Minor
**Location:** `content/legal/fees.md` (line 192), `content/legal/seller-terms.md` (line 261), `content/legal/terms.md` (line 176)

**Current:**
- Fees page (line 192): "We will announce changes **at least 30 days** in advance"
- Seller Agreement (line 261): "We will notify you of significant changes via email and/or platform notification" (no specific timeframe)
- Terms of Service (line 176): "Changes will be announced on the platform" (no specific timeframe)

**Problem:** The fees page promises 30 days' advance notice, but the binding legal documents (Terms, Seller Agreement) do not commit to this. Either the fees page is making an unenforceable promise, or the legal docs should include the same commitment.

**Suggested:** Add "at least 30 days in advance" to the seller agreement's fee change clause to match the fees page.

---

### [Completeness] No help content for auction features

**Severity:** Minor
**Location:** `content/help/en/selling.md` (lines 338-357)

**Current:** Auctions are briefly covered in the selling guide (about 20 lines) but there is no dedicated auction help section or FAQ.

**Problem:** Auction mechanics (anti-snipe, bid increments, winner payment window) are complex enough to warrant more detailed help. The selling guide covers it minimally.

**Suggested:** Either expand the auction section in the selling guide or create a dedicated auction FAQ/help section.

---

### [Completeness] No help content for the wallet system

**Severity:** Minor
**Location:** Help centre (all files)

**Current:** The wallet is mentioned in passing (fees page, selling guide, buyer guide) but there is no dedicated "Wallet & Payments" help section explaining how to use the wallet, check balance, withdraw, etc.

**Suggested:** Add a "Wallet & Payments" help section covering wallet balance, using wallet for purchases, withdrawals, and transaction history.

---

### [Completeness] ISO feature documented in selling guide but not in help navigation

**Severity:** Minor
**Location:** `content/help/en/selling.md` (lines 358-374)

**Current:** The ISO (In Search Of) feature is documented in the selling guide but there is no standalone help section or reference in the help navigation for buyers wanting to create ISO listings.

**Suggested:** Consider adding ISO/Wanted documentation as a help section, especially from the buyer perspective.

---

### [Technical/UX] Listing-types page not accessible from help navigation

**Severity:** Minor
**Location:** `app/[locale]/help/listing-types/page.tsx`, `components/help/help-sections.ts`

**Current:** The listing-types page exists at `/help/listing-types` as a dedicated route, but it is not listed in the help navigation sidebar.

**Problem:** Users cannot discover this page from the help centre. It may be linked from elsewhere, but it is disconnected from the help navigation structure.

**Suggested:** Either add it to the help sections navigation or integrate its content into the selling guide.

---

## Suggestions

### [Brand Voice] Consider removing "page-turner" joke from legal overview

**Severity:** Suggestion
**Location:** `content/legal/overview.md` (line 7)

**Current:** `We know — not exactly a page-turner.`

**Problem:** While playful, this is a cliché. The brand voice guide says humor should be like "a wink, not a shout" and should never feel forced. A self-deprecating joke about legal content being boring is overused.

**Suggested:** Try: "These documents explain how Second Turn Games works, what we do with your information, and what everyone in our community can expect."

---

### [Brand Voice] Consider adding plain-terms boxes to more sections

**Severity:** Suggestion
**Location:** `content/legal/terms.md` (sections 9-14)

**Current:** The later sections of the Terms of Service (Prohibited Conduct, IP, Disclaimers, Governing Law, etc.) do not have plain-terms boxes.

**Problem:** These sections contain the most complex legal language but lack the helpful plain-language explanations found in earlier sections.

**Suggested:** Add plain-terms boxes to sections 9 (Prohibited Conduct), 11 (Disclaimers), and 12 (Governing Law) at minimum.

---

### [Content Accuracy] Consider specifying EveryPay by name in Terms of Service

**Severity:** Suggestion
**Location:** `content/legal/terms.md` (lines 41, 179-180)

**Current:** References to "card and bank link payments" and "our payment partner" without naming EveryPay.

**Problem:** While the Privacy Policy correctly names EveryPay, the Terms of Service keeps it anonymous as "our payment partner." For transparency (a core brand value), naming the payment processor in the Terms would be more trustworthy.

**Suggested:** Add "via EveryPay (Swedbank)" after "card and bank link payments" in at least one location.

---

### [Completeness] Consider adding a "Getting Started" or onboarding guide

**Severity:** Suggestion
**Location:** Help centre

**Current:** Help content jumps straight into "How to Sell." There is no general "Getting Started" guide covering account creation, profile setup, and browsing.

**Suggested:** A brief getting-started guide would help new users unfamiliar with the platform.

---

### [Completeness] Consider adding structured data for legal pages

**Severity:** Suggestion
**Location:** `app/[locale]/legal/page.tsx`

**Current:** The help page has FAQPage schema.org JSON-LD, but the legal page has no structured data beyond the breadcrumb.

**Suggested:** Consider adding `WebPage` or `FAQPage` schema.org markup for the legal hub's quick answers section.

---

### [Technical/UX] Consider adding "last updated" date validation

**Severity:** Suggestion
**Location:** All content files

**Current:** Frontmatter `lastUpdated` dates are manually maintained strings. Some say "January 2026", some say "February 2026", some say "November 25, 2025."

**Problem:** The format is inconsistent (some have day, some don't). Dates could become stale if content is updated without changing the frontmatter.

**Suggested:** Consider using ISO date format in frontmatter and formatting for display, or adding a CI check for stale dates.

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | 4 |
| Important | 9 |
| Minor | 12 |
| Suggestion | 6 |
| **Total** | **31** |

---

*Review conducted February 15, 2026.*
