import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';
import { validateTaxId, type TaxIdCountry } from '@/lib/validation/tax-id';
import type { Dac7ComplianceStatus } from '@/lib/types/seller';

interface TaxInfoRequest {
  fullLegalName: string;
  dateOfBirth: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  addressCountry: TaxIdCountry;
  taxResidencyCountry: TaxIdCountry;
  taxId: string;
}

/**
 * GET /api/seller/tax-info
 * Get seller's DAC7 tax information status
 */
export async function GET() {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const { data: sellerProfile, error } = await supabase
      .from('seller_profiles')
      .select(
        `
        dac7_annual_transaction_count,
        dac7_annual_sales_total,
        dac7_reporting_year,
        dac7_compliance_status,
        dac7_full_legal_name,
        dac7_date_of_birth,
        dac7_address_street,
        dac7_address_city,
        dac7_address_postal_code,
        dac7_address_country,
        dac7_tax_residency_country,
        dac7_tax_id,
        dac7_tax_id_type,
        dac7_info_submitted_at,
        dac7_info_verified
      `
      )
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching tax info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tax information' },
        { status: 500 }
      );
    }

    if (!sellerProfile) {
      return NextResponse.json({
        complianceStatus: 'exempt' as Dac7ComplianceStatus,
        annualTransactionCount: 0,
        annualSalesTotal: 0,
        hasSubmittedTaxInfo: false,
        taxInfo: null,
      });
    }

    return NextResponse.json({
      complianceStatus: sellerProfile.dac7_compliance_status || 'exempt',
      annualTransactionCount: sellerProfile.dac7_annual_transaction_count || 0,
      annualSalesTotal: sellerProfile.dac7_annual_sales_total || 0,
      reportingYear: sellerProfile.dac7_reporting_year,
      hasSubmittedTaxInfo: !!sellerProfile.dac7_info_submitted_at,
      isVerified: sellerProfile.dac7_info_verified || false,
      taxInfo: sellerProfile.dac7_info_submitted_at
        ? {
            fullLegalName: sellerProfile.dac7_full_legal_name,
            dateOfBirth: sellerProfile.dac7_date_of_birth,
            addressStreet: sellerProfile.dac7_address_street,
            addressCity: sellerProfile.dac7_address_city,
            addressPostalCode: sellerProfile.dac7_address_postal_code,
            addressCountry: sellerProfile.dac7_address_country,
            taxResidencyCountry: sellerProfile.dac7_tax_residency_country,
            taxId: sellerProfile.dac7_tax_id
              ? `***${sellerProfile.dac7_tax_id.slice(-4)}`
              : null, // Mask tax ID
            taxIdType: sellerProfile.dac7_tax_id_type,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, 'Get tax info');
  }
}

/**
 * POST /api/seller/tax-info
 * Submit DAC7 tax information
 */
export async function POST(request: NextRequest) {
  try {
    const { response, user, supabase } = await requireAuth();
    if (response) return response;

    const body: TaxInfoRequest = await request.json();

    // Validate required fields
    const requiredFields: (keyof TaxInfoRequest)[] = [
      'fullLegalName',
      'dateOfBirth',
      'addressStreet',
      'addressCity',
      'addressPostalCode',
      'addressCountry',
      'taxResidencyCountry',
      'taxId',
    ];

    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate country codes
    const validCountries: TaxIdCountry[] = ['LV', 'LT', 'EE'];
    if (!validCountries.includes(body.addressCountry)) {
      return NextResponse.json(
        { error: 'Invalid address country' },
        { status: 400 }
      );
    }
    if (!validCountries.includes(body.taxResidencyCountry)) {
      return NextResponse.json(
        { error: 'Invalid tax residency country' },
        { status: 400 }
      );
    }

    // Validate date of birth (must be 18+)
    const dob = new Date(body.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();
    const actualAge =
      monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 18) {
      return NextResponse.json(
        { error: 'You must be at least 18 years old' },
        { status: 400 }
      );
    }

    // Validate tax ID format based on tax residency country
    const taxIdValidation = validateTaxId(body.taxId, body.taxResidencyCountry);
    if (!taxIdValidation.valid) {
      return NextResponse.json(
        { error: `Invalid tax ID: ${taxIdValidation.error}` },
        { status: 400 }
      );
    }

    // Determine tax ID type based on country
    const taxIdTypeMap: Record<TaxIdCountry, string> = {
      LV: 'personas_kods',
      LT: 'asmens_kodas',
      EE: 'isikukood',
    };

    // Update seller profile with tax information
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({
        dac7_full_legal_name: body.fullLegalName.trim(),
        dac7_date_of_birth: body.dateOfBirth,
        dac7_address_street: body.addressStreet.trim(),
        dac7_address_city: body.addressCity.trim(),
        dac7_address_postal_code: body.addressPostalCode.trim(),
        dac7_address_country: body.addressCountry,
        dac7_tax_residency_country: body.taxResidencyCountry,
        dac7_tax_id: taxIdValidation.formatted || body.taxId,
        dac7_tax_id_type: taxIdTypeMap[body.taxResidencyCountry],
        dac7_info_submitted_at: new Date().toISOString(),
        // Note: compliance status will be updated automatically by the database trigger
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating tax info:', updateError);
      return NextResponse.json(
        { error: 'Failed to save tax information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tax information submitted successfully',
    });
  } catch (error) {
    return handleApiError(error, 'Submit tax info');
  }
}
