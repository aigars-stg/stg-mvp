# Stripe Checkout Implementation Guide for Second Turn Games

This guide walks you through implementing Stripe-hosted Checkout for your marketplace with destination charges and buyer-pays-fees model.

## Overview

**Why Stripe Checkout is perfect for your marketplace:**
- PCI compliance handled by Stripe
- Mobile-optimized, professional payment UI
- Supports multiple payment methods (cards, Apple Pay, Google Pay, iDEAL, etc.)
- Built-in localization (important for Baltic region)
- Less development time compared to custom payment forms

**Your payment flow:**
1. Buyer clicks "Buy" on a listing
2. Your server creates a Checkout Session with destination charges
3. Buyer is redirected to Stripe's hosted payment page
4. After payment, buyer returns to your success page
5. Webhook confirms payment and triggers order fulfillment
6. Seller receives their full listing price via automatic transfer

---

## Step 1: Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

---

## Step 2: Environment Variables

Add to your `.env.local`:

```env
# Stripe Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Webhook Secret (create at https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Your domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Create Stripe Server Utility

Create `lib/stripe.ts`:

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Use latest API version
  typescript: true,
});

// Fee calculation for buyer-pays-fees model
export interface MarketplacePricing {
  listingPriceCents: number;      // What seller asked for
  serviceFeeCents: number;        // Your platform fee
  totalChargeCents: number;       // What buyer pays
  applicationFeeAmount: number;   // What goes back to platform
}

export function calculateMarketplacePricing(
  listingPriceEuros: number,
  deliveryMethod: 'shipping' | 'pickup'
): MarketplacePricing {
  // Convert to cents
  const listingPriceCents = Math.round(listingPriceEuros * 100);
  
  // Your fee structure: 
  // - Shipped items: 3.5% + €0.50
  // - Local pickup: 2.5% + €0.50
  const feePercent = deliveryMethod === 'shipping' ? 0.035 : 0.025;
  const fixedFeeCents = 50; // €0.50
  
  const percentageFeeCents = Math.round(listingPriceCents * feePercent);
  const serviceFeeCents = percentageFeeCents + fixedFeeCents;
  
  // Total the buyer pays
  const totalChargeCents = listingPriceCents + serviceFeeCents;
  
  return {
    listingPriceCents,
    serviceFeeCents,
    totalChargeCents,
    applicationFeeAmount: serviceFeeCents, // This comes back to your platform
  };
}
```

---

## Step 4: Create API Route for Checkout Session

Create `app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe, calculateMarketplacePricing } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to purchase' },
        { status: 401 }
      );
    }

    // Get request body
    const { listingId, deliveryMethod } = await request.json();

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      );
    }

    // Fetch listing details from your database
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        price,
        condition,
        images,
        status,
        seller_id,
        seller:profiles!seller_id (
          id,
          display_name,
          stripe_account_id
        ),
        game:games (
          name,
          thumbnail
        )
      `)
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or not available' },
        { status: 404 }
      );
    }

    // Prevent buying your own listing
    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot buy your own listing' },
        { status: 400 }
      );
    }

    // Check seller has Stripe account
    const sellerStripeAccountId = listing.seller?.stripe_account_id;
    if (!sellerStripeAccountId) {
      return NextResponse.json(
        { error: 'Seller has not set up payment receiving' },
        { status: 400 }
      );
    }

    // Calculate pricing with your fee structure
    const pricing = calculateMarketplacePricing(
      listing.price,
      deliveryMethod || 'shipping'
    );

    // Get buyer's email for prefilling
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Determine image for Checkout page
    const productImage = listing.images?.[0] || listing.game?.thumbnail;

    // Create Checkout Session with destination charges
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      
      // What the buyer sees
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: listing.game?.name || listing.title,
              description: `${listing.condition} condition • Sold by ${listing.seller?.display_name}`,
              images: productImage ? [productImage] : [],
            },
            unit_amount: pricing.listingPriceCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Service Fee',
              description: 'Secure payment processing & buyer protection',
            },
            unit_amount: pricing.serviceFeeCents,
          },
          quantity: 1,
        },
      ],

      // Connect: Destination charges configuration
      payment_intent_data: {
        // Your platform fee (goes back to your account)
        application_fee_amount: pricing.applicationFeeAmount,
        
        // Transfer to seller's Stripe account
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        
        // Metadata for your records
        metadata: {
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_price_cents: pricing.listingPriceCents.toString(),
          service_fee_cents: pricing.serviceFeeCents.toString(),
          delivery_method: deliveryMethod || 'shipping',
        },
      },

      // Prefill buyer's email
      customer_email: buyerProfile?.email || user.email,

      // Collect shipping address if needed
      ...(deliveryMethod === 'shipping' && {
        shipping_address_collection: {
          allowed_countries: ['EE', 'LV', 'LT'], // Baltic countries
        },
      }),

      // Where to redirect after payment
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}`,

      // Store metadata on the session too
      metadata: {
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
      },

      // Expire after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // Return the session URL for redirect
    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Create Buy Button Component

Create `components/checkout/BuyButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BuyButtonProps {
  listingId: string;
  listingPrice: number;
  deliveryMethod: 'shipping' | 'pickup';
  disabled?: boolean;
  className?: string;
}

export function BuyButton({ 
  listingId, 
  listingPrice, 
  deliveryMethod,
  disabled = false,
  className = ''
}: BuyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          deliveryMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={`w-full py-3 px-4 bg-primary text-white font-medium rounded-lg 
          hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors ${className}`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
              />
            </svg>
            Processing...
          </span>
        ) : (
          'Buy Now'
        )}
      </button>
      
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
```

---

## Step 6: Create Pricing Breakdown Component

Create `components/checkout/PricingBreakdown.tsx`:

```typescript
'use client';

interface PricingBreakdownProps {
  listingPrice: number;
  deliveryMethod: 'shipping' | 'pickup';
  shippingCost?: number;
}

export function PricingBreakdown({ 
  listingPrice, 
  deliveryMethod,
  shippingCost = 0 
}: PricingBreakdownProps) {
  // Calculate service fee (matches server-side calculation)
  const feePercent = deliveryMethod === 'shipping' ? 0.035 : 0.025;
  const fixedFee = 0.50;
  const serviceFee = listingPrice * feePercent + fixedFee;
  const total = listingPrice + serviceFee + shippingCost;

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Order Summary</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Item price</span>
          <span className="font-medium">{formatPrice(listingPrice)}</span>
        </div>
        
        {shippingCost > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium">{formatPrice(shippingCost)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600 flex items-center gap-1">
            Service fee
            <button 
              className="text-gray-400 hover:text-gray-600"
              title="Covers secure payment processing and buyer protection"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
          <span className="font-medium">{formatPrice(serviceFee)}</span>
        </div>
      </div>
      
      <div className="border-t pt-3">
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg">{formatPrice(total)}</span>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 pt-2">
        The seller receives {formatPrice(listingPrice)}. Service fee covers 
        secure payment processing and buyer protection.
      </p>
    </div>
  );
}
```

---

## Step 7: Create Success Page

Create `app/orders/success/page.tsx`:

```typescript
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface SuccessPageProps {
  searchParams: { session_id?: string };
}

export default async function OrderSuccessPage({ searchParams }: SuccessPageProps) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    redirect('/');
  }

  // Retrieve the Checkout Session
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items'],
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    redirect('/');
  }

  // Verify payment succeeded
  if (session.payment_status !== 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Pending
          </h1>
          <p className="text-gray-600 mb-6">
            Your payment is being processed. We&apos;ll notify you once it&apos;s confirmed.
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Get order details from metadata
  const listingId = session.metadata?.listing_id;
  const customerEmail = session.customer_details?.email;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. A confirmation email has been sent to{' '}
          <span className="font-medium">{customerEmail}</span>.
        </p>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-3">What happens next?</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>The seller has been notified of your order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>You&apos;ll receive shipping details once the item is dispatched</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Your payment is protected until you confirm receipt</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/orders"
            className="block w-full bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
          >
            View My Orders
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 8: Create Webhook Handler

Create `app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session expired:', session.id);
        // Optionally: Release any reserved inventory
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        // Additional handling if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);
        // Notify buyer of failure
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  // Only process paid sessions
  if (session.payment_status !== 'paid') {
    console.log('Session not paid, skipping:', session.id);
    return;
  }

  const listingId = session.metadata?.listing_id;
  const buyerId = session.metadata?.buyer_id;
  const sellerId = session.metadata?.seller_id;

  if (!listingId || !buyerId || !sellerId) {
    console.error('Missing metadata in session:', session.id);
    return;
  }

  // Get PaymentIntent for more details
  const paymentIntent = typeof session.payment_intent === 'string'
    ? await stripe.paymentIntents.retrieve(session.payment_intent)
    : session.payment_intent;

  // Extract shipping address if collected
  const shippingAddress = session.shipping_details?.address;

  // Create order in your database
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntent?.id,
      amount_total: session.amount_total,
      amount_subtotal: session.amount_subtotal,
      currency: session.currency,
      buyer_email: session.customer_details?.email,
      shipping_address: shippingAddress ? {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      } : null,
      metadata: {
        listing_price_cents: session.metadata?.listing_price_cents,
        service_fee_cents: session.metadata?.service_fee_cents,
        delivery_method: session.metadata?.delivery_method,
      },
    })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to create order:', orderError);
    throw orderError;
  }

  // Mark listing as sold
  const { error: listingError } = await supabaseAdmin
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listingId);

  if (listingError) {
    console.error('Failed to update listing status:', listingError);
  }

  // TODO: Send notification emails to buyer and seller
  // await sendOrderConfirmationEmail(order);
  // await sendSaleNotificationEmail(order);

  console.log('Order created successfully:', order.id);
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  // Find and update the order
  const { error } = await supabaseAdmin
    .from('orders')
    .update({ 
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (error) {
    console.error('Failed to update order status to refunded:', error);
  }

  // Optionally: Restore listing to active status
  // await supabaseAdmin.from('listings').update({ status: 'active' })...
}
```

---

## Step 9: Configure Webhook in Stripe Dashboard

1. Go to **Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret to your `.env.local`

**For local testing**, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret that appears and add to .env.local
```

---

## Step 10: Database Schema for Orders

Run this SQL in Supabase:

```sql
-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Stripe references
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Amounts (in cents)
  amount_total INTEGER NOT NULL,
  amount_subtotal INTEGER,
  currency TEXT DEFAULT 'eur',
  
  -- Buyer details
  buyer_email TEXT,
  shipping_address JSONB,
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'disputed'
  ))
);

-- Indexes
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_listing ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_stripe_session ON orders(stripe_checkout_session_id);
CREATE INDEX idx_orders_stripe_pi ON orders(stripe_payment_intent_id);

-- RLS Policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their orders
CREATE POLICY "Buyers can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view orders for their listings
CREATE POLICY "Sellers can view orders for their listings"
  ON orders FOR SELECT
  USING (auth.uid() = seller_id);

-- Only webhooks can insert (via service role)
-- No direct insert policy for regular users

-- Update trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 11: Usage Example in Listing Page

```typescript
// app/listings/[id]/page.tsx
import { BuyButton } from '@/components/checkout/BuyButton';
import { PricingBreakdown } from '@/components/checkout/PricingBreakdown';

export default async function ListingPage({ params }: { params: { id: string } }) {
  // Fetch listing...
  const listing = await getListingById(params.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Listing details... */}
      
      {/* Purchase sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 bg-white rounded-lg shadow p-6 space-y-4">
          <PricingBreakdown
            listingPrice={listing.price}
            deliveryMethod="shipping"
            shippingCost={2} // Your €2 Unisend flat rate
          />
          
          <BuyButton
            listingId={listing.id}
            listingPrice={listing.price}
            deliveryMethod="shipping"
          />
          
          <p className="text-xs text-gray-500 text-center">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

Before going live, test these scenarios:

| Test Card | Result |
|-----------|--------|
| `4242424242424242` | Payment succeeds |
| `4000002500003155` | Requires 3D Secure authentication |
| `4000000000009995` | Payment declined |

**Test the full flow:**
1. ✅ Create checkout session
2. ✅ Redirect to Stripe Checkout
3. ✅ Complete payment with test card
4. ✅ Redirect to success page
5. ✅ Webhook creates order
6. ✅ Listing marked as sold
7. ✅ Seller receives transfer (check in Stripe Dashboard → Connect)

---

## Next Steps

After this is working:

1. **Seller onboarding** - Create Express account for sellers
2. **Email notifications** - Order confirmations, sale alerts
3. **Shipping integration** - Connect with Unisend
4. **Refund handling** - Admin interface for processing refunds
5. **Order tracking** - Buyer and seller dashboards

Would you like me to help with any of these next steps?
