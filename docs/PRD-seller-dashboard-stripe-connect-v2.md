# PRD: Seller Dashboard with Managed Stripe Connect Integration

**Product:** Second Turn Games  
**Author:** Aigars  
**Status:** Draft v2  
**Created:** November 2025  
**Updated:** November 2025 — Revised to work with existing schema

---

## 1. Overview

### 1.1 Problem Statement

The current implementation redirects sellers to Stripe's hosted onboarding flow, which:
- Creates a disjointed user experience
- Provides limited control over progressive information collection
- Doesn't align with our "browse-first" and incremental profile building philosophy

### 1.2 Proposed Solution

Replace direct Stripe onboarding with a managed approach where Second Turn owns the seller dashboard UX, collects information incrementally, syncs data to Stripe via API, and surfaces Stripe's requirements through our own interface.

### 1.3 Payment Flow (Option A)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTOMATIC: Order Completion → Seller's Stripe Balance                      │
│                                                                             │
│  1. Buyer pays → Funds held in platform Stripe account                      │
│  2. Order marked complete → Automatic transfer to seller's Stripe balance   │
│  3. Tracked in: payout_transactions table (existing)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANUAL: Seller's Stripe Balance → Bank Account                             │
│                                                                             │
│  1. Seller sees accumulated balance in dashboard                            │
│  2. Seller requests payout when ready                                       │
│  3. Funds sent to seller's bank account                                     │
│  4. Tracked in: seller_payouts table (new)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Key Principles

- **Progressive disclosure**: Collect only what's needed at each stage
- **Leverage existing schema**: Extend user_profiles, use existing order/payout tables
- **Graceful degradation**: If Stripe requires hosted verification, handle it seamlessly
- **Trust building**: Sellers see their earnings before providing bank details

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Seamless seller onboarding within Second Turn's branded experience
- Incremental information collection aligned with seller journey milestones
- Full payout management (balance, withdrawals, history) without leaving the platform
- Real-time sync with Stripe requirements via webhooks
- Support for all three Baltic markets (LV, LT, EE)

### 2.2 Non-Goals

- Custom identity document verification UI (use Stripe hosted when required)
- Supporting business/professional seller accounts (individuals only for now)
- Instant payouts (standard payout timing is sufficient for launch)
- Multi-currency support beyond EUR
- Changing automatic per-order transfer logic (keep existing flow)

---

## 3. User Journey

### 3.1 Seller Journey Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: Pre-Listing                                                       │
│  Trigger: User clicks "Start Selling" or "Create Listing"                   │
│  Collect: Name, Country (from existing profile), Email (from auth)          │
│  Stripe: Create Express account with pre-filled data                        │
│  DB: user_profiles.seller_status = 'onboarding'                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 2: First Listing Created                                             │
│  Trigger: Listing saved successfully                                        │
│  Collect: Nothing additional                                                │
│  Stripe: Account exists, may have pending requirements                      │
│  DB: user_profiles.seller_status = 'active' (if requirements met)           │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 3: First Sale Completes                                              │
│  Trigger: Order status → 'completed'                                        │
│  Automatic: Transfer created to seller's Stripe balance                     │
│  DB: payout_transactions record created (existing flow)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  STAGE 4: Ready to Withdraw                                                 │
│  Trigger: Seller has balance and wants payout                               │
│  Collect: Bank account (IBAN) — only at this point                          │
│  Stripe: External account added, payout initiated                           │
│  DB: seller_payouts record created                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 User Stories

#### Onboarding

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S1 | As a user, I want to start selling without lengthy forms | Stripe account created with data from existing profile |
| S2 | As a seller, I want to see what information is still needed | Dashboard shows clear checklist of pending requirements |
| S3 | As a seller, I want to provide information incrementally | Each requirement can be completed independently |
| S4 | As a seller, I want to complete identity verification if required | Smooth redirect to Stripe hosted verification |

#### Balance & Earnings

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| B1 | As a seller, I want to see my current balance | Balance displayed prominently in dashboard |
| B2 | As a seller, I want to see pending payments | Separate display of available vs pending amounts |
| B3 | As a seller, I want to see earnings per sale | Transaction history showing orders and net amounts |
| B4 | As a seller, I want to understand fees | Clear breakdown of platform fee vs net amount |

#### Payouts

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| P1 | As a seller, I want to add my bank account when I'm ready | IBAN input available when seller has balance |
| P2 | As a seller, I want to request a payout | Manual payout trigger with confirmation |
| P3 | As a seller, I want to see payout history | List of past payouts with status and dates |
| P4 | As a seller, I want to know when I'll receive money | Clear indication of payout timing |

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│   Second Turn    │◄───────►│    Supabase      │◄───────►│     Stripe       │
│   Frontend       │         │    Backend       │         │    Connect       │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                            │                            │
        │                            │                            │
        ▼                            ▼                            ▼
   React Components            Edge Functions              Express Accounts
   - SellerDashboard           - create-seller-account     - Capabilities
   - RequirementsCard          - update-seller-info        - Requirements
   - BalanceDisplay            - sync-stripe-status        - Balance
   - PayoutManager             - add-bank-account          - Payouts
   - TransactionHistory        - request-payout            - Transfers
                               - stripe-webhook-handler
```

### 4.2 Data Flow

**Outbound (Second Turn → Stripe):**
1. User updates info in dashboard
2. Frontend calls Supabase Edge Function
3. Edge Function updates user_profiles + calls Stripe API
4. Success/failure returned to frontend

**Inbound (Stripe → Second Turn):**
1. Stripe sends webhook event
2. Edge Function validates signature
3. Updates user_profiles Stripe fields
4. Frontend reflects changes on next load

**Automatic Transfer Flow (existing):**
1. Order completes → existing transfer logic triggers
2. payout_transactions record created
3. orders.payout_status updated

**Manual Bank Payout Flow (new):**
1. Seller requests payout in dashboard
2. Edge Function creates Stripe payout
3. seller_payouts record created
4. Webhook updates status as payout progresses

### 4.3 Stripe Account Configuration

```javascript
// Account creation settings
{
  type: 'express',
  country: user.country, // 'LV' | 'LT' | 'EE'
  email: user.email,
  business_type: 'individual',
  individual: {
    first_name: extractFirstName(user.full_name),
    last_name: extractLastName(user.full_name),
    email: user.email,
    phone: user.phone // if available
  },
  capabilities: {
    transfers: { requested: true }
  },
  settings: {
    payouts: {
      schedule: {
        interval: 'manual' // Seller-initiated payouts to bank
      }
    }
  }
}
```

---

## 5. Database Schema Changes

### 5.1 Extend: `user_profiles` (add columns)

```sql
-- Add new columns to existing user_profiles table
ALTER TABLE user_profiles

-- Stripe requirements tracking (for managed onboarding UI)
ADD COLUMN stripe_requirements JSONB DEFAULT '{}',
ADD COLUMN stripe_future_requirements JSONB DEFAULT '{}',
ADD COLUMN stripe_capabilities JSONB DEFAULT '{}',

-- Additional seller info for incremental collection
ADD COLUMN date_of_birth DATE,
ADD COLUMN address_line1 TEXT,
ADD COLUMN address_city TEXT,
ADD COLUMN address_postal_code TEXT,

-- Bank account display info (actual IBAN stored only in Stripe)
ADD COLUMN has_bank_account BOOLEAN DEFAULT FALSE,
ADD COLUMN bank_account_last4 VARCHAR(4),
ADD COLUMN bank_account_bank_name VARCHAR(100);

-- Index for sellers needing attention
CREATE INDEX idx_user_profiles_stripe_requirements 
ON user_profiles USING gin (stripe_requirements) 
WHERE seller_status IN ('onboarding', 'active');
```

### 5.2 New Table: `seller_payouts`

Tracks payouts from seller's Stripe balance to their bank account.

```sql
CREATE TABLE seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe payout reference
  stripe_payout_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_connect_account_id VARCHAR(255) NOT NULL,
  
  -- Payout details
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'eur',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Bank account snapshot at time of payout
  bank_account_last4 VARCHAR(4),
  bank_name VARCHAR(100),
  
  -- Timing
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  arrival_date DATE,
  paid_at TIMESTAMPTZ,
  
  -- Error handling
  failure_code VARCHAR(100),
  failure_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT seller_payouts_status_check CHECK (
    status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')
  )
);

-- Indexes
CREATE INDEX idx_seller_payouts_user_id ON seller_payouts(user_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status) 
  WHERE status IN ('pending', 'in_transit');
CREATE INDEX idx_seller_payouts_created ON seller_payouts(created_at DESC);

-- RLS
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts"
  ON seller_payouts FOR SELECT
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_seller_payouts_updated_at 
  BEFORE UPDATE ON seller_payouts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.3 Existing Tables (No Changes Needed)

These tables already support the seller dashboard:

| Table | Use in Dashboard |
|-------|------------------|
| `orders` | Transaction history, earnings per sale |
| `payout_transactions` | Transfer records (platform → seller balance) |
| `order_items` | Sale details (game name, price) |

### 5.4 Views for Dashboard Queries

```sql
-- Seller earnings summary view
CREATE VIEW seller_earnings_summary AS
SELECT 
  pt.seller_id as user_id,
  COUNT(*) as total_sales,
  SUM(pt.gross_amount) as total_gross,
  SUM(pt.platform_fee) as total_fees,
  SUM(pt.net_amount) as total_net,
  COUNT(*) FILTER (WHERE pt.status = 'completed') as completed_transfers,
  COUNT(*) FILTER (WHERE pt.status = 'pending') as pending_transfers
FROM payout_transactions pt
GROUP BY pt.seller_id;

-- Seller transaction history view (combines orders + payouts)
CREATE VIEW seller_transaction_history AS
SELECT 
  o.id,
  o.seller_id as user_id,
  'sale' as type,
  o.order_number as reference,
  pt.status,
  o.items_total as gross_amount,
  COALESCE(pt.platform_fee, 0) as platform_fee,
  COALESCE(pt.net_amount, o.items_total) as net_amount,
  oi.game_name as description,
  o.created_at,
  o.paid_at as completed_at
FROM orders o
LEFT JOIN payout_transactions pt ON pt.order_id = o.id
LEFT JOIN LATERAL (
  SELECT game_name FROM order_items WHERE order_id = o.id LIMIT 1
) oi ON true
WHERE o.status NOT IN ('pending_payment', 'cancelled')

UNION ALL

SELECT
  sp.id,
  sp.user_id,
  'payout' as type,
  sp.stripe_payout_id as reference,
  sp.status,
  -sp.amount as gross_amount,
  0 as platform_fee,
  -sp.amount as net_amount,
  CONCAT('Payout to ****', sp.bank_account_last4) as description,
  sp.created_at,
  sp.paid_at as completed_at
FROM seller_payouts sp

ORDER BY created_at DESC;
```

---

## 6. API Endpoints (Edge Functions)

### 6.1 `POST /functions/v1/create-seller-account`

Creates Stripe Express account and updates user_profiles.

**Request:**
```typescript
{
  // No body needed - uses authenticated user's existing profile
}
```

**Response:**
```typescript
{
  success: boolean,
  stripe_account_id: string,
  requirements: {
    currently_due: string[],
    eventually_due: string[],
    pending_verification: string[]
  }
}
```

**Logic:**
1. Get authenticated user from Supabase auth
2. Verify user doesn't already have stripe_connect_account_id
3. Fetch user_profiles for pre-fill data (full_name, email, phone, country)
4. Create Stripe Express account with pre-filled data
5. Update user_profiles with Stripe account info
6. Return requirements from Stripe

```typescript
// Edge Function implementation outline
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );
  
  // Get authenticated user
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profile.stripe_connect_account_id) {
    return new Response(
      JSON.stringify({ error: 'Seller account already exists' }), 
      { status: 400 }
    );
  }
  
  // Parse name
  const nameParts = profile.full_name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || nameParts[0];
  
  // Create Stripe Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: profile.country || 'LV',
    email: profile.email,
    business_type: 'individual',
    individual: {
      first_name: firstName,
      last_name: lastName,
      email: profile.email,
      ...(profile.phone && { phone: profile.phone }),
    },
    capabilities: {
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: { interval: 'manual' },
      },
    },
  });
  
  // Update user_profiles
  await supabase
    .from('user_profiles')
    .update({
      stripe_connect_account_id: account.id,
      seller_status: 'onboarding',
      stripe_requirements: account.requirements,
      stripe_capabilities: account.capabilities,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  
  return new Response(JSON.stringify({
    success: true,
    stripe_account_id: account.id,
    requirements: {
      currently_due: account.requirements.currently_due,
      eventually_due: account.requirements.eventually_due,
      pending_verification: account.requirements.pending_verification,
    },
  }));
});
```

### 6.2 `PATCH /functions/v1/update-seller-info`

Updates seller information, syncs to Stripe.

**Request:**
```typescript
{
  first_name?: string,
  last_name?: string,
  date_of_birth?: string, // YYYY-MM-DD
  phone?: string,
  address?: {
    line1: string,
    city: string,
    postal_code: string
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  requirements: {
    currently_due: string[],
    eventually_due: string[],
    pending_verification: string[]
  }
}
```

**Logic:**
1. Validate input
2. Update Stripe account via API
3. Update user_profiles with local copy of data
4. Return updated requirements

### 6.3 `POST /functions/v1/add-bank-account`

Adds external bank account for payouts.

**Request:**
```typescript
{
  iban: string,
  account_holder_name: string
}
```

**Response:**
```typescript
{
  success: boolean,
  bank_account: {
    last4: string,
    bank_name: string
  }
}
```

**Logic:**
1. Validate IBAN format for country (LV/LT/EE)
2. Create external account in Stripe
3. Update user_profiles with bank display info
4. Return confirmation

```typescript
// IBAN validation by country
const IBAN_PATTERNS = {
  LV: /^LV\d{2}[A-Z]{4}\d{13}$/,
  LT: /^LT\d{2}\d{16}$/,
  EE: /^EE\d{2}\d{16}$/,
};
```

### 6.4 `GET /functions/v1/seller-balance`

Retrieves current balance from Stripe.

**Response:**
```typescript
{
  available: {
    amount: number, // in cents
    currency: 'eur'
  },
  pending: {
    amount: number,
    currency: 'eur'
  },
  total: {
    amount: number,
    currency: 'eur'
  }
}
```

**Logic:**
1. Get user's stripe_connect_account_id from user_profiles
2. Call Stripe Balance API for connected account
3. Return formatted balance

```typescript
const balance = await stripe.balance.retrieve({
  stripeAccount: profile.stripe_connect_account_id,
});

const eurAvailable = balance.available.find(b => b.currency === 'eur');
const eurPending = balance.pending.find(b => b.currency === 'eur');
```

### 6.5 `POST /functions/v1/request-payout`

Initiates manual payout to seller's bank account.

**Request:**
```typescript
{
  amount?: number // Optional cents, defaults to full available balance
}
```

**Response:**
```typescript
{
  success: boolean,
  payout: {
    id: string,
    amount: number,
    arrival_date: string,
    status: string
  }
}
```

**Logic:**
1. Verify seller has bank account (has_bank_account = true)
2. Get available balance from Stripe
3. Verify requested amount ≤ available balance
4. Create payout in Stripe
5. Create seller_payouts record
6. Return payout details

```typescript
// Create payout on connected account
const payout = await stripe.payouts.create(
  {
    amount: amountInCents,
    currency: 'eur',
  },
  {
    stripeAccount: profile.stripe_connect_account_id,
  }
);

// Record in database
await supabase.from('seller_payouts').insert({
  user_id: user.id,
  stripe_payout_id: payout.id,
  stripe_connect_account_id: profile.stripe_connect_account_id,
  amount: amountInCents / 100, // Store as decimal
  status: payout.status,
  bank_account_last4: profile.bank_account_last4,
  bank_name: profile.bank_account_bank_name,
  arrival_date: new Date(payout.arrival_date * 1000).toISOString().split('T')[0],
});
```

### 6.6 `POST /functions/v1/create-verification-session`

Generates Stripe Account Link for identity verification (fallback).

**Response:**
```typescript
{
  url: string,
  expires_at: number
}
```

**Logic:**
1. Get seller's Stripe account ID
2. Create Account Link for verification only
3. Return URL for redirect

```typescript
const accountLink = await stripe.accountLinks.create({
  account: profile.stripe_connect_account_id,
  refresh_url: `${baseUrl}/seller/onboarding/refresh`,
  return_url: `${baseUrl}/seller/onboarding/complete`,
  type: 'account_onboarding',
  collection_options: {
    fields: 'currently_due',
    future_requirements: 'omit',
  },
});
```

### 6.7 `GET /functions/v1/seller-transactions`

Retrieves transaction history from database.

**Request (query params):**
```typescript
{
  limit?: number,  // default 20, max 100
  offset?: number,
  type?: 'sale' | 'payout' | 'all'
}
```

**Response:**
```typescript
{
  transactions: Array<{
    id: string,
    type: 'sale' | 'payout',
    reference: string,
    status: string,
    gross_amount: number,
    platform_fee: number,
    net_amount: number,
    description: string,
    created_at: string,
    completed_at: string | null
  }>,
  total_count: number,
  has_more: boolean
}
```

**Logic:**
Uses the `seller_transaction_history` view for unified query.

---

## 7. Webhook Handling

### 7.1 Webhook Endpoint: `POST /functions/v1/stripe-connect-webhook`

**Events to Handle:**

| Event | Action |
|-------|--------|
| `account.updated` | Sync requirements, capabilities, status to user_profiles |
| `account.external_account.created` | Update has_bank_account, bank_account_last4, bank_name |
| `account.external_account.deleted` | Clear bank account fields |
| `capability.updated` | Update stripe_capabilities, check if transfers enabled |
| `payout.created` | Update seller_payouts status |
| `payout.paid` | Update seller_payouts status, paid_at |
| `payout.failed` | Update seller_payouts status, failure_message |

### 7.2 Webhook Handler Implementation

```typescript
// supabase/functions/stripe-connect-webhook/index.ts

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );
  
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account);
        break;
        
      case 'account.external_account.created':
        await handleBankAccountCreated(supabase, event.data.object, event.account);
        break;
        
      case 'account.external_account.deleted':
        await handleBankAccountDeleted(supabase, event.account);
        break;
        
      case 'payout.paid':
      case 'payout.failed':
      case 'payout.canceled':
        await handlePayoutUpdate(supabase, event.data.object as Stripe.Payout);
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return new Response('Webhook handler error', { status: 500 });
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function handleAccountUpdated(supabase, account: Stripe.Account) {
  const updates: Record<string, any> = {
    stripe_requirements: account.requirements,
    stripe_future_requirements: account.future_requirements,
    stripe_capabilities: account.capabilities,
    stripe_connect_charges_enabled: account.charges_enabled,
    stripe_connect_payouts_enabled: account.payouts_enabled,
    stripe_connect_details_submitted: account.details_submitted,
    stripe_connect_updated_at: new Date().toISOString(),
  };
  
  // Determine seller_status based on account state
  if (account.charges_enabled && account.details_submitted) {
    updates.seller_status = 'active';
    if (!updates.stripe_connect_onboarding_completed) {
      updates.stripe_connect_onboarding_completed = true;
    }
  } else if (account.requirements?.disabled_reason) {
    updates.seller_status = 'suspended';
  }
  
  await supabase
    .from('user_profiles')
    .update(updates)
    .eq('stripe_connect_account_id', account.id);
}

async function handleBankAccountCreated(supabase, bankAccount: any, accountId: string) {
  if (bankAccount.object !== 'bank_account') return;
  
  await supabase
    .from('user_profiles')
    .update({
      has_bank_account: true,
      bank_account_last4: bankAccount.last4,
      bank_account_bank_name: bankAccount.bank_name,
    })
    .eq('stripe_connect_account_id', accountId);
}

async function handleBankAccountDeleted(supabase, accountId: string) {
  await supabase
    .from('user_profiles')
    .update({
      has_bank_account: false,
      bank_account_last4: null,
      bank_account_bank_name: null,
    })
    .eq('stripe_connect_account_id', accountId);
}

async function handlePayoutUpdate(supabase, payout: Stripe.Payout) {
  const updates: Record<string, any> = {
    status: payout.status,
    updated_at: new Date().toISOString(),
  };
  
  if (payout.status === 'paid') {
    updates.paid_at = new Date(payout.arrival_date * 1000).toISOString();
  } else if (payout.status === 'failed') {
    updates.failure_code = payout.failure_code;
    updates.failure_message = payout.failure_message;
  }
  
  await supabase
    .from('seller_payouts')
    .update(updates)
    .eq('stripe_payout_id', payout.id);
}
```

### 7.3 Requirements Mapping

Map Stripe requirement codes to user-friendly messages:

```typescript
const REQUIREMENT_MESSAGES: Record<string, { 
  title: string; 
  description: string;
  field?: string; // Maps to our form field
}> = {
  'individual.first_name': {
    title: 'First name',
    description: 'Your legal first name',
    field: 'first_name'
  },
  'individual.last_name': {
    title: 'Last name',
    description: 'Your legal last name',
    field: 'last_name'
  },
  'individual.dob.day': {
    title: 'Date of birth',
    description: 'Required for identity verification',
    field: 'date_of_birth'
  },
  'individual.dob.month': {
    title: 'Date of birth',
    description: 'Required for identity verification',
    field: 'date_of_birth'
  },
  'individual.dob.year': {
    title: 'Date of birth',
    description: 'Required for identity verification',
    field: 'date_of_birth'
  },
  'individual.address.line1': {
    title: 'Street address',
    description: 'Your residential address',
    field: 'address_line1'
  },
  'individual.address.city': {
    title: 'City',
    description: 'Your city of residence',
    field: 'address_city'
  },
  'individual.address.postal_code': {
    title: 'Postal code',
    description: 'Your postal code',
    field: 'address_postal_code'
  },
  'individual.phone': {
    title: 'Phone number',
    description: 'For verification purposes',
    field: 'phone'
  },
  'individual.verification.document': {
    title: 'Identity document',
    description: 'Upload a photo of your ID or passport',
    field: null // Requires Stripe hosted flow
  },
  'external_account': {
    title: 'Bank account',
    description: 'Add your bank account to receive payouts',
    field: 'bank_account'
  }
};

// Helper to check if requirement needs Stripe hosted flow
function requiresStripeHostedFlow(requirement: string): boolean {
  return requirement.includes('verification.document') || 
         requirement.includes('verification.additional_document');
}
```

---

## 8. UI Components

### 8.1 Component Hierarchy

```
/app/[locale]/seller/
├── page.tsx                    # Seller Dashboard (main entry)
├── layout.tsx                  # Seller area layout with nav
├── onboarding/
│   └── complete/
│       └── page.tsx           # Return from Stripe verification
├── balance/
│   └── page.tsx               # Detailed balance & payout history
├── transactions/
│   └── page.tsx               # Full transaction history
└── settings/
    └── page.tsx               # Personal info, bank account management

/components/seller/
├── SellerDashboard.tsx         # Main dashboard container
├── OnboardingProgress.tsx      # Requirements checklist
├── RequirementItem.tsx         # Individual requirement row
├── BalanceCard.tsx             # Balance summary widget
├── PayoutButton.tsx            # Request payout CTA
├── PayoutConfirmModal.tsx      # Payout confirmation dialog
├── PayoutHistory.tsx           # List of bank payouts
├── TransactionList.tsx         # Sales list
├── TransactionRow.tsx          # Individual transaction
├── BankAccountForm.tsx         # IBAN input
├── BankAccountCard.tsx         # Current bank account display
├── PersonalInfoForm.tsx        # Name, DOB, address, phone
├── VerificationBanner.tsx      # Prompt for Stripe verification
└── SellerStatusBadge.tsx       # Status indicator
```

### 8.2 Seller Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Seller Dashboard                                              [Settings ⚙️] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  💰 Your Balance            │  │  📋 Account Status                  │  │
│  │                             │  │                                     │  │
│  │  Available    €124.50       │  │  ✓ Account created                  │  │
│  │  Pending       €45.00       │  │  ✓ Personal info                    │  │
│  │               ─────────     │  │  ✓ Identity verified                │  │
│  │  Total        €169.50       │  │  ○ Add bank account                 │  │
│  │                             │  │                                     │  │
│  │  [Request Payout]           │  │  Ready to receive payments ✓        │  │
│  │                             │  │                                     │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Recent Sales                                           [View All →]   ││
│  │                                                                         ││
│  │  Nov 24  Catan Base Game                    €25.00  →  €22.13 net  ✓   ││
│  │  Nov 22  Ticket to Ride Europe              €32.00  →  €28.38 net  ✓   ││
│  │  Nov 20  Wingspan                           €38.00  →  €33.83 net  ⏳  ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Recent Payouts                                         [View All →]   ││
│  │                                                                         ││
│  │  Nov 18  Payout to ****4532                 €67.50     Completed ✓     ││
│  │  Nov 04  Payout to ****4532                 €89.00     Completed ✓     ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 State Variations

**New Seller (No Sales Yet):**
```
┌─────────────────────────────────────────┐
│  💰 Your Balance                        │
│                                         │
│  You haven't made any sales yet.        │
│  Once you sell a game, your earnings    │
│  will appear here.                      │
│                                         │
│  [View Your Listings →]                 │
└─────────────────────────────────────────┘
```

**Has Balance, No Bank Account:**
```
┌─────────────────────────────────────────┐
│  💰 Your Balance                        │
│                                         │
│  Available    €124.50                   │
│  Pending       €45.00                   │
│               ─────────                 │
│  Total        €169.50                   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Add a bank account to withdraw    │  │
│  │ your earnings.                    │  │
│  │                                   │  │
│  │ [Add Bank Account]                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Verification Required:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Action Required                                              │
│                                                                 │
│  Stripe needs to verify your identity before you can receive    │
│  payments. This usually takes 1-2 minutes.                      │
│                                                                 │
│  [Complete Verification →]                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Bank Account Form

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Bank Account                                               │
│                                                                 │
│  Account Holder Name                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jānis Bērziņš                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IBAN                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LV                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Format: LV00 BANK 0000 0000 0000 0                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔒 Your bank details are securely stored by Stripe.     │   │
│  │    We only store the last 4 digits for display.         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                    [Cancel]  [Add Bank Account] │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Payout Confirmation Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Request Payout                                            [×]  │
│                                                                 │
│  Amount                          €124.50                        │
│  To                              ****4532 (Swedbank)            │
│  Expected arrival                Nov 28, 2025                   │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│                                                                 │
│  ℹ️ Payouts typically arrive within 2 business days.            │
│                                                                 │
│                                     [Cancel]  [Confirm Payout]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Localization

### 9.1 Translation Keys

```json
{
  "seller.dashboard.title": {
    "en": "Seller Dashboard",
    "lv": "Pārdevēja panelis",
    "lt": "Pardavėjo skydelis",
    "et": "Müüja töölaud"
  },
  "seller.balance.available": {
    "en": "Available",
    "lv": "Pieejams",
    "lt": "Galima",
    "et": "Saadaval"
  },
  "seller.balance.pending": {
    "en": "Pending",
    "lv": "Gaida",
    "lt": "Laukiama",
    "et": "Ootel"
  },
  "seller.balance.total": {
    "en": "Total",
    "lv": "Kopā",
    "lt": "Iš viso",
    "et": "Kokku"
  },
  "seller.payout.request": {
    "en": "Request Payout",
    "lv": "Pieprasīt izmaksu",
    "lt": "Prašyti išmokėjimo",
    "et": "Taotle väljamakset"
  },
  "seller.payout.confirm": {
    "en": "Confirm Payout",
    "lv": "Apstiprināt izmaksu",
    "lt": "Patvirtinti išmokėjimą",
    "et": "Kinnita väljamakse"
  },
  "seller.payout.arrival": {
    "en": "Expected arrival",
    "lv": "Paredzamais saņemšanas laiks",
    "lt": "Numatomas gavimas",
    "et": "Eeldatav saabumine"
  },
  "seller.payout.timing_note": {
    "en": "Payouts typically arrive within 2 business days.",
    "lv": "Izmaksas parasti saņem 2 darba dienu laikā.",
    "lt": "Išmokėjimai paprastai gaunami per 2 darbo dienas.",
    "et": "Väljamaksed saabuvad tavaliselt 2 tööpäeva jooksul."
  },
  "seller.bank.add": {
    "en": "Add Bank Account",
    "lv": "Pievienot bankas kontu",
    "lt": "Pridėti banko sąskaitą",
    "et": "Lisa pangakonto"
  },
  "seller.bank.iban": {
    "en": "IBAN",
    "lv": "IBAN",
    "lt": "IBAN",
    "et": "IBAN"
  },
  "seller.bank.holder": {
    "en": "Account Holder Name",
    "lv": "Konta īpašnieka vārds",
    "lt": "Sąskaitos savininko vardas",
    "et": "Konto omaniku nimi"
  },
  "seller.bank.security": {
    "en": "Your bank details are securely stored by Stripe. We only store the last 4 digits for display.",
    "lv": "Jūsu bankas dati tiek droši glabāti Stripe. Mēs saglabājam tikai pēdējos 4 ciparus attēlošanai.",
    "lt": "Jūsų banko duomenys saugiai saugomi Stripe. Mes saugome tik paskutinius 4 skaitmenis rodymui.",
    "et": "Teie pangaandmeid hoitakse turvaliselt Stripe'is. Kuvamiseks salvestame ainult viimased 4 numbrit."
  },
  "seller.verification.required": {
    "en": "Action Required",
    "lv": "Nepieciešama darbība",
    "lt": "Reikalingas veiksmas",
    "et": "Vajalik tegevus"
  },
  "seller.verification.description": {
    "en": "Stripe needs to verify your identity. This usually takes 1-2 minutes.",
    "lv": "Stripe ir jāpārbauda jūsu identitāte. Tas parasti aizņem 1-2 minūtes.",
    "lt": "Stripe turi patvirtinti jūsų tapatybę. Tai paprastai užtrunka 1-2 minutes.",
    "et": "Stripe peab teie isiku kinnitama. See võtab tavaliselt 1-2 minutit."
  },
  "seller.verification.button": {
    "en": "Complete Verification",
    "lv": "Pabeigt verifikāciju",
    "lt": "Užbaigti patvirtinimą",
    "et": "Lõpeta kinnitamine"
  },
  "seller.status.active": {
    "en": "Ready to receive payments",
    "lv": "Gatavs saņemt maksājumus",
    "lt": "Paruošta priimti mokėjimus",
    "et": "Valmis makseid vastu võtma"
  },
  "seller.status.onboarding": {
    "en": "Setup in progress",
    "lv": "Notiek iestatīšana",
    "lt": "Vyksta nustatymas",
    "et": "Seadistamine käib"
  },
  "seller.transactions.sale": {
    "en": "Sale",
    "lv": "Pārdošana",
    "lt": "Pardavimas",
    "et": "Müük"
  },
  "seller.transactions.payout": {
    "en": "Payout",
    "lv": "Izmaksa",
    "lt": "Išmokėjimas",
    "et": "Väljamakse"
  },
  "seller.transactions.net": {
    "en": "net",
    "lv": "neto",
    "lt": "grynais",
    "et": "neto"
  },
  "seller.no_sales": {
    "en": "You haven't made any sales yet.",
    "lv": "Jūs vēl neesat veicis nevienu pārdošanu.",
    "lt": "Dar neturite jokių pardavimų.",
    "et": "Teil pole veel ühtegi müüki."
  },
  "seller.add_bank_prompt": {
    "en": "Add a bank account to withdraw your earnings.",
    "lv": "Pievienojiet bankas kontu, lai izņemtu savus ienākumus.",
    "lt": "Pridėkite banko sąskaitą, kad galėtumėte išsiimti savo uždarbį.",
    "et": "Lisage pangakonto, et oma tulu välja võtta."
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Database & Core Backend (Days 1-3)

**Database:**
- [ ] Add new columns to user_profiles (migration)
- [ ] Create seller_payouts table
- [ ] Create database views for dashboard queries
- [ ] Add RLS policies

**Edge Functions:**
- [ ] `create-seller-account` — account creation with pre-fill
- [ ] `stripe-connect-webhook` — handle account.updated events
- [ ] Update existing seller trigger to use new flow

### Phase 2: Information Collection (Days 3-5)

**Edge Functions:**
- [ ] `update-seller-info` — sync personal info to Stripe
- [ ] `create-verification-session` — fallback for document verification
- [ ] Extend webhook handler for capability updates

**Frontend:**
- [ ] OnboardingProgress component
- [ ] RequirementItem component
- [ ] PersonalInfoForm component
- [ ] VerificationBanner component

### Phase 3: Balance & Transactions (Days 5-7)

**Edge Functions:**
- [ ] `seller-balance` — fetch from Stripe
- [ ] `seller-transactions` — query from database

**Frontend:**
- [ ] SellerDashboard page
- [ ] BalanceCard component
- [ ] TransactionList component
- [ ] TransactionRow component

### Phase 4: Payouts (Days 7-10)

**Edge Functions:**
- [ ] `add-bank-account` — add external account
- [ ] `request-payout` — initiate bank payout
- [ ] Extend webhook handler for payout events

**Frontend:**
- [ ] BankAccountForm component
- [ ] BankAccountCard component
- [ ] PayoutButton component
- [ ] PayoutConfirmModal component
- [ ] PayoutHistory component

### Phase 5: Polish & Testing (Days 10-14)

- [ ] Add all translation strings
- [ ] Loading states and error handling
- [ ] Toast notifications for actions
- [ ] Mobile responsiveness
- [ ] E2E testing with Stripe test mode
- [ ] Edge case testing (failed payouts, verification required, etc.)

---

## 11. Testing

### 11.1 Stripe Test Mode Resources

**Test Bank Accounts:**
```
// Successful payout
IBAN: LV97HABA0012345678910 (any valid format)

// Failed payout (use specific test token)
Token: ba_fail_xxxx
```

**Test Scenarios:**
```
// Trigger verification requirement
Use individual.dob.year = 1901

// Trigger immediate payout failure  
Use specific test external account tokens
```

### 11.2 Test Cases

| Scenario | Steps | Expected |
|----------|-------|----------|
| New seller starts | Click "Start Selling" | Account created, requirements shown |
| Complete all info | Fill personal info form | Status → active |
| Verification required | Triggered by Stripe | Banner shown, redirect works |
| Add bank account | Enter valid IBAN | Bank saved, shown in UI |
| Request payout | Has balance + bank | Payout created, appears in history |
| Payout completes | Webhook received | Status updated, paid_at set |
| Payout fails | Webhook received | Error shown, can retry |

---

## 12. Security Considerations

### 12.1 Data Handling

- Full IBAN never stored in our database
- Only last4 and bank name stored for display
- All Stripe API calls server-side via Edge Functions
- Webhook signatures validated before processing

### 12.2 Authorization

- All endpoints verify authenticated user
- RLS policies prevent cross-user data access
- stripe_connect_account_id validated against user

### 12.3 Input Validation

- IBAN format validation per country
- Amount validation against available balance
- Rate limiting on payout requests

---

## 13. Monitoring

### 13.1 Key Metrics

- Seller account creation rate
- Time from account creation to first payout
- Verification pass/fail rate by country
- Average payout amount
- Payout failure rate

### 13.2 Alerts

- Webhook processing failures
- High verification failure rate
- Payout failures above 1%
- Stripe API errors

---

## 14. Open Questions

1. **Minimum payout amount?**
   Recommendation: €5 minimum to avoid micro-payouts

2. **Automatic payouts option later?**
   Consider adding opt-in weekly/monthly auto-payout in future iteration

3. **Payout timing display:**
   Show Stripe's arrival_date directly, with "typically 2 business days" note

---

## 15. Migration Notes

### 15.1 Existing Sellers

For users with existing `stripe_connect_account_id`:
1. Backfill new columns from Stripe API (one-time script)
2. Fetch current requirements, capabilities
3. Set appropriate seller_status based on account state

### 15.2 Migration Script

```sql
-- Run after adding new columns
-- Then execute backfill Edge Function for each existing seller
SELECT id, stripe_connect_account_id 
FROM user_profiles 
WHERE stripe_connect_account_id IS NOT NULL;
```

---

## 16. Appendix

### 16.1 Stripe API Reference

- [Express Account Creation](https://stripe.com/docs/api/accounts/create)
- [Account Update](https://stripe.com/docs/api/accounts/update)
- [Balance Retrieval](https://stripe.com/docs/api/balance/balance_retrieve)
- [Payout Creation](https://stripe.com/docs/api/payouts/create)
- [Connect Webhooks](https://stripe.com/docs/connect/webhooks)

### 16.2 IBAN Formats

| Country | Format | Example |
|---------|--------|---------|
| Latvia | LV + 2 digits + 4 letters + 13 digits | LV80HABA0551007820366 |
| Lithuania | LT + 2 digits + 16 digits | LT121000011101001000 |
| Estonia | EE + 2 digits + 16 digits | EE382200221020145685 |
