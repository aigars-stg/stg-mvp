import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhooks/stripe-connect
 *
 * Stripe Connect webhook handler
 * Handles Connect account events: account.updated, bank account events, payout events
 *
 * IMPORTANT: This uses a SEPARATE webhook secret from the main Stripe webhook
 * Environment variable: STRIPE_CONNECT_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ [Connect Webhook] No signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature with Connect-specific secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('❌ [Connect Webhook] Signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`📨 [Connect Webhook] Received event: ${event.type}`);

    // Handle events
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'account.external_account.created':
        await handleBankAccountCreated(
          event.data.object as Stripe.BankAccount,
          event.account as string
        );
        break;

      case 'account.external_account.deleted':
        await handleBankAccountDeleted(event.account as string);
        break;

      case 'payout.paid':
      case 'payout.failed':
      case 'payout.canceled':
        await handlePayoutUpdate(event.data.object as Stripe.Payout, event.type);
        break;

      default:
        console.log(`ℹ️ [Connect Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ [Connect Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle account.updated event
 * Syncs account requirements, capabilities, and status to seller_profiles
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`🔄 [Connect Webhook] Account updated: ${account.id}`);

  const updates: Record<string, any> = {
    stripe_requirements: account.requirements || {},
    stripe_capabilities: account.capabilities || {},
    stripe_connect_charges_enabled: account.charges_enabled,
    stripe_connect_payouts_enabled: account.payouts_enabled,
    stripe_connect_details_submitted: account.details_submitted,
    stripe_connect_updated_at: new Date().toISOString(),
  };

  // Determine onboarding status
  const onboardingComplete =
    account.charges_enabled === true && account.details_submitted === true;

  updates.stripe_connect_onboarding_completed = onboardingComplete;

  // Update seller_status based on account state
  if (onboardingComplete && account.payouts_enabled) {
    updates.seller_status = 'active';
  } else if (account.requirements?.disabled_reason) {
    updates.seller_status = 'suspended';
  }

  // Update seller_profiles table
  const { error } = await supabase
    .from('seller_profiles')
    .update(updates)
    .eq('stripe_connect_account_id', account.id);

  if (error) {
    console.error('❌ [Connect Webhook] Failed to update seller profile:', error);
  } else {
    console.log(`✅ [Connect Webhook] Seller profile updated for account ${account.id}`);
  }
}

/**
 * Handle account.external_account.created event
 * Updates bank account display info when seller adds a bank account
 */
async function handleBankAccountCreated(
  bankAccount: Stripe.BankAccount,
  stripeAccountId: string
) {
  // Only process bank accounts (not cards)
  if (bankAccount.object !== 'bank_account') {
    console.log(`⏭️ [Connect Webhook] Skipping non-bank account: ${bankAccount.object}`);
    return;
  }

  console.log(`🏦 [Connect Webhook] Bank account added to ${stripeAccountId}`);

  const { error } = await supabase
    .from('seller_profiles')
    .update({
      has_bank_account: true,
      bank_account_last4: bankAccount.last4,
      bank_account_bank_name: bankAccount.bank_name || 'Bank',
    })
    .eq('stripe_connect_account_id', stripeAccountId);

  if (error) {
    console.error('❌ [Connect Webhook] Failed to update bank account info:', error);
  } else {
    console.log(`✅ [Connect Webhook] Bank account info updated: ****${bankAccount.last4}`);
  }
}

/**
 * Handle account.external_account.deleted event
 * Clears bank account display info when seller removes a bank account
 */
async function handleBankAccountDeleted(stripeAccountId: string) {
  console.log(`🏦 [Connect Webhook] Bank account removed from ${stripeAccountId}`);

  const { error } = await supabase
    .from('seller_profiles')
    .update({
      has_bank_account: false,
      bank_account_last4: null,
      bank_account_bank_name: null,
    })
    .eq('stripe_connect_account_id', stripeAccountId);

  if (error) {
    console.error('❌ [Connect Webhook] Failed to clear bank account info:', error);
  } else {
    console.log(`✅ [Connect Webhook] Bank account info cleared`);
  }
}

/**
 * Handle payout.* events
 * Updates seller_payouts table with payout status
 */
async function handlePayoutUpdate(payout: Stripe.Payout, eventType: string) {
  console.log(`💸 [Connect Webhook] Payout ${payout.id} - ${eventType}`);

  const updates: Record<string, any> = {
    status: payout.status,
    updated_at: new Date().toISOString(),
  };

  if (payout.status === 'paid') {
    updates.paid_at = payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : new Date().toISOString();
  } else if (payout.status === 'failed') {
    updates.failure_code = payout.failure_code || 'unknown';
    updates.failure_message = payout.failure_message || 'Payout failed';
  }

  const { error, data } = await supabase
    .from('seller_payouts')
    .update(updates)
    .eq('stripe_payout_id', payout.id)
    .select();

  if (error) {
    console.error('❌ [Connect Webhook] Failed to update payout:', error);
  } else if (!data || data.length === 0) {
    // Payout might not be in our database (created directly in Stripe dashboard)
    console.log(`⚠️ [Connect Webhook] Payout ${payout.id} not found in database`);
  } else {
    console.log(`✅ [Connect Webhook] Payout ${payout.id} updated to ${payout.status}`);
  }
}
