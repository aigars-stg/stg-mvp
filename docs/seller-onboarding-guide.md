# Seller Onboarding Guide for Second Turn Games

This guide covers implementing Stripe Express account onboarding for sellers, with special attention to accessing seller information for DAC7 regulatory compliance.

---

## Understanding the Data Access Challenge

With Express accounts, there's a critical limitation you need to understand:

> **After you create an Account Link or Account Session, only a subset of the `individual` property is returned for Express accounts.**

This means Stripe collects comprehensive seller information during onboarding (name, DOB, address, tax ID, bank details), but your platform has **limited API access** to this data.

### What You CAN Access via API (Express Accounts)

| Field | Available | Notes |
|-------|-----------|-------|
| `id` (Stripe Account ID) | ✅ Yes | Always available |
| `email` | ✅ Yes | The seller's email |
| `country` | ✅ Yes | Account country (EE, LV, LT) |
| `business_type` | ✅ Yes | `individual` or `company` |
| `charges_enabled` | ✅ Yes | Can receive payments |
| `payouts_enabled` | ✅ Yes | Can receive payouts |
| `details_submitted` | ✅ Yes | Onboarding complete |
| `individual.first_name` | ⚠️ Limited | Only before Account Link created |
| `individual.last_name` | ⚠️ Limited | Only before Account Link created |
| `individual.dob` | ❌ No | Not returned for Express |
| `individual.address` | ❌ No | Not returned for Express |
| `individual.id_number` (Tax ID) | ❌ No | Not returned for Express |
| Bank account IBAN | ❌ No | Not returned for Express |

### Solutions for DAC7 Compliance

You have three options:

1. **Stripe Platform Tax Reporting** (Recommended) - Stripe's built-in DAC7 solution
2. **Collect data yourself** - Supplement with your own forms
3. **Use Stripe Dashboard exports** - Manual process for reporting

---

## Option 1: Stripe Platform Tax Reporting (Recommended)

Stripe offers a private preview feature specifically for DAC7 and OECD MRDP compliance:

### What It Provides

- **Automatic collection** of tax information through Connect onboarding
- **Validation and verification** of tax IDs where possible
- **Dashboard interface** to review seller tax data
- **XML report generation** for tax authorities
- **PDF statements** for sellers

### How to Enable

1. **Contact Stripe Support** to request access to Platform Tax Reporting (it's in private preview)
2. Once enabled, apply `tax_reporting_additional_verification` to your connected accounts
3. Configure enforcement thresholds (e.g., block payouts after €1,500)

### Integration

```typescript
// When creating an account, request tax reporting verification
const account = await stripe.accounts.create({
  type: 'express',
  country: 'LV',
  email: seller.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  // This triggers additional tax info collection during onboarding
  // (Requires Platform Tax Reporting to be enabled on your account)
});
```

### DAC7 Reporting Thresholds

Remember: You only need to report sellers who exceed BOTH thresholds:
- **30+ transactions** in the reporting period, AND
- **€2,000+ total consideration** in the reporting period

You can track this in your own database and only enable tax reporting verification for sellers approaching these thresholds.

---

## Option 2: Collect Data Yourself (Hybrid Approach)

If you can't wait for Platform Tax Reporting, collect DAC7-required data in your own onboarding flow.

### Database Schema Addition

```sql
-- Add tax reporting fields to profiles table
ALTER TABLE profiles ADD COLUMN tax_data JSONB DEFAULT '{}';

-- Or create a separate table
CREATE TABLE seller_tax_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
  
  -- Identity
  legal_first_name TEXT,
  legal_last_name TEXT,
  date_of_birth DATE,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT, -- ISO country code
  
  -- Tax identifiers
  tax_id TEXT, -- Personal tax ID
  tax_id_type TEXT, -- Type of tax ID (e.g., 'lv_pvn' for Latvia)
  vat_number TEXT, -- If registered for VAT
  
  -- Verification
  tax_id_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Consent
  dac7_consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_ip_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Encrypted for GDPR
  CONSTRAINT valid_country CHECK (country IN ('EE', 'LV', 'LT'))
);

-- RLS: Only the user can view/edit their own tax info
ALTER TABLE seller_tax_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tax info"
  ON seller_tax_info
  USING (auth.uid() = user_id);
```

### When to Collect

You have options for when to request this information:

1. **During seller onboarding** - Before they can list items
2. **Threshold-based** - When approaching €1,500 or 25 transactions
3. **Year-end** - Before December 31 for that year's reporting

For user experience, we recommend **threshold-based collection**:

```typescript
// Check if seller needs to provide tax info
async function checkTaxInfoRequired(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Get seller's transaction stats for current year
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  
  const { data: stats } = await supabase
    .from('orders')
    .select('id, amount_total')
    .eq('seller_id', userId)
    .eq('status', 'delivered')
    .gte('created_at', startOfYear.toISOString());
  
  if (!stats) return false;
  
  const transactionCount = stats.length;
  const totalConsideration = stats.reduce((sum, o) => sum + (o.amount_total / 100), 0);
  
  // Require tax info when approaching thresholds (80% of limit)
  const needsTaxInfo = transactionCount >= 24 || totalConsideration >= 1600;
  
  if (needsTaxInfo) {
    // Check if already provided
    const { data: taxInfo } = await supabase
      .from('seller_tax_info')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    return !taxInfo; // True if no tax info on file
  }
  
  return false;
}
```

---

## Standard Seller Onboarding Implementation

Regardless of which DAC7 approach you choose, here's the core seller onboarding flow:

### Step 1: Create the API Route

Create `app/api/seller/onboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Check if user already has a Stripe account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email, display_name')
      .eq('id', user.id)
      .single();

    let stripeAccountId = profile?.stripe_account_id;

    // Create Stripe Express account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'LV', // Default to Latvia, or detect from user
        email: profile?.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          // Pre-fill what you know
          name: profile?.display_name,
          product_description: 'Selling used board games on Second Turn Games marketplace',
          mcc: '5945', // Hobby, Toy, and Game Shops
          url: `${process.env.NEXT_PUBLIC_APP_URL}/sellers/${user.id}`,
        },
        metadata: {
          platform_user_id: user.id,
        },
      });

      stripeAccountId = account.id;

      // Save Stripe account ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);
    }

    // Create an Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboard?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboard/complete`,
      type: 'account_onboarding',
      collect: 'eventually_due', // Collect all required info upfront
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error('Seller onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}
```

### Step 2: Check Onboarding Status

Create `app/api/seller/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        status: 'not_started',
        canSell: false,
        canReceivePayouts: false,
      });
    }

    // Retrieve account status from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    // Determine status
    let status: 'not_started' | 'incomplete' | 'pending' | 'active' | 'restricted';
    
    if (!account.details_submitted) {
      status = 'incomplete';
    } else if (account.requirements?.currently_due?.length > 0) {
      status = 'pending';
    } else if (!account.charges_enabled || !account.payouts_enabled) {
      status = 'restricted';
    } else {
      status = 'active';
    }

    return NextResponse.json({
      status,
      canSell: account.charges_enabled,
      canReceivePayouts: account.payouts_enabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      },
      // Limited data available for Express accounts
      businessType: account.business_type,
      country: account.country,
      email: account.email,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
```

### Step 3: Create Express Dashboard Link

Create `app/api/seller/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Seller account not found' },
        { status: 404 }
      );
    }

    // Create a login link to the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      profile.stripe_account_id
    );

    return NextResponse.json({ url: loginLink.url });

  } catch (error) {
    console.error('Dashboard link error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard link' },
      { status: 500 }
    );
  }
}
```

### Step 4: Seller Onboarding Page

Create `app/seller/onboard/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SellerOnboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRefresh = searchParams.get('refresh') === 'true';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/seller/status');
      const data = await response.json();
      setStatus(data);
      
      // If already active, redirect to dashboard
      if (data.status === 'active') {
        router.push('/seller/dashboard');
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  const startOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/seller/onboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start onboarding');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Become a Seller
          </h1>
          <p className="text-gray-600 mb-6">
            Start selling your board games on Second Turn Games. You'll need to 
            verify your identity and set up payouts through our secure payment partner, Stripe.
          </p>

          {isRefresh && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                Your session expired. Please continue your onboarding.
              </p>
            </div>
          )}

          {status?.status === 'incomplete' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                You started the onboarding process but haven't completed it yet. 
                Click below to continue.
              </p>
            </div>
          )}

          {status?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                Your account is being reviewed. This usually takes 1-2 business days.
              </p>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Verify your identity</h3>
                <p className="text-sm text-gray-600">
                  Provide your name, address, and date of birth
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Add payout details</h3>
                <p className="text-sm text-gray-600">
                  Connect your bank account to receive payments
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Start selling</h3>
                <p className="text-sm text-gray-600">
                  List your first game and reach buyers across the Baltics
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={startOnboarding}
            disabled={isLoading || status?.status === 'pending'}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg 
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting to Stripe...
              </span>
            ) : status?.status === 'incomplete' ? (
              'Continue Onboarding'
            ) : (
              'Start Seller Onboarding'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to Stripe's{' '}
            <a href="https://stripe.com/legal/connect-account" className="text-primary hover:underline" target="_blank">
              Connected Account Agreement
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Onboarding Complete Page

Create `app/seller/onboard/complete/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OnboardingCompletePage() {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/seller/status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isActive = status?.status === 'active';
  const isPending = status?.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {isActive ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You're ready to sell!
              </h1>
              <p className="text-gray-600 mb-6">
                Your seller account is now active. You can start listing your board games.
              </p>
              <div className="space-y-3">
                <Link
                  href="/listings/new"
                  className="block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
                >
                  Create Your First Listing
                </Link>
                <Link
                  href="/seller/dashboard"
                  className="block w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Go to Seller Dashboard
                </Link>
              </div>
            </>
          ) : isPending ? (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verification in progress
              </h1>
              <p className="text-gray-600 mb-6">
                We're reviewing your information. This usually takes 1-2 business days. 
                We'll notify you by email once your account is approved.
              </p>
              <Link
                href="/"
                className="block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
              >
                Return Home
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Additional information needed
              </h1>
              <p className="text-gray-600 mb-6">
                Please complete your onboarding to start selling.
              </p>
              <Link
                href="/seller/onboard"
                className="block w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90"
              >
                Complete Onboarding
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Add Webhook for Account Updates

Add to your `app/api/webhooks/stripe/route.ts`:

```typescript
// Add these cases to your webhook handler

case 'account.updated': {
  const account = event.data.object as Stripe.Account;
  await handleAccountUpdate(account);
  break;
}

// Handler function
async function handleAccountUpdate(account: Stripe.Account) {
  const userId = account.metadata?.platform_user_id;
  
  if (!userId) {
    console.log('No platform_user_id in account metadata');
    return;
  }

  // Update seller status in your database
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_charges_enabled: account.charges_enabled,
      stripe_payouts_enabled: account.payouts_enabled,
      stripe_details_submitted: account.details_submitted,
      stripe_account_status: determineStatus(account),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update profile:', error);
  }

  // If account just became active, send welcome email
  if (account.charges_enabled && account.payouts_enabled) {
    // TODO: Send "Your seller account is active" email
  }

  // If there are new requirements, notify seller
  if (account.requirements?.currently_due?.length > 0) {
    // TODO: Send "Action required on your seller account" email
  }
}

function determineStatus(account: Stripe.Account): string {
  if (!account.details_submitted) return 'incomplete';
  if (account.requirements?.currently_due?.length > 0) return 'pending';
  if (!account.charges_enabled || !account.payouts_enabled) return 'restricted';
  return 'active';
}
```

---

## Accessing Seller Data for DAC7 Reporting

### Option A: Use Stripe Dashboard Export

1. Go to **Dashboard → Connect → Accounts**
2. Click **Export** to download CSV
3. Available fields include: account ID, email, country, business type, status

**Limitation**: Date of birth and full address are NOT included in the export.

### Option B: Use Stripe Sigma (Paid Feature)

If you have Stripe Sigma, query the `connected_accounts` table:

```sql
SELECT
  id,
  email,
  country,
  business_type,
  created
FROM connected_accounts
WHERE charges_enabled = true
```

### Option C: Contact Stripe Support

For DAC7 reporting, you can request a special data export from Stripe Support that includes the additional fields they've collected.

### Option D: Your Own Database (Recommended Supplement)

Track everything you need in your own database:

```sql
-- View for DAC7 reporting
CREATE VIEW dac7_seller_report AS
SELECT
  p.id as seller_id,
  p.display_name,
  p.email,
  st.legal_first_name,
  st.legal_last_name,
  st.date_of_birth,
  st.address_line1,
  st.address_line2,
  st.city,
  st.postal_code,
  st.country,
  st.tax_id,
  st.vat_number,
  p.stripe_account_id,
  -- Transaction summary
  COUNT(o.id) as transaction_count,
  SUM(o.amount_total) / 100 as total_consideration_eur,
  SUM((o.metadata->>'service_fee_cents')::int) / 100 as total_fees_withheld_eur
FROM profiles p
LEFT JOIN seller_tax_info st ON st.user_id = p.id
LEFT JOIN orders o ON o.seller_id = p.id 
  AND o.status = 'delivered'
  AND o.created_at >= date_trunc('year', CURRENT_DATE)
WHERE p.stripe_account_id IS NOT NULL
GROUP BY p.id, st.id
HAVING COUNT(o.id) >= 30 OR SUM(o.amount_total) >= 200000 -- €2000 in cents
ORDER BY total_consideration_eur DESC;
```

---

## Summary: Your DAC7 Compliance Path

Given your Q4 2025/Q1 2026 launch timeline and January 31, 2027 DAC7 deadline:

### Immediate (Before Launch)
1. ✅ Implement standard Express onboarding (this guide)
2. ✅ Store `stripe_account_id` and track transaction totals
3. ✅ Set up webhooks for account status updates

### Short-term (After Launch)
1. Contact Stripe to enable **Platform Tax Reporting** (private preview)
2. Monitor seller transaction volumes in your database
3. Set up threshold alerts for approaching €2,000/30 transactions

### Before December 2026
1. Ensure all reportable sellers have tax info on file
2. Either via Stripe Platform Tax Reporting, or
3. Via your own collection forms for sellers approaching thresholds

### January 2027
1. Generate DAC7 XML report (via Stripe or manually)
2. Submit to VID (Latvia's tax authority)
3. Provide seller statements

Would you like me to help implement any specific part of this flow?
