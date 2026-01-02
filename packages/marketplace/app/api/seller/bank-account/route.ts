import { NextRequest, NextResponse } from 'next/server';
import { addBankAccount, getBankAccountInfo, validateIBAN } from '@/lib/stripe/bank-account-service';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/seller/bank-account
 *
 * Get seller's bank account info (display only - last4, bank name)
 */
export async function GET(request: NextRequest) {
  try {
    const { response, user } = await requireAuth();
    if (response) return response;

    const bankInfo = await getBankAccountInfo(user.id);

    return NextResponse.json(bankInfo);
  } catch (error) {
    return handleApiError(error, 'Fetch bank account info');
  }
}

/**
 * POST /api/seller/bank-account
 *
 * Add a bank account for seller payouts
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

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
  } catch (error) {
    return handleApiError(error, 'Add bank account');
  }
}
