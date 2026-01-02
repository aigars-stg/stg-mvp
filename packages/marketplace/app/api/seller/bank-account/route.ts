import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { addBankAccount, getBankAccountInfo, validateIBAN } from '@/lib/stripe/bank-account-service';

/**
 * GET /api/seller/bank-account
 *
 * Get seller's bank account info (display only - last4, bank name)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }

    const bankInfo = await getBankAccountInfo(user.id);

    return NextResponse.json(bankInfo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch bank account info', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/bank-account
 *
 * Add a bank account for seller payouts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { iban, accountHolderName } = body;

    // Validate required fields
    if (!iban || typeof iban !== 'string') {
      return NextResponse.json(
        { error: 'IBAN is required' },
        { status: 400 }
      );
    }

    if (!accountHolderName || typeof accountHolderName !== 'string') {
      return NextResponse.json(
        { error: 'Account holder name is required' },
        { status: 400 }
      );
    }

    // Validate IBAN format
    const validation = validateIBAN(iban);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get seller profile with Connect info
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('stripe_connect_account_id, stripe_connect_payouts_enabled')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if seller has Connect account
    if (!profile.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Complete seller onboarding first' },
        { status: 400 }
      );
    }

    // Check if payouts are enabled
    if (!profile.stripe_connect_payouts_enabled) {
      return NextResponse.json(
        { error: 'Complete Stripe verification first' },
        { status: 400 }
      );
    }

    // Add bank account
    const result = await addBankAccount(
      user.id,
      profile.stripe_connect_account_id,
      iban,
      accountHolderName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bankAccount: result.bankAccount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to add bank account', details: message },
      { status: 500 }
    );
  }
}
