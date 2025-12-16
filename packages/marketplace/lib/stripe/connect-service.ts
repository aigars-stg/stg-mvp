/**
 * Stripe Connect Service
 * Handles seller onboarding and account management
 * SERVER-ONLY: This file should only be imported in API routes
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

interface CreateAccountResult {
  accountId: string;
  onboardingUrl: string;
}

interface SellerPrefillData {
  fullName?: string;
  phone?: string;
}

/**
 * Split full name into first and last name
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Create Stripe Connect Express account for seller
 */
export async function createConnectAccount(
  userId: string,
  email: string,
  country: string = 'LT',
  prefillData?: SellerPrefillData
): Promise<CreateAccountResult> {
  try {
    console.log(`💳 [Stripe Connect] Creating account for user ${userId}`);

    // Prepare individual data (pre-fill from profile)
    const individualData: any = {
      email,
    };

    if (prefillData?.fullName) {
      const { firstName, lastName } = splitName(prefillData.fullName);
      if (firstName) individualData.first_name = firstName;
      if (lastName) individualData.last_name = lastName;
    }

    if (prefillData?.phone) {
      individualData.phone = prefillData.phone;
    }

    // Prepare business profile (only for production URLs)
    const businessProfile: any = {
      mcc: '5945', // Hobby, Toy, and Game Shops
      product_description: 'Private seller of pre-owned board games on Second Turn Games marketplace',
    };

    // Only set URL if we have a production HTTPS URL
    if (APP_URL.startsWith('https://')) {
      businessProfile.url = APP_URL;
    }

    // Create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country.toUpperCase(),
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: individualData,
      business_profile: businessProfile,
      settings: {
        payouts: {
          schedule: {
            interval: 'manual', // Manual payouts - we control when sellers get paid
          },
        },
      },
    });

    console.log(`✅ [Stripe Connect] Account created: ${account.id}`);

    // Store account ID in seller_profiles table (upsert to create if doesn't exist)
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .upsert({
        user_id: userId,
        stripe_connect_account_id: account.id,
        stripe_connect_updated_at: new Date().toISOString(),
        seller_status: 'onboarding',
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('❌ [Stripe Connect] Failed to update seller profile:', updateError);
      throw new Error('Failed to save Connect account');
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_URL}/seller/settings/payouts?refresh=true`,
      return_url: `${APP_URL}/seller/settings/payouts?success=true`,
      type: 'account_onboarding',
    });

    console.log(`✅ [Stripe Connect] Onboarding link created`);

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error: any) {
    console.error('❌ [Stripe Connect] Error creating account:', error);
    throw error;
  }
}

/**
 * Create new onboarding link for existing account
 */
export async function createOnboardingLink(
  accountId: string,
  prefillData?: SellerPrefillData
): Promise<string> {
  try {
    // Update account with business profile only (individual data can't be updated for Express accounts)
    // Individual information is managed by the account holder through Stripe's onboarding UI
    const updateData: any = {};

    // Prepare business profile (only for production URLs)
    const businessProfile: any = {
      mcc: '5945', // Hobby, Toy, and Game Shops
      product_description: 'Private seller of pre-owned board games on Second Turn Games marketplace',
    };

    // Only set URL if we have a production HTTPS URL
    if (APP_URL.startsWith('https://')) {
      businessProfile.url = APP_URL;
    }

    updateData.business_profile = businessProfile;

    // Update the account (only business profile, not individual data)
    await stripe.accounts.update(accountId, updateData);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/seller/settings/payouts?refresh=true`,
      return_url: `${APP_URL}/seller/settings/payouts?success=true`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error: any) {
    console.error('❌ [Stripe Connect] Error creating onboarding link:', error);
    throw error;
  }
}

/**
 * Get Connect account status and sync with database
 */
export async function syncConnectAccountStatus(
  userId: string,
  accountId: string
): Promise<{
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  try {
    console.log(`🔄 [Stripe Connect] Syncing account status: ${accountId}`);

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      onboardingComplete: account.details_submitted === true && account.charges_enabled === true,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
    };

    // Prepare update data for seller_profiles
    const updateData: any = {
      stripe_connect_onboarding_completed: status.onboardingComplete,
      stripe_connect_charges_enabled: status.chargesEnabled,
      stripe_connect_payouts_enabled: status.payoutsEnabled,
      stripe_connect_details_submitted: status.detailsSubmitted,
      stripe_connect_updated_at: new Date().toISOString(),
    };

    // If seller has completed onboarding and can receive payouts, activate seller status
    if (status.onboardingComplete && status.payoutsEnabled) {
      updateData.seller_status = 'active';
    }

    // Update seller_profiles table
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ [Stripe Connect] Failed to update seller status:', updateError);
    } else {
      console.log(`✅ [Stripe Connect] Status synced for user ${userId}`);
    }

    return status;
  } catch (error: any) {
    console.error('❌ [Stripe Connect] Error syncing status:', error);
    throw error;
  }
}

/**
 * Create dashboard login link for seller to manage their account
 */
export async function createDashboardLink(accountId: string): Promise<string> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error: any) {
    console.error('❌ [Stripe Connect] Error creating dashboard link:', error);
    throw error;
  }
}

/**
 * Get Connect account details
 */
export async function getConnectAccountDetails(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);

    return {
      id: account.id,
      email: account.email,
      country: account.country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requiresAction: account.requirements?.currently_due && account.requirements.currently_due.length > 0,
      currentlyDue: account.requirements?.currently_due || [],
      pastDue: account.requirements?.past_due || [],
    };
  } catch (error: any) {
    console.error('❌ [Stripe Connect] Error getting account details:', error);
    throw error;
  }
}
