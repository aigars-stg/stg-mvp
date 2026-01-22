# PRD: Seller Onboarding & Listing Types Documentation

**Project:** Second Turn Games
**Feature:** Refined Seller Onboarding + Help Documentation
**Status:** Ready for Implementation
**Date:** January 2026

---

## Overview

This PRD covers two related deliverables:

1. **Refined seller onboarding Step 2** — Improved copy and UX for the listing type selection (Instant Buy vs Contact Seller)
2. **Help article** — Comprehensive documentation explaining both listing types, accessible from seller dashboard and during listing creation

### Goals

- Guide Latvian sellers toward Instant Buy (our revenue-generating option) without being pushy
- Clearly communicate what each option means in practice
- Handle geographic restrictions gracefully (LT/EE sellers only see Contact Seller)
- Provide reference documentation sellers can access anytime

### Non-Goals

- Changing the two-step onboarding flow structure
- Modifying Stripe onboarding process
- Adding new listing type functionality

---

## Context

### Business Model

| Listing Type | Availability | Revenue | Seller Experience |
|--------------|--------------|---------|-------------------|
| **Instant Buy** | Latvia only | 6% + €0.50 buyer fee | Full service: integrated payments, €2 shipping via 500+ Unisend terminals |
| **Contact Seller** | All countries | None (free billboard) | Facebook Marketplace style: buyers message, arrange payment/shipping off-platform |

### Current State

The onboarding flow exists and works. Step 1 collects country selection and terms acceptance. Step 2 presents the listing type choice. The visual hierarchy already favors Instant Buy (highlighted card, "Recommended" badge, primary CTA).

**What needs improvement:**
- Copy is functional but not aligned with brand voice
- Doesn't clearly communicate the value proposition
- No "Learn more" option for sellers who want details
- No help documentation for future reference

---

## Part 1: Seller Onboarding Step 2 Refinement

### Location

`src/app/[locale]/seller/onboard/` (or equivalent seller onboarding route)

### Design Approach

Use "Approach B" framing: Lead with what Instant Buy enables, position Contact Seller as the fallback option.

### Copy Specifications

#### Page Header

**Current:**
```
How would you like to sell?
Choose how you want to connect with buyers.
```

**New:**
```
Sell the easy way
We handle payments and shipping so you don't have to.
```

#### Instant Buy Card (Latvia only)

**Badge:** `Recommended`

**Title:** `Instant Buy`

**Description:**
```
Buyers pay upfront and choose their parcel locker. You confirm the order, drop off the game, and get paid — your full asking price.
```

**Benefits list:**
```
✓ Buyers can purchase immediately
✓ €2 flat-rate shipping via 500+ lockers
✓ Your full asking price, direct to your bank
✓ Buyer protection builds trust
```

**CTA Button:** `Set up payments — 2 min →`

**Help link (below benefits):** `How does Instant Buy work? →` (links to help article)

#### Contact Seller Card

**Title:** `Contact Seller`

**Description:**
```
Buyers message you to work out the details. You handle payment and shipping yourself — like a classified ad.
```

**Details (use subtle/muted text, not checkmarks):**
```
• You arrange payment
• You arrange shipping
• Free to use
```

**CTA Button:** `Start selling` (secondary/outline style)

#### Footer Note

```
You can enable Instant Buy anytime from your seller settings.
```

#### For LT/EE Sellers (No Choice Available)

When country is Lithuania or Estonia, show only Contact Seller with a note about Instant Buy:

**Section header:**
```
You're ready to sell
List your games and connect with buyers across the Baltics.
```

**Contact Seller card:** Same as above

**Instant Buy teaser (greyed out or muted):**
```
Instant Buy — Coming soon to [Estonia/Lithuania]
Integrated payments and shipping are on the way. We'll let you know when they're available.
```

### Translation Keys

Add to `messages/[locale].json` under a new `SellerOnboarding` namespace:

```json
{
  "SellerOnboarding": {
    "step2Title": "Sell the easy way",
    "step2Subtitle": "We handle payments and shipping so you don't have to.",
    "step2TitleNoChoice": "You're ready to sell",
    "step2SubtitleNoChoice": "List your games and connect with buyers across the Baltics.",
    
    "instantBuy": {
      "badge": "Recommended",
      "title": "Instant Buy",
      "description": "Buyers pay upfront and choose their parcel locker. You confirm the order, drop off the game, and get paid — your full asking price.",
      "benefit1": "Buyers can purchase immediately",
      "benefit2": "€2 flat-rate shipping via 500+ lockers",
      "benefit3": "Your full asking price, direct to your bank",
      "benefit4": "Buyer protection builds trust",
      "cta": "Set up payments — 2 min",
      "helpLink": "How does Instant Buy work?",
      "comingSoon": "Instant Buy — Coming soon to {country}",
      "comingSoonDescription": "Integrated payments and shipping are on the way. We'll let you know when they're available."
    },
    
    "contactSeller": {
      "title": "Contact Seller",
      "description": "Buyers message you to work out the details. You handle payment and shipping yourself — like a classified ad.",
      "detail1": "You arrange payment",
      "detail2": "You arrange shipping",
      "detail3": "Free to use",
      "cta": "Start selling"
    },
    
    "upgradeNote": "You can enable Instant Buy anytime from your seller settings."
  }
}
```

**Important:** Provide translations for all four locales (en, lv, lt, et). Follow formality guidelines:
- **English:** Casual, friendly
- **Latvian:** Formal (Kungs/Kundze context)
- **Lithuanian:** Formal, direct
- **Estonian:** Formal (Härra/Proua context)

### Component Structure

```
SellerOnboardingStep2/
├── index.tsx                    # Main step component
├── InstantBuyCard.tsx           # Instant Buy option card
├── ContactSellerCard.tsx        # Contact Seller option card
├── InstantBuyComingSoon.tsx     # Greyed out teaser for LT/EE
└── ListingTypeHelpLink.tsx      # "How does X work?" link component
```

### Conditional Logic

```typescript
// Pseudocode for step 2 rendering
const sellerCountry = getSellerCountry() // from step 1

if (sellerCountry === 'LV') {
  // Show both options with Instant Buy emphasized
  return <FullChoiceView />
} else {
  // Show Contact Seller only with Instant Buy teaser
  return <ContactSellerOnlyView country={sellerCountry} />
}
```

---

## Part 2: Help Article

### Location

Create a new help/documentation page accessible at:
- `/[locale]/help/listing-types` (public URL)
- Linked from seller dashboard under Settings or Help section
- Linked from listing creation flow

### Content Structure

#### Page Title
`Instant Buy vs Contact Seller`

#### Page Subtitle
`Choose how you want to sell your games`

---

#### Section 1: Quick Comparison

**Format:** Two-column comparison table

| | Instant Buy | Contact Seller |
|---|---|---|
| **Best for** | Most sellers in Latvia | Sellers who prefer full control |
| **How buyers pay** | Through Second Turn Games | Directly to you (off-platform) |
| **How shipping works** | €2 flat-rate via Unisend lockers | You arrange with buyer |
| **Your earnings** | 100% of your asking price | Whatever you agree with buyer |
| **Buyer protection** | Yes — we hold payment until delivery | No |
| **Setup required** | Quick Stripe account (2 min) | None |
| **Availability** | Latvia only | Latvia, Lithuania, Estonia |

---

#### Section 2: Instant Buy Explained

**Heading:** `How Instant Buy works`

**Content:**

```
Instant Buy is our full-service selling option. Here's what happens when someone buys your game:

1. **Buyer purchases** — They pay the game price plus a small service fee (6% + €0.50) and €2 shipping. You don't pay anything.

2. **You get notified** — We send you an email and dashboard notification. You have 24 hours to confirm the order.

3. **You ship the game** — After confirming, you'll get a Unisend locker code. Pack your game, go to any of 500+ Unisend terminals (including Latvijas Pasts and uDrop locations), enter the code, and drop it off.

4. **Buyer receives it** — Once the buyer picks up the game, we release your payment.

5. **You get paid** — The full asking price goes to your connected bank account. We keep only the buyer's service fee.

**What if something goes wrong?**

- If you can't ship within 24 hours, you can decline the order. The buyer gets a full refund.
- If the game doesn't match your description, we help resolve the issue and may refund the buyer.
- If the buyer doesn't pick up the package, we'll work with you on next steps.
```

**Subheading:** `Setting up Instant Buy`

```
To use Instant Buy, you'll need to connect a Stripe account. This lets us send payments directly to your bank.

The setup takes about 2 minutes. You'll need:
- Your full name
- Date of birth
- Bank account details (IBAN)

We use Stripe because it's secure and trusted by millions of sellers worldwide. Your financial information goes directly to Stripe — we never see or store your bank details.
```

---

#### Section 3: Contact Seller Explained

**Heading:** `How Contact Seller works`

**Content:**

```
Contact Seller is our simple listing option. It works like a classified ad or Facebook Marketplace:

1. **You list your game** — Add photos, set a price, describe the condition.

2. **Buyers see your listing** — Your game appears in search results alongside Instant Buy listings.

3. **Buyer messages you** — When someone's interested, they send you a message through our platform.

4. **You work out the details** — Agree on price, payment method, and how to get the game to them (meetup, shipping, etc.).

5. **Transaction happens off-platform** — Payment and delivery are between you and the buyer directly.

**Why choose this option?**

- You're not ready to set up Stripe
- You prefer negotiating prices
- You want to arrange your own shipping method
- You're located in Lithuania or Estonia (where Instant Buy isn't available yet)

**The tradeoff:** You'll need to handle payment and shipping yourself, and buyers don't have the same protection they get with Instant Buy.
```

---

#### Section 4: Switching Between Options

**Heading:** `Can I switch later?`

**Content:**

```
**Starting with Contact Seller, upgrading to Instant Buy:**
Yes! If you set up as a Contact Seller, you can enable Instant Buy anytime from your Seller Settings. Just complete the Stripe setup and your future listings will have both options.

**Already have Instant Buy, want to use Contact Seller:**
You can choose the listing type for each game when you create a listing. Even with Instant Buy enabled, you can list specific games as Contact Seller if you prefer.

**Note for Lithuanian and Estonian sellers:**
Instant Buy isn't available in your country yet. We're working on expanding integrated payments and shipping to the full Baltic region. Sign up for updates and we'll let you know when it's ready.
```

---

#### Section 5: FAQ

**Heading:** `Common questions`

**Q: Why do I need to set up Stripe for Instant Buy?**
```
Stripe handles the secure transfer of money from buyers to sellers. It's how we ensure you get paid reliably and how buyers know their payment is protected. Setting up takes 2 minutes and your bank details go directly to Stripe — we never see them.
```

**Q: Who pays the fees?**
```
Buyers pay the service fee (6% + €0.50) and shipping (€2). As a seller, you receive 100% of your asking price. If you list a game for €20, you get €20.
```

**Q: What's included in the 500+ parcel terminals?**
```
Our Unisend integration includes terminals from multiple networks: Unisend's own locations plus Latvijas Pasts and uDrop terminals. You can drop off at whichever is most convenient for you.
```

**Q: Why isn't Instant Buy available in Lithuania and Estonia?**
```
We're working through the logistics of cross-border shipping and VAT handling. It's a priority for us, and we'll announce when it's ready.
```

**Q: Can buyers still contact me if I use Instant Buy?**
```
Yes. Buyers can message you with questions about your listing before purchasing. Instant Buy just means they can also purchase immediately without waiting for a response.
```

---

### Help Article Translation Keys

Add to `messages/[locale].json` under `HelpListingTypes` namespace:

```json
{
  "HelpListingTypes": {
    "pageTitle": "Instant Buy vs Contact Seller",
    "pageSubtitle": "Choose how you want to sell your games",
    
    "comparison": {
      "heading": "Quick comparison",
      "bestFor": "Best for",
      "howBuyersPay": "How buyers pay",
      "howShippingWorks": "How shipping works",
      "yourEarnings": "Your earnings",
      "buyerProtection": "Buyer protection",
      "setupRequired": "Setup required",
      "availability": "Availability"
    },
    
    "instantBuy": {
      "heading": "How Instant Buy works",
      "setupHeading": "Setting up Instant Buy"
      // ... additional keys for all content
    },
    
    "contactSeller": {
      "heading": "How Contact Seller works"
      // ... additional keys
    },
    
    "switching": {
      "heading": "Can I switch later?"
      // ... additional keys
    },
    
    "faq": {
      "heading": "Common questions",
      "q1": "Why do I need to set up Stripe for Instant Buy?",
      "a1": "...",
      // ... additional Q&A pairs
    }
  }
}
```

---

## Part 3: Dashboard Integration

### Link Placement

Add a link to the help article in the following locations:

1. **Seller Dashboard → Settings section**
   - Under payment/selling preferences
   - Label: `Learn about listing types →`

2. **Listing Creation Flow**
   - Near the listing type selector (if shown during listing creation)
   - Label: `What's the difference? →`

3. **Seller Onboarding Step 2**
   - Below the Instant Buy benefits list
   - Label: `How does Instant Buy work? →`

### Implementation Notes

Use the `ListingTypeHelpLink` component consistently across all locations. The link should:
- Open in the same tab (not a modal, not a new tab)
- Include a back button or breadcrumb to return to previous location
- Use the locale-aware route: `/[locale]/help/listing-types`

---

## Acceptance Criteria

### Onboarding Step 2

- [ ] Latvian sellers see both options with Instant Buy visually emphasized
- [ ] LT/EE sellers see only Contact Seller with Instant Buy "coming soon" teaser
- [ ] All copy matches specifications in this PRD
- [ ] Translations exist for all four locales (en, lv, lt, et)
- [ ] "How does Instant Buy work?" link navigates to help article
- [ ] Upgrade note appears at bottom for all users

### Help Article

- [ ] Page accessible at `/[locale]/help/listing-types`
- [ ] All sections render correctly with proper formatting
- [ ] Comparison table is responsive on mobile
- [ ] Translations exist for all four locales
- [ ] Back navigation works from all entry points

### Dashboard Integration

- [ ] Link appears in Seller Settings
- [ ] Link appears in listing creation flow (if listing type selector is shown)
- [ ] Links use consistent component and styling

---

## Brand Voice Reminders

From the STG Brand Voice Guide — apply throughout:

- **Welcoming:** No jargon barriers, treat every question as a good question
- **Straightforward:** Lead with important information, avoid hedging
- **Playful:** Light touch only — no jokes around payment or problems
- **Trustworthy:** Be upfront about fees, timelines, processes

**Word choices:**
- ✓ "pre-loved" not "used"
- ✓ "find" not "purchase"
- ✓ Contractions are fine (we're, you'll)
- ✓ Sentence case for buttons

**Formality by language:**
- English: Casual, friendly
- Latvian: Formal
- Lithuanian: Formal, direct
- Estonian: Formal

---

## Questions for Implementation

1. **Listing creation flow:** Does the listing type selector appear during listing creation for sellers who have both options enabled? If so, the "What's the difference?" link should be added there too.

2. **Seller dashboard structure:** What's the current structure of the settings/help section? This determines exactly where the help link should appear.

3. **Existing help/FAQ system:** Is there an existing help center or FAQ page structure to follow, or is this the first help article?

---

## Appendix: Current Screenshots

For reference, the current onboarding Step 2 UI shows:
- Two cards side by side
- Instant Buy on the right with highlighted border and "Recommended" badge
- Contact Seller on the left with secondary styling
- CTAs: "Start selling" (Contact Seller) and "Set up payments — 2 min →" (Instant Buy)
- Footer note: "You can upgrade anytime from seller settings"

The visual structure is good — this PRD focuses on copy refinement and adding documentation.
