# Product Requirements Document: Stripe Connect Payment Flow

**Project:** Second Turn Games — Baltic Board Game Marketplace  
**Document Version:** 1.1  
**Date:** January 26, 2026  
**Author:** Product Team  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Current State Assessment](#3-current-state-assessment)
4. [Target Architecture](#4-target-architecture)
5. [Technical Requirements](#5-technical-requirements)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Webhook Implementation](#8-webhook-implementation)
9. [Business Logic](#9-business-logic)
10. [User Interface Requirements](#10-user-interface-requirements)
11. [Testing Requirements](#11-testing-requirements)
12. [Rollout Plan](#12-rollout-plan)
13. [Appendix](#13-appendix)
    - 13.1 Stripe API Version
    - 13.2 Environment Variables
    - 13.3 Stripe Dashboard Configuration (Completed)
    - 13.4 Useful Stripe Dashboard Links
    - 13.5 Reference Documentation
    - 13.6 Pre-Launch Checklist

---

## 1. Executive Summary

### 1.1 Purpose

This PRD defines the complete Stripe Connect payment flow implementation for Second Turn Games, a peer-to-peer board game marketplace operating in the Baltic region (Latvia, Lithuania, Estonia). The document serves as the authoritative specification for Claude Code to audit the current implementation and implement any missing or incorrect components.

### 1.2 Key Decisions

The payment architecture uses the **Separate Charges and Transfers** model (also known as Merchant of Record / MoR model) with the following characteristics:

- **Platform as Merchant of Record**: The platform receives payments first, then transfers to sellers after order completion
- **Buyer-Pays-Fees Model**: Sellers receive their full listing price as a transfer; buyers pay a service fee on top
- **Escrow-Like Fund Holding**: Payments are held until delivery confirmation, providing buyer protection
- **Controller Properties**: New Stripe Connect API approach (not legacy `type: 'express'`)
- **Manual Payouts**: Sellers control when to withdraw from their Stripe balance to their bank account via Express Dashboard link
- **Transparent Payout Fees**: Stripe charges €0.10 + 0.25% per payout (paid by seller when withdrawing). Sellers can batch sales to minimize fees.

### 1.3 Fee Structure

**Instant Buy Listings (Stripe-integrated):**

| Component | Amount | Notes |
|-----------|--------|-------|
| Service Fee | 6% + €0.50 | VAT included (21% Latvian VAT) |
| Shipping Fee | €2.00 flat | Unisend parcel locker delivery |

**Example (€20 listing):**
```
Listing price:    €20.00
Service fee:      €1.20 (6%) + €0.50 = €1.70
Shipping:         €2.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Buyer pays:       €23.70
Seller receives:  €20.00 (transferred to Stripe balance)
```

**Contact Seller Listings (no Stripe integration):**
- Platform acts as a billboard only
- No payment processing — buyer and seller arrange payment directly
- No shipping integration — parties arrange delivery themselves
- No platform fees on the transaction

### 1.4 Seller Payout Fees & Schedule

Sellers receive their full listing price as a transfer to their Stripe balance. When they withdraw (payout) to their bank account, Stripe charges a fee. This is transparent and controlled by the seller.

**Stripe Payout Fees (Eurozone/Baltic):**
- Standard payout: €0.10 + 0.25% of payout amount
- Instant payout: 1% (NOT used in our implementation)

**Payout Schedule:**
- **Manual payouts** — sellers control when to withdraw to their bank
- Sellers can batch multiple sales before withdrawing to minimize fees
- Sellers manage payouts via link to Stripe Express Dashboard

**Example (€30 listing, seller withdraws immediately):**
```
Transfer to seller Stripe balance:  €30.00
Payout fee (€0.10 + 0.25%):        -€0.18
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seller receives in bank:            €29.82
```

**Example (seller batches 5 sales of €30 each, then withdraws):**
```
Transfer to seller Stripe balance:  €150.00 (5 × €30)
Payout fee (€0.10 + 0.25%):        -€0.48
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seller receives in bank:            €149.52
Fee per sale:                       €0.096 (vs €0.18 if withdrawn individually)
```

**Communication to Sellers:**
- Clearly explain payout fees during onboarding and in seller dashboard
- Show "Available balance" in seller dashboard with link to withdraw
- Recommend batching payouts to minimize fees

### 1.5 Platform Pricing Tool Configuration

The platform uses Stripe's **Platform Pricing Tool** to calculate application fees automatically via Dashboard configuration, eliminating the need for code-based fee calculations in most scenarios.

**Why Platform Pricing Tool:**
- No-code fee configuration via Stripe Dashboard
- Instant changes without code deployment
- Built-in reporting and fee visibility
- Automatic application to eligible transactions

**How It Works:**
1. Configure pricing rules in Stripe Dashboard
2. When a Checkout Session is created **without** explicit `application_fee_amount`, Stripe automatically calculates and applies the fee based on Dashboard rules
3. Code can still override Dashboard pricing by specifying explicit `application_fee_amount` (useful for promotions)

**Dashboard Configuration:**

| Setting | Value |
|---------|-------|
| **Location** | Settings → Connect → Platform pricing |
| **Fee Type** | Blended (percentage + fixed) |
| **Percentage** | 6% |
| **Fixed Amount** | €0.50 |
| **Currency** | EUR |
| **Conditions** | None (applies to all transactions) |

**Hybrid Approach:**
- **Default**: Platform Pricing Tool calculates fees automatically
- **Override**: Code can specify `application_fee_amount` for special cases (promotions, VIP rates)
- **Fallback**: Code-based calculation functions remain for validation and edge cases

**Important Notes:**
- Platform Pricing Tool only works when platform pays Stripe fees (`controller.fees.payer = 'application'`) ✓
- Explicit `application_fee_amount` in API calls **always overrides** Dashboard pricing
- Fee appears as `application_fee` on the PaymentIntent, visible in Dashboard reporting
- Works with both Destination Charges and Separate Charges and Transfers

**Example Impact on Platform Margin (€30 listing):**
```
Buyer pays:           €34.30 (€30 + 6% + €0.50 + €2.00 shipping)
Stripe processing:   -€0.76 (~1.5% + €0.25 on €34.30)
Transfer to seller:  -€30.00
Shipping cost:       -€2.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform margin:      €1.54 (before VAT remittance on service fee)
```

---

## 2. Business Context

### 2.1 Platform Overview

Second Turn Games is a peer-to-peer marketplace where individuals buy and sell pre-loved board games across the Baltic states. The platform philosophy is "Every game deserves a second turn" — positioning used games as treasures finding new homes rather than mere secondhand goods.

### 2.2 Operational Model

- **Dual Listing Types**:
  - **Instant Buy**: Full Stripe integration — platform handles payment, shipping, and buyer protection
  - **Contact Seller**: Billboard/classified-ads style — platform connects parties, they handle payment and shipping themselves
- **Shipping (Instant Buy only)**: Unisend parcel locker delivery across Latvia, Lithuania, and Estonia
- **Languages**: English, Latvian, Lithuanian, Estonian

### 2.3 Legal Entity

- **Company**: Second Turn Games SIA
- **Registration**: 50203665371 (Latvia)
- **VAT Status**: VAT-registered in Latvia
- **Compliance**: Subject to DAC7 reporting requirements

### 2.4 Transaction Characteristics

- **Average Transaction Value**: €10-50
- **Payment Methods**: Cards (via Stripe)
- **Currencies**: EUR only
- **Markets**: LV, LT, EE

---

## 3. Current State Assessment

### 3.1 Audit Checklist

Claude Code should verify the current implementation against this checklist. Mark each item as ✅ Implemented, ⚠️ Partial, or ❌ Missing.

#### 3.1.1 Connected Account Setup

```
[ ] Account creation uses controller properties (NOT `type: 'express'`)
[ ] Controller properties configured correctly:
    - controller.stripe_dashboard.type = 'express'
    - controller.fees.payer = 'application'
    - controller.losses.payments = 'application'
    - controller.requirement_collection = 'stripe' (default)
[ ] Country parameter set correctly (LV, LT, or EE based on seller)
[ ] Capabilities requested: card_payments, transfers
[ ] Payout schedule set to daily (automatic payouts once funds are transferred)
[ ] Account Links generated for onboarding
[ ] account.updated webhook handled for status changes
```

#### 3.1.2 Checkout Flow

```
[ ] Checkout Session created WITHOUT transfer_data.destination
[ ] No automatic transfers configured
[ ] Metadata includes: order_id, seller_stripe_account_id, seller_amount
[ ] Service fee calculated correctly based on delivery method
[ ] Line items show transparent fee breakdown
[ ] Success and cancel URLs configured
[ ] checkout.session.completed webhook handled
```

#### 3.1.3 Order Management

```
[ ] Order created on checkout.session.completed
[ ] stripe_charge_id stored for later refund capability
[ ] stripe_payment_intent_id stored
[ ] Order status lifecycle implemented: pending → paid → shipped → delivered → completed
[ ] Order status branches: cancelled, disputed, refunded
[ ] Timestamps tracked for each status transition
```

#### 3.1.4 Transfer (Payout) Flow

```
[ ] Transfer created only after delivery confirmation
[ ] Transfer uses source_transaction parameter (links to original charge)
[ ] Transfer uses transfer_group for correlation
[ ] Transfer amount equals seller_amount (listing price only)
[ ] stripe_transfer_id stored on order
[ ] Payout status tracked: pending → transferred → paid_out
```

#### 3.1.5 Refund Handling

```
[ ] Full refund capability before transfer (simple case)
[ ] Full refund capability after transfer (requires transfer reversal first)
[ ] Refund uses stored stripe_charge_id
[ ] Order status updated to 'refunded'
[ ] Automatic refund if seller doesn't confirm within time limit
```

#### 3.1.6 Dispute Handling

```
[ ] Buyer can file dispute for: non-receipt, item not as described, damaged
[ ] 2-day dispute window after delivery confirmation
[ ] Dispute pauses any pending transfer
[ ] charge.dispute.created webhook handled
[ ] Evidence collection mechanism exists
```

### 3.2 File Locations to Audit

Claude Code should examine these locations (adjust paths based on actual project structure):

```
/lib/stripe/
├── stripe.ts                    # Stripe client initialization
├── constants.ts                 # Fee constants and calculations
├── accounts.ts                  # Connected account management
├── checkout.ts                  # Checkout session creation
├── transfers.ts                 # Transfer/payout logic
├── refunds.ts                   # Refund handling
└── webhooks.ts                  # Webhook handlers

/app/api/stripe/
├── create-checkout-session/route.ts
├── create-connect-account/route.ts
├── create-account-link/route.ts
├── webhook/route.ts
├── create-transfer/route.ts
└── create-refund/route.ts

/app/api/orders/
├── [id]/confirm-shipment/route.ts
├── [id]/confirm-delivery/route.ts
├── [id]/file-dispute/route.ts
└── [id]/route.ts

/components/
├── checkout/
├── seller-dashboard/
└── order-management/

/lib/supabase/
└── schema.sql or migrations/
```

---

## 4. Target Architecture

### 4.1 Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FLOW OVERVIEW                              │
└─────────────────────────────────────────────────────────────────────────────┘

BUYER                    PLATFORM                   STRIPE                  SELLER
  │                         │                         │                        │
  │ 1. Click "Buy Now"      │                         │                        │
  ├────────────────────────>│                         │                        │
  │                         │ 2. Create Checkout      │                        │
  │                         │    Session (no transfer)│                        │
  │                         ├────────────────────────>│                        │
  │                         │                         │                        │
  │ 3. Redirect to Stripe   │<────────────────────────┤                        │
  │<────────────────────────┤                         │                        │
  │                         │                         │                        │
  │ 4. Complete Payment     │                         │                        │
  ├─────────────────────────────────────────────────>│                        │
  │                         │                         │                        │
  │                         │ 5. Webhook: session     │                        │
  │                         │    completed            │                        │
  │                         │<────────────────────────┤                        │
  │                         │                         │                        │
  │                         │ 6. Create Order         │                        │
  │                         │    (status: paid)       │                        │
  │                         │    Store charge_id      │                        │
  │                         │                         │                        │
  │                         │                         │ 7. Email: New Sale     │
  │                         │─────────────────────────────────────────────────>│
  │                         │                         │                        │
  │                         │                         │ 8. Confirm & Ship      │
  │                         │<─────────────────────────────────────────────────┤
  │                         │                         │                        │
  │ 9. Tracking Update      │                         │                        │
  │<────────────────────────┤                         │                        │
  │                         │                         │                        │
  │ 10. Confirm Delivery    │                         │                        │
  ├────────────────────────>│                         │                        │
  │                         │                         │                        │
  │    ┌────────────────────┴────────────────────┐    │                        │
  │    │ 11. 2-DAY DISPUTE WINDOW                │    │                        │
  │    │     - Buyer can file dispute            │    │                        │
  │    │     - If no dispute, auto-complete      │    │                        │
  │    └────────────────────┬────────────────────┘    │                        │
  │                         │                         │                        │
  │                         │ 12. Create Transfer     │                        │
  │                         │     (grossed up +0.25%) │                        │
  │                         ├────────────────────────>│                        │
  │                         │                         │                        │
  │                         │                         │ 13. Funds in Seller    │
  │                         │                         │     Stripe Balance     │
  │                         │                         │     (minus payout fee) │
  │                         │                         ├───────────────────────>│
  │                         │                         │                        │
  │                         │                         │ 14. Standard Payout    │
  │                         │                         │     to Bank (next day) │
  │                         │                         ├───────────────────────>│
  │                         │                         │                        │
```

### 4.2 Stripe Connect Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STRIPE CONNECT ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │     SECOND TURN GAMES SIA       │
                    │     (Platform Account)          │
                    │                                 │
                    │  • Merchant of Record           │
                    │  • Receives all payments        │
                    │  • Controls transfer timing     │
                    │  • Handles refunds/disputes     │
                    │  • Pays Stripe processing fees  │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
          ┌─────────▼─────────┐       ┌──────────▼──────────┐
          │  Connected Account │       │  Connected Account  │
          │  (Seller LV)       │       │  (Seller LT)        │
          │                    │       │                     │
          │  Controller Props: │       │  Controller Props:  │
          │  • dashboard: expr │       │  • dashboard: expr  │
          │  • fees: applicati │       │  • fees: application│
          │  • losses: applica │       │  • losses: applicat │
          │                    │       │                     │
          │  Capabilities:     │       │  Capabilities:      │
          │  • transfers ✓     │       │  • transfers ✓      │
          │                    │       │                     │
          │  Payout: daily     │       │  Payout: daily      │
          └────────────────────┘       └─────────────────────┘
```

### 4.3 Order Status State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDER STATUS STATE MACHINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │ CREATED  │
                              │ (draft)  │
                              └────┬─────┘
                                   │ checkout.session.completed
                                   ▼
                              ┌──────────┐
              ┌───────────────│   PAID   │───────────────┐
              │               └────┬─────┘               │
              │                    │                     │
              │ seller_timeout     │ seller confirms     │ buyer cancels
              │ (auto after 3d)    │ & ships             │ (before ship)
              │                    ▼                     │
              │               ┌──────────┐              │
              │               │ SHIPPED  │              │
              │               └────┬─────┘              │
              │                    │                     │
              │                    │ buyer confirms      │
              │                    │ delivery            │
              │                    ▼                     │
              │               ┌──────────┐              │
              │               │DELIVERED │──────────────┤
              │               └────┬─────┘              │
              │                    │                     │
              │    ┌───────────────┼───────────────┐    │
              │    │               │               │    │
              │    │ dispute filed │ 2 days pass   │    │
              │    │               │ (no dispute)  │    │
              │    ▼               ▼               │    │
              │ ┌──────────┐ ┌──────────┐         │    │
              │ │DISPUTED  │ │COMPLETED │         │    │
              │ └────┬─────┘ └──────────┘         │    │
              │      │              ▲              │    │
              │      │              │              │    │
              │      │ resolved     │              │    │
              │      │ (buyer wins) │              │    │
              │      ▼              │              │    │
              │ ┌──────────┐       │              │    │
              └>│ REFUNDED │<──────┴──────────────┘    │
                └──────────┘                           │
                      ▲                                │
                      └────────────────────────────────┘
                               
                         ┌──────────┐
                         │CANCELLED │  (before shipment only)
                         └──────────┘
```

---

## 5. Technical Requirements

### 5.1 Connected Account Creation

#### 5.1.1 Implementation Specification

```typescript
// File: /lib/stripe/accounts.ts

import Stripe from 'stripe';
import { stripe } from './stripe';

interface CreateConnectedAccountParams {
  email: string;
  country: 'LV' | 'LT' | 'EE';
  userId: string;
}

interface CreateConnectedAccountResult {
  accountId: string;
  accountLinkUrl: string;
}

/**
 * Creates a Stripe Connected Account using controller properties.
 * 
 * CRITICAL: Do NOT use `type: 'express'` — use controller properties instead.
 * The old account types (Standard, Express, Custom) are considered legacy.
 * 
 * Controller property configuration for Second Turn Games:
 * - stripe_dashboard.type: 'express' — Sellers get Express Dashboard access
 * - fees.payer: 'application' — Platform pays Stripe processing fees
 * - losses.payments: 'application' — Platform responsible for negative balances
 * - requirement_collection: 'stripe' (default) — Stripe handles KYC
 */
export async function createConnectedAccount(
  params: CreateConnectedAccountParams
): Promise<CreateConnectedAccountResult> {
  const { email, country, userId } = params;
  
  // Create the connected account with controller properties
  const account = await stripe.accounts.create({
    // DO NOT USE: type: 'express' — this is legacy
    
    // Controller properties define account behavior
    controller: {
      stripe_dashboard: {
        type: 'express', // Sellers access Express Dashboard
      },
      fees: {
        payer: 'application', // Platform pays Stripe fees
      },
      losses: {
        payments: 'application', // Platform handles negative balances
      },
      // requirement_collection defaults to 'stripe' — Stripe handles KYC
    },
    
    // Required: specify the country
    country: country,
    
    // Optional: prefill email
    email: email,
    
    // Request necessary capabilities
    capabilities: {
      transfers: { requested: true },
      // Note: card_payments not needed for receive-only accounts
    },
    
    // Set manual payouts — sellers control when to withdraw via Express Dashboard
    settings: {
      payouts: {
        schedule: {
          interval: 'manual',
        },
      },
    },
    
    // Store platform user ID in metadata for correlation
    metadata: {
      platform_user_id: userId,
    },
  });
  
  // Create Account Link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding/complete`,
    type: 'account_onboarding',
  });
  
  return {
    accountId: account.id,
    accountLinkUrl: accountLink.url,
  };
}
```

#### 5.1.2 Acceptance Criteria

1. **AC-1**: Account creation request does NOT include `type` parameter
2. **AC-2**: Account creation includes all four controller properties as specified
3. **AC-3**: Country is dynamically set based on seller's country (LV, LT, or EE)
4. **AC-4**: `transfers` capability is requested
5. **AC-5**: Payout schedule is set to `manual` (sellers control withdrawals via Express Dashboard)
6. **AC-6**: Account Link is created and returned for onboarding flow
7. **AC-7**: Platform user ID is stored in account metadata

### 5.2 Checkout Session Creation

#### 5.2.1 Implementation Specification

```typescript
// File: /lib/stripe/checkout.ts

import Stripe from 'stripe';
import { stripe } from './stripe';
import { calculateServiceFee, SHIPPING_FEE_CENTS } from './constants';

interface CreateCheckoutSessionParams {
  listingId: string;
  listingTitle: string;
  listingPriceCents: number;
  sellerStripeAccountId: string;
  sellerId: string;
  buyerId: string;
  locale: 'en' | 'lv' | 'lt' | 'et';
}

interface CheckoutSessionResult {
  sessionId: string;
  sessionUrl: string;
}

/**
 * Creates a Stripe Checkout Session for the Separate Charges and Transfers model.
 * 
 * CRITICAL: Do NOT include transfer_data.destination — this would create a
 * destination charge with automatic transfer. We want funds to stay on platform
 * until delivery is confirmed.
 * 
 * FEE CALCULATION: The Platform Pricing Tool (configured in Dashboard) 
 * automatically calculates the application_fee. We do NOT specify 
 * application_fee_amount here — letting the Platform Pricing Tool handle it.
 * The serviceFeeCents calculation below is only for line item display.
 * 
 * The checkout session:
 * 1. Charges the buyer (listing price + service fee + shipping)
 * 2. Funds land in platform account
 * 3. No automatic transfer occurs
 * 4. Platform Pricing Tool calculates application_fee
 * 5. We store metadata to facilitate later transfer
 * 
 * Note: All Instant Buy orders use parcel locker shipping. Contact Seller
 * listings don't use Stripe checkout at all.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const {
    listingId,
    listingTitle,
    listingPriceCents,
    sellerStripeAccountId,
    sellerId,
    buyerId,
    locale,
  } = params;
  
  // Calculate fees for LINE ITEM DISPLAY only
  // The actual application_fee is calculated by Platform Pricing Tool
  // This should match the Dashboard configuration (6% + €0.50)
  const serviceFeeCents = calculateServiceFee(listingPriceCents);
  const totalCents = listingPriceCents + serviceFeeCents + SHIPPING_FEE_CENTS;
  
  // Generate idempotency key to prevent duplicate sessions
  const idempotencyKey = `checkout_${listingId}_${buyerId}_${Date.now()}`;
  
  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    
    // Line items show transparent breakdown
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: listingTitle,
            description: 'Pre-loved board game',
          },
          unit_amount: listingPriceCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Service Fee',
            description: 'Buyer protection and platform services (VAT incl.)',
          },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Shipping',
            description: 'Parcel locker delivery',
          },
          unit_amount: SHIPPING_FEE_CENTS,
        },
        quantity: 1,
      },
    ],
    
    // DO NOT INCLUDE transfer_data — we want funds on platform account
    // payment_intent_data without transfer_data = charge on platform
    payment_intent_data: {
      // transfer_group links the charge to later transfer
      transfer_group: `order_${listingId}_${Date.now()}`,
      
      // Metadata for webhook processing
      metadata: {
        listing_id: listingId,
        seller_id: sellerId,
        buyer_id: buyerId,
        seller_stripe_account_id: sellerStripeAccountId,
        seller_amount_cents: listingPriceCents.toString(),
        service_fee_cents: serviceFeeCents.toString(),
        shipping_fee_cents: SHIPPING_FEE_CENTS.toString(),
      },
    },
    
    // Metadata on session for easy access
    metadata: {
      listing_id: listingId,
      seller_id: sellerId,
      buyer_id: buyerId,
      seller_stripe_account_id: sellerStripeAccountId,
      seller_amount_cents: listingPriceCents.toString(),
    },
    
    // Redirect URLs
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/orders/{CHECKOUT_SESSION_ID}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/listings/${listingId}?checkout=cancelled`,
    
    // Localization
    locale: locale === 'et' ? 'et' : locale, // Stripe supports et, lv, lt, en
    
    // Expire after 30 minutes
    expires_at: Math.floor(Date.now() / 1000) + 1800,
    
  }, {
    idempotencyKey,
  });
  
  return {
    sessionId: session.id,
    sessionUrl: session.url!,
  };
}
```

#### 5.2.2 Fee Calculation (Backup/Reference)

> **Note:** The primary fee calculation is handled by **Stripe's Platform Pricing Tool** configured in Dashboard (see Section 1.5). The code below serves as:
> - Reference implementation for validation
> - Backup for edge cases requiring explicit `application_fee_amount`
> - Override capability for promotions or special pricing

```typescript
// File: /lib/stripe/constants.ts

/**
 * Fee structure for Second Turn Games
 * 
 * PRIMARY: Platform Pricing Tool calculates fees automatically via Dashboard
 * BACKUP: This code provides reference values and override capability
 * 
 * Buyer-pays-fees model:
 * - Seller receives full listing price
 * - Buyer pays service fee on top
 * - Shipping fee is flat rate
 * 
 * Note: Instant Buy listings always use shipping (parcel locker).
 * Contact Seller listings don't use Stripe at all.
 */

// Service fee (VAT included) — matches Platform Pricing Tool configuration
export const SERVICE_FEE_PERCENT = 0.06; // 6%
export const SERVICE_FEE_FIXED_CENTS = 50; // €0.50

// Flat shipping fee (in cents)
export const SHIPPING_FEE_CENTS = 200; // €2.00

/**
 * Calculate the service fee for a given listing price.
 * 
 * This matches the Platform Pricing Tool "Blended" configuration:
 * - 6% of listing price + €0.50 fixed
 * 
 * Use this function for:
 * - Displaying fee estimates to users before checkout
 * - Overriding Platform Pricing Tool for promotions
 * - Validation and reconciliation
 * 
 * @param listingPriceCents - The listing price in cents
 * @returns Service fee in cents (rounded to nearest cent)
 */
export function calculateServiceFee(listingPriceCents: number): number {
  const percentageFee = Math.round(listingPriceCents * SERVICE_FEE_PERCENT);
  return percentageFee + SERVICE_FEE_FIXED_CENTS;
}

/**
 * Calculate the total buyer pays for an Instant Buy order.
 * All Instant Buy orders include shipping (parcel locker delivery).
 * 
 * Note: This calculates what buyer pays. The actual application_fee
 * is calculated by Platform Pricing Tool unless explicitly overridden.
 */
export function calculateBuyerTotal(listingPriceCents: number): {
  listingPrice: number;
  serviceFee: number;
  shippingFee: number;
  total: number;
} {
  const serviceFee = calculateServiceFee(listingPriceCents);
  
  return {
    listingPrice: listingPriceCents,
    serviceFee,
    shippingFee: SHIPPING_FEE_CENTS,
    total: listingPriceCents + serviceFee + SHIPPING_FEE_CENTS,
  };
}
```

#### 5.2.3 Acceptance Criteria

1. **AC-1**: Checkout Session does NOT include `transfer_data.destination`
2. **AC-2**: `payment_intent_data.transfer_group` is set for later correlation
3. **AC-3**: Metadata includes all required fields for webhook processing
4. **AC-4**: Line items show transparent fee breakdown (listing, service fee, shipping)
5. **AC-5**: Platform Pricing Tool configured in Dashboard with 6% + €0.50 Blended fee
6. **AC-6**: Checkout Session does NOT specify `application_fee_amount` (let Platform Pricing Tool calculate)
7. **AC-7**: Shipping fee (€2.00) always included for Instant Buy orders
8. **AC-8**: Idempotency key prevents duplicate sessions
9. **AC-9**: Session expires after 30 minutes

### 5.3 Transfer Creation

#### 5.3.1 Implementation Specification

```typescript
// File: /lib/stripe/transfers.ts

import Stripe from 'stripe';
import { stripe } from './stripe';

interface CreateTransferParams {
  orderId: string;
  sellerStripeAccountId: string;
  amountCents: number; // Seller's listing price
  chargeId: string;
  transferGroup: string;
}

interface TransferResult {
  transferId: string;
  amountCents: number;
  status: string;
}

/**
 * Creates a transfer to the seller's connected account.
 * 
 * CRITICAL: Use source_transaction to link the transfer to the original charge.
 * This ensures:
 * 1. The transfer draws from the specific charge's funds
 * 2. The transfer succeeds even if platform balance is low
 * 3. Proper accounting and reconciliation
 * 
 * NOTE: Seller receives full listing price in their Stripe balance.
 * When they withdraw (payout) to their bank, Stripe deducts payout fees
 * (€0.10 + 0.25%). Sellers control payout timing via Express Dashboard.
 * 
 * This function should ONLY be called after:
 * 1. Buyer confirms delivery
 * 2. Dispute window passes (2 days)
 * 3. No active dispute exists
 */
export async function createTransferToSeller(
  params: CreateTransferParams
): Promise<TransferResult> {
  const {
    orderId,
    sellerStripeAccountId,
    amountCents,
    chargeId,
    transferGroup,
  } = params;
  
  // Idempotency key prevents duplicate transfers
  const idempotencyKey = `transfer_${orderId}`;
  
  const transfer = await stripe.transfers.create({
    // Transfer full listing price to seller's Stripe balance
    amount: amountCents,
    currency: 'eur',
    
    // Destination is the seller's connected account
    destination: sellerStripeAccountId,
    
    // CRITICAL: Link to the original charge
    // This ensures funds come from this specific payment
    source_transaction: chargeId,
    
    // Transfer group for correlation
    transfer_group: transferGroup,
    
    // Metadata for reconciliation
    metadata: {
      order_id: orderId,
      type: 'seller_payout',
    },
    
    // Description visible in Stripe Dashboard
    description: `Sale payout for order ${orderId}`,
    
  }, {
    idempotencyKey,
  });
  
  return {
    transferId: transfer.id,
    amountCents,
    status: transfer.reversed ? 'reversed' : 'pending',
  };
}

/**
 * Reverse a transfer (for refund scenarios after transfer was made).
 * 
 * This is needed when:
 * 1. A refund is requested after funds were transferred to seller
 * 2. The seller's account needs to be debited
 * 
 * Note: If seller has insufficient balance, this creates a negative balance
 * that will be recovered from future earnings.
 */
export async function reverseTransfer(
  transferId: string,
  amountCents?: number // Optional: partial reversal
): Promise<{ reversalId: string }> {
  const reversal = await stripe.transfers.createReversal(transferId, {
    amount: amountCents, // Omit for full reversal
    metadata: {
      reason: 'refund_after_transfer',
    },
  });
  
  return {
    reversalId: reversal.id,
  };
}
```

#### 5.3.2 Acceptance Criteria

1. **AC-1**: Transfer uses `source_transaction` parameter linking to original charge
2. **AC-2**: Transfer uses `transfer_group` for correlation
3. **AC-3**: Transfer amount equals seller's listing price (no gross-up)
4. **AC-4**: Idempotency key prevents duplicate transfers
5. **AC-5**: Transfer only created after delivery + dispute window
6. **AC-6**: Reversal function available for post-transfer refunds

### 5.4 Refund Handling

#### 5.4.1 Implementation Specification

```typescript
// File: /lib/stripe/refunds.ts

import Stripe from 'stripe';
import { stripe } from './stripe';
import { reverseTransfer } from './transfers';

interface RefundParams {
  orderId: string;
  chargeId: string;
  amountCents?: number; // Optional for partial refund
  reason: 'seller_no_ship' | 'buyer_dispute' | 'item_not_received' | 'item_damaged' | 'other';
  transferId?: string; // If transfer was already made
}

interface RefundResult {
  refundId: string;
  status: string;
  reversalId?: string;
}

/**
 * Process a refund for an order.
 * 
 * Two scenarios:
 * 
 * 1. Transfer NOT yet made (simple case):
 *    - Just refund the original charge
 *    - Funds are still on platform, no reversal needed
 * 
 * 2. Transfer already made (complex case):
 *    - First reverse the transfer (claw back from seller)
 *    - Then refund the original charge
 *    - If seller has insufficient balance, reversal creates negative balance
 */
export async function processRefund(
  params: RefundParams
): Promise<RefundResult> {
  const {
    orderId,
    chargeId,
    amountCents,
    reason,
    transferId,
  } = params;
  
  let reversalId: string | undefined;
  
  // If transfer was made, reverse it first
  if (transferId) {
    const reversal = await reverseTransfer(transferId, amountCents);
    reversalId = reversal.reversalId;
  }
  
  // Now process the refund
  const idempotencyKey = `refund_${orderId}_${Date.now()}`;
  
  const refund = await stripe.refunds.create({
    charge: chargeId,
    amount: amountCents, // Omit for full refund
    reason: mapReasonToStripe(reason),
    metadata: {
      order_id: orderId,
      internal_reason: reason,
    },
  }, {
    idempotencyKey,
  });
  
  return {
    refundId: refund.id,
    status: refund.status,
    reversalId,
  };
}

/**
 * Map internal reason codes to Stripe's accepted values.
 */
function mapReasonToStripe(
  reason: RefundParams['reason']
): Stripe.RefundCreateParams['reason'] {
  switch (reason) {
    case 'buyer_dispute':
    case 'item_not_received':
    case 'item_damaged':
      return 'requested_by_customer';
    case 'seller_no_ship':
      return 'requested_by_customer';
    default:
      return undefined;
  }
}

/**
 * Check if a refund is possible for an order.
 * Returns false if the charge is too old (beyond Stripe's refund window).
 */
export async function canRefund(chargeId: string): Promise<boolean> {
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    
    // Stripe allows refunds up to 180 days after charge
    const chargeDate = new Date(charge.created * 1000);
    const daysSinceCharge = (Date.now() - chargeDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceCharge < 180 && !charge.refunded;
  } catch {
    return false;
  }
}
```

#### 5.4.2 Acceptance Criteria

1. **AC-1**: Refund before transfer works (simple path)
2. **AC-2**: Refund after transfer reverses transfer first, then refunds
3. **AC-3**: Partial refunds supported (amount parameter)
4. **AC-4**: Idempotency key prevents duplicate refunds
5. **AC-5**: Refund reason tracked in metadata
6. **AC-6**: `canRefund` check validates refund is still possible

---

## 6. Database Schema

### 6.1 Tables Required

```sql
-- File: /supabase/migrations/XXXXXX_stripe_payment_tables.sql

-- ============================================================================
-- SELLER PROFILES (extends existing users table)
-- ============================================================================

-- Add Stripe-related columns to profiles or create seller_profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending';
-- Status: pending, onboarding, active, restricted, disabled
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id 
ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  listing_id UUID NOT NULL REFERENCES listings(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Order details
  listing_price_cents INTEGER NOT NULL,
  service_fee_cents INTEGER NOT NULL,
  shipping_fee_cents INTEGER NOT NULL DEFAULT 200, -- €2.00 flat rate
  total_cents INTEGER NOT NULL,
  -- Note: Instant Buy orders are always shipped via parcel locker
  -- Contact Seller listings don't create orders in this table
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Checkout started but not completed
    'paid',       -- Payment received, awaiting seller action
    'shipped',    -- Seller confirmed shipment
    'delivered',  -- Buyer confirmed delivery
    'completed',  -- Dispute window passed, seller paid
    'disputed',   -- Buyer filed dispute
    'refunded',   -- Order refunded
    'cancelled'   -- Order cancelled
  )),
  
  -- Payout status (separate from order status)
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN (
    'pending',      -- Awaiting conditions (delivery + dispute window)
    'processing',   -- Transfer initiated
    'transferred',  -- Transfer completed, in seller's Stripe balance
    'failed',       -- Transfer failed
    'reversed'      -- Transfer reversed (refund scenario)
  )),
  
  -- Stripe references (CRITICAL for refunds and transfers)
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,           -- REQUIRED for refunds
  stripe_transfer_group TEXT,      -- Links charge to transfer
  stripe_transfer_id TEXT,         -- After transfer is made
  stripe_refund_id TEXT,           -- If refunded
  
  -- Shipping details
  tracking_number TEXT,
  tracking_url TEXT,
  parcel_locker_id TEXT,
  
  -- Timestamps for each status transition
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Dispute window tracking
  dispute_window_ends_at TIMESTAMPTZ,
  
  -- Auto-actions
  seller_confirm_deadline TIMESTAMPTZ,  -- Auto-cancel if seller doesn't ship
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payout_status ON orders(payout_status) WHERE payout_status = 'pending';
CREATE INDEX idx_orders_stripe_checkout_session_id ON orders(stripe_checkout_session_id);
CREATE INDEX idx_orders_stripe_charge_id ON orders(stripe_charge_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  -- Dispute details
  type TEXT NOT NULL CHECK (type IN (
    'not_received',
    'not_as_described',
    'damaged',
    'incomplete',
    'other'
  )),
  description TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'under_review',
    'resolved_buyer_win',
    'resolved_seller_win',
    'cancelled'
  )),
  
  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),  -- Admin who resolved
  
  -- Evidence (references to uploaded images/documents)
  buyer_evidence JSONB DEFAULT '[]',
  seller_evidence JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_disputes_order_id ON order_disputes(order_id);
CREATE INDEX idx_order_disputes_status ON order_disputes(status) WHERE status = 'open';

-- ============================================================================
-- STRIPE WEBHOOK EVENTS (for idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,  -- Stripe event ID
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

-- Auto-cleanup old events (older than 90 days)
CREATE INDEX idx_stripe_webhook_events_processed_at 
ON stripe_webhook_events(processed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_disputes ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own orders
CREATE POLICY orders_buyer_select ON orders
  FOR SELECT USING (auth.uid() = buyer_id);

-- Sellers can see orders for their listings
CREATE POLICY orders_seller_select ON orders
  FOR SELECT USING (auth.uid() = seller_id);

-- Service role can do everything (for webhooks)
CREATE POLICY orders_service_all ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Similar policies for disputes
CREATE POLICY disputes_buyer_select ON order_disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_disputes.order_id AND orders.buyer_id = auth.uid())
  );

CREATE POLICY disputes_seller_select ON order_disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_disputes.order_id AND orders.seller_id = auth.uid())
  );

CREATE POLICY disputes_service_all ON order_disputes
  FOR ALL USING (auth.role() = 'service_role');
```

### 6.2 Acceptance Criteria

1. **AC-1**: All Stripe reference fields exist on orders table
2. **AC-2**: Order status enum matches state machine
3. **AC-3**: Payout status tracked separately from order status
4. **AC-4**: Timestamps tracked for each status transition
5. **AC-5**: Webhook events table exists for idempotency
6. **AC-6**: RLS policies allow buyers and sellers to see their orders
7. **AC-7**: Service role can access all records (for webhooks)

---

## 7. API Endpoints

### 7.1 Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-connect-account` | POST | Create seller connected account |
| `/api/stripe/create-account-link` | POST | Generate onboarding link |
| `/api/stripe/create-checkout-session` | POST | Create checkout for listing purchase |
| `/api/stripe/webhook` | POST | Handle Stripe webhooks |
| `/api/orders/[id]` | GET | Get order details |
| `/api/orders/[id]/confirm-shipment` | POST | Seller confirms shipment |
| `/api/orders/[id]/confirm-delivery` | POST | Buyer confirms delivery |
| `/api/orders/[id]/file-dispute` | POST | Buyer files dispute |
| `/api/orders/[id]/cancel` | POST | Cancel order (before shipment) |
| `/api/orders/[id]/refund` | POST | Admin initiates refund |

### 7.2 Endpoint Specifications

#### 7.2.1 Create Connect Account

```typescript
// POST /api/stripe/create-connect-account

// Request body
interface CreateConnectAccountRequest {
  // No body needed — uses authenticated user's data
}

// Response
interface CreateConnectAccountResponse {
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  error?: string;
}

// Implementation notes:
// 1. Requires authenticated user
// 2. User must not already have a connected account
// 3. Returns Account Link URL for immediate redirect
```

#### 7.2.2 Create Checkout Session

```typescript
// POST /api/stripe/create-checkout-session

// Request body
interface CreateCheckoutSessionRequest {
  listingId: string;
  parcelLockerId: string;  // Required - Instant Buy always uses parcel locker shipping
}

// Response
interface CreateCheckoutSessionResponse {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  error?: string;
}

// Implementation notes:
// 1. Requires authenticated user (buyer)
// 2. Validates listing exists and is available (must be Instant Buy type)
// 3. Validates seller has active Stripe account
// 4. Creates order record in 'pending' status
// 5. Returns Stripe Checkout URL for redirect
```

#### 7.2.3 Confirm Shipment

```typescript
// POST /api/orders/[id]/confirm-shipment

// Request body
interface ConfirmShipmentRequest {
  trackingNumber: string;
  trackingUrl?: string;
}

// Response
interface ConfirmShipmentResponse {
  success: boolean;
  order?: Order;
  error?: string;
}

// Implementation notes:
// 1. Requires authenticated seller
// 2. Order must be in 'paid' status
// 3. Updates order to 'shipped' status
// 4. Sends notification to buyer
```

#### 7.2.4 Confirm Delivery

```typescript
// POST /api/orders/[id]/confirm-delivery

// Request body — empty

// Response
interface ConfirmDeliveryResponse {
  success: boolean;
  order?: Order;
  disputeWindowEndsAt?: string;
  error?: string;
}

// Implementation notes:
// 1. Requires authenticated buyer
// 2. Order must be in 'shipped' status
// 3. Updates order to 'delivered' status
// 4. Sets dispute_window_ends_at to NOW + 2 days
// 5. Schedules auto-completion job
```

#### 7.2.5 File Dispute

```typescript
// POST /api/orders/[id]/file-dispute

// Request body
interface FileDisputeRequest {
  type: 'not_received' | 'not_as_described' | 'damaged' | 'incomplete' | 'other';
  description: string;
  evidenceUrls?: string[];  // Uploaded image URLs
}

// Response
interface FileDisputeResponse {
  success: boolean;
  disputeId?: string;
  error?: string;
}

// Implementation notes:
// 1. Requires authenticated buyer
// 2. Order must be in 'delivered' status
// 3. Current time must be before dispute_window_ends_at
// 4. Creates dispute record
// 5. Updates order to 'disputed' status
// 6. Pauses any pending payout
```

### 7.3 Acceptance Criteria

1. **AC-1**: All endpoints validate authentication
2. **AC-2**: All endpoints validate authorization (user owns resource)
3. **AC-3**: All endpoints return consistent error format
4. **AC-4**: All state-changing endpoints are idempotent where possible
5. **AC-5**: All endpoints validate order status before state transitions

---

## 8. Webhook Implementation

### 8.1 Webhook Architecture Overview

Second Turn Games uses **two separate webhook endpoints** to handle events from Stripe:

| Webhook | Endpoint | Events From | Purpose |
|---------|----------|-------------|---------|
| **Platform** | `/api/webhooks/stripe` | Your account | Checkout, refunds, transfers |
| **Connect** | `/api/webhooks/stripe-connect` | Connected accounts | Seller payouts, account updates |

### 8.2 Dashboard Configuration

#### 8.2.1 Platform Webhook (Sandbox)

**URL:** `https://secondturn.games/api/webhooks/stripe`  
**Name:** upbeat-voyage (auto-generated)  
**Events from:** Your account  
**Description:** Platform events (checkout, refunds, transfers)

**Events:**
| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Buyer completed payment — update order to 'paid' |
| `checkout.session.expired` | Checkout abandoned — cancel pending order |
| `charge.refunded` | Refund processed — update order status |
| `transfer.created` | Transfer to seller initiated — confirm payout |
| `transfer.reversed` | Transfer reversed — handle refund after payout |

#### 8.2.2 Connect Webhook (Sandbox)

**URL:** `https://secondturn.games/api/webhooks/stripe-connect`  
**Name:** dynamic-harmony (auto-generated)  
**Events from:** Connected accounts  
**Description:** Connected account events (seller payouts & onboarding)

**Events:**
| Event | Purpose |
|-------|---------|
| `account.updated` | Seller account status changed (onboarding, restrictions) |
| `account.external_account.created` | Seller added bank account |
| `account.external_account.deleted` | Seller removed bank account |
| `payout.canceled` | Seller's withdrawal canceled |
| `payout.failed` | Seller's withdrawal failed |
| `payout.paid` | Seller received money in bank |

### 8.3 Environment Variables

```env
# Platform webhook (checkout, refunds, transfers)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Connect webhook (seller payouts, account updates)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxx
```

**Note:** Each webhook has its own signing secret. Copy from Stripe Dashboard → Developers → Webhooks → [webhook] → Signing secret.

### 8.4 Express Dashboard Feature Settings

Configure in Stripe Dashboard → Settings → Connect → Express Dashboard → Features:

| Feature | Platform Liability | Stripe Liability | Notes |
|---------|-------------------|------------------|-------|
| **View payments** | ✓ ON | ON | Sellers see their sales |
| **Issue refunds** | OFF | OFF | Platform handles refunds |
| **Manage disputes** | OFF | OFF | Platform handles disputes |
| **Manual payouts** | ✓ ON | ON | Sellers can withdraw to bank |
| **Edit payout schedule** | OFF | OFF | Keep sellers on manual payouts |
| **Top up refunds balance** | OFF | OFF | Not needed |
| **Close account** | ✓ ON | ON | Allow sellers to close |

**Important:** Enable "Platform" row for features your sellers need. Your accounts use `controller.losses.payments = 'application'` (platform liability).

### 8.5 Platform Webhook Implementation

```typescript
// File: /app/api/webhooks/stripe/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe';
import { createServiceClient } from '@/lib/supabase/service';

// Platform webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Check for duplicate event (idempotency)
  const supabase = createServiceClient();
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .single();
  
  if (existingEvent) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return NextResponse.json({ received: true });
  }
  
  // Record event
  await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    payload: event.data.object,
  });
  
  // Handle event by type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
        
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;
        
      case 'transfer.reversed':
        await handleTransferReversed(event.data.object as Stripe.Transfer);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    // Don't return error — Stripe will retry
    // Log for monitoring and manual intervention
  }
  
  return NextResponse.json({ received: true });
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient();
  
  // Extract data from metadata
  const {
    listing_id,
    seller_id,
    buyer_id,
    seller_stripe_account_id,
    seller_amount_cents,
  } = session.metadata!;
  
  // Get the PaymentIntent to extract charge ID
  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent as string
  );
  
  // The charge ID is on the latest_charge
  const chargeId = paymentIntent.latest_charge as string;
  
  // Get transfer_group from payment intent metadata
  const transferGroup = paymentIntent.transfer_group;
  
  // Update order from pending to paid
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,  // CRITICAL: Store for refunds
      stripe_transfer_group: transferGroup,
      paid_at: new Date().toISOString(),
      // Set seller deadline: 3 business days to ship
      seller_confirm_deadline: addBusinessDays(new Date(), 3).toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id);
  
  if (error) {
    console.error('Error updating order:', error);
    throw error;
  }
  
  // Mark listing as sold
  await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listing_id);
  
  // TODO: Send notification to seller about new sale
  // TODO: Send confirmation email to buyer
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient();
  
  // Update order to cancelled
  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_checkout_session_id', session.id);
  
  // Re-enable listing
  const { listing_id } = session.metadata!;
  await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', listing_id);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const supabase = createServiceClient();
  
  // Find order by charge ID
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .single();
  
  if (!order) {
    console.log('No order found for charge:', charge.id);
    return;
  }
  
  // Update order status
  await supabase
    .from('orders')
    .update({
      status: 'refunded',
      stripe_refund_id: charge.refunds?.data[0]?.id,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  
  // Re-enable listing if needed
  await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', order.listing_id);
}

// NOTE: Stripe dispute handlers (charge.dispute.created, charge.dispute.closed)
// are not currently configured but can be added later if needed for chargeback handling.
// The platform's internal dispute system handles buyer complaints before Stripe chargebacks occur.

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const supabase = createServiceClient();
  
  const orderId = transfer.metadata?.order_id;
  if (!orderId) return;
  
  await supabase
    .from('orders')
    .update({
      stripe_transfer_id: transfer.id,
      payout_status: 'transferred',
    })
    .eq('id', orderId);
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  const supabase = createServiceClient();
  
  const orderId = transfer.metadata?.order_id;
  if (!orderId) return;
  
  await supabase
    .from('orders')
    .update({
      payout_status: 'reversed',
    })
    .eq('id', orderId);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}
```

### 8.6 Connect Webhook Implementation

```typescript
// File: /app/api/webhooks/stripe-connect/route.ts

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe';
import { createServiceClient } from '@/lib/supabase/service';

// Connect webhook secret (different from platform webhook)
const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Connect webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  // Check for duplicate event (idempotency)
  const supabase = createServiceClient();
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .single();
  
  if (existingEvent) {
    console.log(`Duplicate connect webhook event: ${event.id}`);
    return NextResponse.json({ received: true });
  }
  
  // Record event
  await supabase.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    payload: event.data.object,
    source: 'connect', // Distinguish from platform events
  });
  
  // Handle event by type
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'account.external_account.created':
        await handleExternalAccountCreated(event);
        break;
        
      case 'account.external_account.deleted':
        await handleExternalAccountDeleted(event);
        break;
        
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout, event.account!);
        break;
        
      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout, event.account!);
        break;
        
      case 'payout.canceled':
        await handlePayoutCanceled(event.data.object as Stripe.Payout, event.account!);
        break;
        
      default:
        console.log(`Unhandled connect event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling connect ${event.type}:`, err);
  }
  
  return NextResponse.json({ received: true });
}

// ============================================================================
// CONNECT WEBHOOK HANDLERS
// ============================================================================

async function handleAccountUpdated(account: Stripe.Account) {
  const supabase = createServiceClient();
  
  // Determine account status
  const status = account.charges_enabled && account.payouts_enabled
    ? 'active'
    : account.details_submitted
      ? 'restricted'
      : 'onboarding';
  
  await supabase
    .from('profiles')
    .update({
      stripe_account_status: status,
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_onboarding_completed_at: account.details_submitted
        ? new Date().toISOString()
        : null,
    })
    .eq('stripe_account_id', account.id);
  
  console.log(`Account ${account.id} updated: status=${status}`);
}

async function handleExternalAccountCreated(event: Stripe.Event) {
  // Log for monitoring — seller added bank account
  const accountId = event.account;
  console.log(`External account created for ${accountId}`);
  // Could update profile to track bank account status if needed
}

async function handleExternalAccountDeleted(event: Stripe.Event) {
  // Log for monitoring — seller removed bank account
  const accountId = event.account;
  console.log(`External account deleted for ${accountId}`);
  // Could update profile to warn seller they need bank account
}

async function handlePayoutPaid(payout: Stripe.Payout, accountId: string) {
  // Seller successfully withdrew to their bank
  console.log(`Payout ${payout.id} paid to account ${accountId}: €${(payout.amount / 100).toFixed(2)}`);
  
  // Optional: Track payout history in database for seller dashboard
  // Optional: Send notification to seller confirming money arrived
}

async function handlePayoutFailed(payout: Stripe.Payout, accountId: string) {
  const supabase = createServiceClient();
  
  console.error(`Payout ${payout.id} failed for account ${accountId}: ${payout.failure_message}`);
  
  // Find seller by Stripe account ID
  const { data: seller } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_account_id', accountId)
    .single();
  
  if (seller) {
    // TODO: Send notification to seller about failed payout
    // TODO: Suggest they check bank details in Express Dashboard
    console.log(`Should notify seller ${seller.id} about failed payout`);
  }
}

async function handlePayoutCanceled(payout: Stripe.Payout, accountId: string) {
  console.log(`Payout ${payout.id} canceled for account ${accountId}`);
  // Log for monitoring — seller canceled their withdrawal
}
```

### 8.7 Webhook Database Table

```sql
-- Table to track processed webhook events (idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,                    -- Stripe event ID (evt_xxx)
  type TEXT NOT NULL,                     -- Event type (checkout.session.completed, etc.)
  payload JSONB,                          -- Full event data for debugging
  source TEXT DEFAULT 'platform',         -- 'platform' or 'connect'
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX idx_stripe_webhook_events_created_at 
ON stripe_webhook_events(created_at);

-- Optional: Clean up old events after 90 days
-- Can be done via cron job or Supabase scheduled function
```

### 8.8 Acceptance Criteria

#### Platform Webhook (`/api/webhooks/stripe`)

1. **AC-1**: Webhook signature verified using `STRIPE_WEBHOOK_SECRET`
2. **AC-2**: Duplicate events detected and skipped (idempotency)
3. **AC-3**: All webhook events logged in `stripe_webhook_events` table
4. **AC-4**: `checkout.session.completed` stores `charge_id` correctly for refunds
5. **AC-5**: `checkout.session.expired` cancels pending order and re-enables listing
6. **AC-6**: `charge.refunded` updates order status and re-enables listing
7. **AC-7**: `transfer.created` updates order `payout_status` to 'transferred'
8. **AC-8**: `transfer.reversed` updates order `payout_status` to 'reversed'

#### Connect Webhook (`/api/webhooks/stripe-connect`)

1. **AC-9**: Webhook signature verified using `STRIPE_CONNECT_WEBHOOK_SECRET`
2. **AC-10**: `account.updated` syncs seller account status to `profiles` table
3. **AC-11**: `payout.failed` triggers notification to seller (future)
4. **AC-12**: Payout events logged for monitoring and debugging

---

## 9. Business Logic

### 9.1 Automatic Order Completion

```typescript
// File: /lib/cron/complete-orders.ts

/**
 * Cron job to automatically complete orders after dispute window.
 * 
 * Run every hour via Vercel Cron or similar.
 * 
 * Logic:
 * 1. Find orders in 'delivered' status
 * 2. Where dispute_window_ends_at < NOW
 * 3. And no active dispute exists
 * 4. Create transfer to seller
 * 5. Update order to 'completed'
 */

import { createServiceClient } from '@/lib/supabase/service';
import { createTransferToSeller } from '@/lib/stripe/transfers';

export async function completeEligibleOrders() {
  const supabase = createServiceClient();
  
  // Find orders ready for completion
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      seller_stripe_account_id,
      listing_price_cents,
      stripe_charge_id,
      stripe_transfer_group,
      seller_id
    `)
    .eq('status', 'delivered')
    .eq('payout_status', 'pending')
    .lt('dispute_window_ends_at', new Date().toISOString());
  
  if (error || !orders) {
    console.error('Error fetching orders:', error);
    return;
  }
  
  for (const order of orders) {
    try {
      // Check for active disputes
      const { data: dispute } = await supabase
        .from('order_disputes')
        .select('id')
        .eq('order_id', order.id)
        .eq('status', 'open')
        .single();
      
      if (dispute) {
        console.log(`Order ${order.id} has active dispute, skipping`);
        continue;
      }
      
      // Get seller's Stripe account ID from profile
      const { data: seller } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', order.seller_id)
        .single();
      
      if (!seller?.stripe_account_id) {
        console.error(`Seller ${order.seller_id} has no Stripe account`);
        continue;
      }
      
      // Create transfer to seller's Stripe balance
      const transfer = await createTransferToSeller({
        orderId: order.id,
        sellerStripeAccountId: seller.stripe_account_id,
        amountCents: order.listing_price_cents,
        chargeId: order.stripe_charge_id,
        transferGroup: order.stripe_transfer_group,
      });
      
      // Update order with transfer details
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          payout_status: 'transferred',
          stripe_transfer_id: transfer.transferId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      
      console.log(`Completed order ${order.id}, transfer ${transfer.transferId}, €${(order.listing_price_cents / 100).toFixed(2)} to seller balance`);
      
    } catch (err) {
      console.error(`Error completing order ${order.id}:`, err);
      // Continue with other orders
    }
  }
}
```

### 9.2 Automatic Order Cancellation

```typescript
// File: /lib/cron/cancel-unshipped-orders.ts

/**
 * Cron job to cancel orders where seller didn't ship in time.
 * 
 * Run daily.
 * 
 * Logic:
 * 1. Find orders in 'paid' status
 * 2. Where seller_confirm_deadline < NOW
 * 3. Refund buyer
 * 4. Update order to 'cancelled'
 * 5. Re-list the item
 */

import { createServiceClient } from '@/lib/supabase/service';
import { processRefund } from '@/lib/stripe/refunds';

export async function cancelUnshippedOrders() {
  const supabase = createServiceClient();
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid')
    .lt('seller_confirm_deadline', new Date().toISOString());
  
  if (error || !orders) {
    console.error('Error fetching orders:', error);
    return;
  }
  
  for (const order of orders) {
    try {
      // Process refund
      await processRefund({
        orderId: order.id,
        chargeId: order.stripe_charge_id,
        reason: 'seller_no_ship',
      });
      
      // Update order
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      
      // Re-list the item
      await supabase
        .from('listings')
        .update({ status: 'active' })
        .eq('id', order.listing_id);
      
      // TODO: Notify buyer about cancellation
      // TODO: Warn seller about non-shipment
      
      console.log(`Cancelled unshipped order ${order.id}`);
      
    } catch (err) {
      console.error(`Error cancelling order ${order.id}:`, err);
    }
  }
}
```

### 9.3 Acceptance Criteria

1. **AC-1**: Auto-completion only runs after dispute window ends
2. **AC-2**: Auto-completion skips orders with active disputes
3. **AC-3**: Auto-cancellation triggers refund correctly
4. **AC-4**: Auto-cancellation re-lists the item
5. **AC-5**: Both cron jobs are idempotent

---

## 10. User Interface Requirements

### 10.1 Checkout Flow

**Location**: `/app/[locale]/listings/[id]/page.tsx`

Requirements:
- Display transparent fee breakdown before checkout
- Show service fee and shipping fee separately
- "Buy Now" button creates checkout session and redirects
- Handle checkout cancellation gracefully

### 10.2 Seller Dashboard

**Location**: `/app/[locale]/seller/dashboard/page.tsx`

Requirements:
- Show pending orders requiring shipment
- Display countdown to shipment deadline
- Allow entering tracking number
- Show "Available Balance" (funds in Stripe balance awaiting payout)
- **"Withdraw to Bank" link** → Opens Stripe Express Dashboard where seller can:
  - View their balance
  - Initiate payouts to their bank account
  - View payout history
  - Update bank account details
- Display completed sales history
- Show clear explanation of payout fees (€0.10 + 0.25%) and recommendation to batch withdrawals

**Express Dashboard Link Implementation:**
```typescript
// Generate Express Dashboard login link for seller
const loginLink = await stripe.accounts.createLoginLink(
  seller.stripe_account_id
);
// Redirect seller to: loginLink.url
```

### 10.3 Order Management (Buyer)

**Location**: `/app/[locale]/orders/[id]/page.tsx`

Requirements:
- Show order status with clear visual indicator
- "Confirm Delivery" button when order is shipped
- "File Dispute" option during dispute window
- Show dispute window countdown
- Display refund status if applicable

### 10.4 Acceptance Criteria

1. **AC-1**: Fee breakdown shown before checkout
2. **AC-2**: Seller can confirm shipment with tracking
3. **AC-3**: Buyer can confirm delivery
4. **AC-4**: Buyer can file dispute within window
5. **AC-5**: All statuses have clear visual representation

---

## 11. Testing Requirements

### 11.1 Unit Tests

```typescript
// Required test coverage:

// Fee calculation
describe('calculateServiceFee', () => {
  it('calculates 6% + €0.50 for Instant Buy orders');
  it('rounds to nearest cent');
  it('handles edge cases (€0.01, €1000)');
});

// Transfer creation
describe('createTransferToSeller', () => {
  it('transfers full listing price to seller Stripe balance');
  it('uses source_transaction for fund linkage');
  it('prevents duplicate transfers via idempotency key');
});

// Order state transitions
describe('Order State Machine', () => {
  it('allows pending → paid transition');
  it('allows paid → shipped transition');
  it('allows shipped → delivered transition');
  it('allows delivered → completed transition');
  it('allows delivered → disputed transition');
  it('prevents invalid transitions');
});
```

### 11.2 Integration Tests

```typescript
// Required integration tests:

describe('Checkout Flow', () => {
  it('creates checkout session without transfer_data');
  it('stores correct metadata');
  it('calculates fees correctly');
});

describe('Webhook Handling', () => {
  it('handles checkout.session.completed');
  it('stores charge_id for refunds');
  it('handles duplicate webhooks idempotently');
});

describe('Transfer Flow', () => {
  it('creates transfer with source_transaction');
  it('uses correct transfer_group');
});

describe('Refund Flow', () => {
  it('refunds before transfer successfully');
  it('reverses transfer then refunds after transfer');
});
```

### 11.3 Stripe Test Mode Checklist

```
[ ] Create connected account in test mode
[ ] Complete test onboarding
[ ] Create successful checkout (use 4242424242424242)
[ ] Verify webhook receives checkout.session.completed
[ ] Verify charge_id stored correctly
[ ] Test refund before transfer
[ ] Test full order flow through completion
[ ] Test transfer creation
[ ] Test refund after transfer
[ ] Test dispute flow (use dispute test cards)
```

### 11.4 Acceptance Criteria

1. **AC-1**: All fee calculations have unit tests
2. **AC-2**: All state transitions have tests
3. **AC-3**: Webhook handlers have integration tests
4. **AC-4**: Full flow tested in Stripe test mode

---

## 12. Rollout Plan

### 12.1 Phase 1: Audit & Fix (Week 1)

1. Run current state assessment checklist
2. Identify gaps in current implementation
3. Fix critical issues (charge_id storage, webhook handling)
4. Test in Stripe test mode

### 12.2 Phase 2: Complete Implementation (Week 2)

1. Implement missing components
2. Add cron jobs for auto-completion/cancellation
3. Complete UI components
4. Full integration testing

### 12.3 Phase 3: Testing (Week 3)

1. End-to-end testing in test mode
2. Security review
3. Load testing webhooks
4. Documentation review

### 12.4 Phase 4: Production (Week 4)

1. Configure production Stripe keys
2. Set up production webhooks
3. Enable for limited sellers (beta)
4. Monitor and iterate

---

## 13. Appendix

### 13.1 Stripe API Version

Use API version: `2024-12-18.acacia` or later

### 13.2 Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook Secrets (each webhook has its own secret)
STRIPE_WEBHOOK_SECRET=whsec_...           # Platform webhook (/api/webhooks/stripe)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # Connect webhook (/api/webhooks/stripe-connect)

# Application
NEXT_PUBLIC_APP_URL=https://secondturn.games
```

### 13.3 Stripe Dashboard Configuration (Completed)

The following settings have been configured in Stripe Dashboard (Sandbox/Test mode). Replicate these settings in Live mode before launch.

#### 13.3.1 Platform Profile

| Setting | Value |
|---------|-------|
| Business model | Marketplace — Buyers purchase from platform |
| Charge type | Separate Charges and Transfers |
| Negative balance liability | Platform (`controller.losses.payments = 'application'`) |
| Fee payer | Platform (`controller.fees.payer = 'application'`) |
| Dashboard type | Express Dashboard |
| Onboarding | Stripe-hosted (Account Links) |

#### 13.3.2 Connect Settings

| Setting | Value |
|---------|-------|
| Countries | Latvia (LV), Lithuania (LT), Estonia (EE) |
| Business types | Individual, Company |
| Branding | Second Turn Games logo, orange accent color |

#### 13.3.3 Express Dashboard Features

Configure at: Settings → Connect → Express Dashboard → Features

| Feature | Platform Liability | Notes |
|---------|-------------------|-------|
| View payments | ✓ ON | Sellers see their sales |
| Issue refunds | OFF | Platform handles refunds |
| Manage disputes | OFF | Platform handles disputes |
| Manual payouts | ✓ ON | Sellers can withdraw to bank |
| Edit payout schedule | OFF | Keep sellers on manual |
| Close account | ✓ ON | Allow sellers to close |

#### 13.3.4 Platform Pricing Tool

Configure at: Settings → Connect → Platform pricing

| Setting | Value |
|---------|-------|
| Fee type | Blended |
| Percentage | 6% |
| Fixed amount | €0.50 EUR |
| Conditions | All payment methods (Cards, Revolut Pay, Link, etc.) |
| Fallback | 6% Variable |

**Important:** Do NOT specify `application_fee_amount` in Checkout Sessions — let the Platform Pricing Tool calculate automatically.

#### 13.3.5 Payment Methods

Configure at: Settings → Connect → Payment methods

| Payment Method | Status | Notes |
|----------------|--------|-------|
| Cards | ✓ ON | Primary payment method |
| Apple Pay | ✓ ON | Auto-enabled with cards |
| Google Pay | ✓ ON | Auto-enabled with cards |
| Link | ✓ ON | Stripe's one-click checkout |
| Revolut Pay | ✓ ON | Popular in Baltic region |
| Affirm | OFF | Not relevant (US-only BNPL) |
| All others | OFF | Regional methods not needed |

**Account customization:** Disabled — sellers cannot change payment methods.

#### 13.3.6 Webhooks

**Platform Webhook:**
| Setting | Value |
|---------|-------|
| URL | `https://secondturn.games/api/webhooks/stripe` |
| Events from | Your account |
| Events | `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `transfer.created`, `transfer.reversed` |

**Connect Webhook:**
| Setting | Value |
|---------|-------|
| URL | `https://secondturn.games/api/webhooks/stripe-connect` |
| Events from | Connected accounts |
| Events | `account.updated`, `account.external_account.created`, `account.external_account.deleted`, `payout.paid`, `payout.failed`, `payout.canceled` |

#### 13.3.7 Customer Emails

Configure at: Settings → Business → Customer emails

| Email Type | Status | Notes |
|------------|--------|-------|
| Successful payments | OFF | Platform sends own emails |
| Refunds | OFF | Platform sends own emails |
| All debit/bank emails | OFF | Not using these methods |

#### 13.3.8 Radar Configuration

Configure at: Radar → Rules

**Enabled Rules:**

| Action | Condition | Purpose |
|--------|-----------|---------|
| Allow | Payment matches Stripe allow lists | Trusted payments |
| Block | `:risk_level:` = 'highest' | Very high fraud risk |
| Block | Payment matches Stripe block lists | Known bad actors |
| Block | CVC verification fails + risk score | Stolen card numbers |
| Block | Postal code verification fails + risk score | Address mismatch |
| Request 3DS | 3D Secure is supported for card | Extra authentication |
| Allow | 3DS authenticated + liability shift | Verified payments pass |
| Review | `:risk_level:` = 'elevated' | Medium risk for manual review |

**All 8 rules should be ENABLED.**

### 13.4 Useful Stripe Dashboard Links

- [Connected Accounts](https://dashboard.stripe.com/connect/accounts)
- [Payments](https://dashboard.stripe.com/payments)
- [Transfers](https://dashboard.stripe.com/connect/transfers)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [Radar Rules](https://dashboard.stripe.com/radar/rules)
- [Platform Pricing](https://dashboard.stripe.com/settings/connect/platform_pricing)
- [Test Mode Toggle](https://dashboard.stripe.com/test/dashboard)

### 13.5 Reference Documentation

- [Stripe Connect Overview](https://docs.stripe.com/connect)
- [Separate Charges and Transfers](https://docs.stripe.com/connect/separate-charges-and-transfers)
- [Controller Properties](https://docs.stripe.com/connect/migrate-to-controller-properties)
- [Platform Pricing Tool](https://docs.stripe.com/connect/platform-pricing-tools)
- [Handling Refunds](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes)
- [Express Dashboard](https://docs.stripe.com/connect/express-dashboard)
- [Radar for Platforms](https://docs.stripe.com/radar/radar-for-platforms)

### 13.6 Pre-Launch Checklist

Before going live, ensure these steps are completed:

- [ ] Replicate all Sandbox settings in Live mode
- [ ] Add live webhook endpoints with new signing secrets
- [ ] Update environment variables with live API keys
- [ ] Complete business verification (if not done)
- [ ] Test full payment flow in live mode with small amounts
- [ ] Configure production error monitoring (Sentry, etc.)

---

**End of Document**

*This PRD should be provided to Claude Code for implementation. Claude Code should first run the audit checklist in Section 3, then implement any missing or incorrect components according to the specifications in Sections 5-9.*
