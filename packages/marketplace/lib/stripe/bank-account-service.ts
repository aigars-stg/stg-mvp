/**
 * Stripe Bank Account Service
 * Handles adding external bank accounts for seller payouts
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

// IBAN patterns for Baltic countries
const IBAN_PATTERNS: Record<string, RegExp> = {
  LV: /^LV\d{2}[A-Z]{4}\d{13}$/, // LV + 2 digits + 4 letters + 13 digits
  LT: /^LT\d{2}\d{16}$/, // LT + 2 digits + 16 digits
  EE: /^EE\d{2}\d{16}$/, // EE + 2 digits + 16 digits
};

export interface AddBankAccountResult {
  success: boolean;
  bankAccount?: {
    last4: string;
    bankName: string;
  };
  error?: string;
}

/**
 * Validate IBAN format for Baltic countries
 */
export function validateIBAN(iban: string): { valid: boolean; country?: string; error?: string } {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

  // Check minimum length
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
    return { valid: false, error: 'IBAN must be between 15 and 34 characters' };
  }

  // Extract country code
  const countryCode = cleanIBAN.substring(0, 2);

  // Check if country is supported
  if (!IBAN_PATTERNS[countryCode]) {
    return {
      valid: false,
      error: `IBAN from ${countryCode} is not supported. We currently support Latvia (LV), Lithuania (LT), and Estonia (EE).`,
    };
  }

  // Validate format for specific country
  if (!IBAN_PATTERNS[countryCode].test(cleanIBAN)) {
    return {
      valid: false,
      error: `Invalid IBAN format for ${countryCode}`,
    };
  }

  return { valid: true, country: countryCode };
}

/**
 * Add external bank account to seller's Stripe Connect account
 */
export async function addBankAccount(
  userId: string,
  stripeAccountId: string,
  iban: string,
  accountHolderName: string
): Promise<AddBankAccountResult> {
  try {
    // Validate IBAN
    const validation = validateIBAN(iban);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Clean IBAN
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

    console.log(`🏦 [Bank Account] Adding bank account for user ${userId}`);

    // Create external account in Stripe
    const bankAccount = await stripe.accounts.createExternalAccount(
      stripeAccountId,
      {
        external_account: {
          object: 'bank_account',
          country: validation.country!,
          currency: 'eur',
          account_holder_name: accountHolderName.trim(),
          account_holder_type: 'individual',
          // Use IBAN for SEPA countries
          account_number: cleanIBAN,
        },
      }
    );

    // Type guard for bank account
    if (bankAccount.object !== 'bank_account') {
      throw new Error('Unexpected account type returned from Stripe');
    }

    const last4 = bankAccount.last4;
    const bankName = bankAccount.bank_name || 'Bank';

    // Update seller profile with bank account display info
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({
        has_bank_account: true,
        bank_account_last4: last4,
        bank_account_bank_name: bankName,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ [Bank Account] Failed to update profile:', updateError);
      // Don't fail the operation - bank account is already added to Stripe
    }

    console.log(`✅ [Bank Account] Bank account added: ****${last4} (${bankName})`);

    return {
      success: true,
      bankAccount: {
        last4,
        bankName,
      },
    };
  } catch (error: any) {
    console.error('❌ [Bank Account] Error adding bank account:', error);

    // Handle Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        success: false,
        error: error.message || 'Invalid bank account details',
      };
    }

    return {
      success: false,
      error: 'Failed to add bank account. Please try again.',
    };
  }
}

/**
 * Get seller's bank account info from database
 */
export async function getBankAccountInfo(
  userId: string
): Promise<{ hasBankAccount: boolean; last4?: string; bankName?: string }> {
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('has_bank_account, bank_account_last4, bank_account_bank_name')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { hasBankAccount: false };
  }

  return {
    hasBankAccount: data.has_bank_account || false,
    last4: data.bank_account_last4,
    bankName: data.bank_account_bank_name,
  };
}
