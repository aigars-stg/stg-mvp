import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

// Type for DAC7 seller data with joined user profile
interface Dac7SellerExportData {
  user_id: string;
  dac7_compliance_status: string | null;
  dac7_annual_transaction_count: number | null;
  dac7_annual_sales_total: number | null;
  dac7_reporting_year: number | null;
  dac7_tax_id: string | null;
  dac7_tax_id_type: string | null;
  dac7_full_legal_name: string | null;
  dac7_date_of_birth: string | null;
  dac7_address_street: string | null;
  dac7_address_city: string | null;
  dac7_address_postal_code: string | null;
  dac7_address_country: string | null;
  dac7_tax_residency_country: string | null;
  dac7_info_submitted_at: string | null;
  dac7_info_verified: boolean | null;
  seller_status: string | null;
  user_profiles: {
    email: string | null;
    full_name: string | null;
    country: string | null;
  } | null;
}

/**
 * GET /api/staff/dac7/export
 *
 * Staff-only endpoint to export reportable sellers data as CSV.
 * Only exports sellers who have exceeded thresholds (compliant or required status).
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
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify staff status using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('is_staff')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_staff) {
      return NextResponse.json(
        { error: 'Staff access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const reportingYear = searchParams.get('year') || new Date().getFullYear().toString();

    // Fetch all reportable sellers (those who have exceeded thresholds)
    const { data: sellers, error: queryError } = await serviceClient
      .from('seller_profiles')
      .select(
        `
        user_id,
        dac7_compliance_status,
        dac7_annual_transaction_count,
        dac7_annual_sales_total,
        dac7_reporting_year,
        dac7_tax_id,
        dac7_tax_id_type,
        dac7_full_legal_name,
        dac7_date_of_birth,
        dac7_address_street,
        dac7_address_city,
        dac7_address_postal_code,
        dac7_address_country,
        dac7_tax_residency_country,
        dac7_info_submitted_at,
        dac7_info_verified,
        seller_status,
        user_profiles!inner (
          email,
          full_name,
          country
        )
      `
      )
      .eq('seller_status', 'active')
      .in('dac7_compliance_status', ['compliant', 'required', 'blocked'])
      .order('dac7_annual_sales_total', { ascending: false });

    if (queryError) {
      throw new Error(`Failed to fetch sellers: ${queryError.message}`);
    }

    // Generate CSV content
    const headers = [
      'Seller ID',
      'Email',
      'Full Legal Name',
      'Date of Birth',
      'Address Street',
      'Address City',
      'Postal Code',
      'Address Country',
      'Tax Residency Country',
      'Tax ID',
      'Tax ID Type',
      'Annual Transactions',
      'Annual Sales (EUR)',
      'Reporting Year',
      'Compliance Status',
      'Tax Info Submitted',
      'Verified',
    ];

    const rows = ((sellers || []) as Dac7SellerExportData[]).map((seller) => [
      seller.user_id,
      seller.user_profiles?.email || '',
      seller.dac7_full_legal_name || seller.user_profiles?.full_name || '',
      seller.dac7_date_of_birth || '',
      seller.dac7_address_street || '',
      seller.dac7_address_city || '',
      seller.dac7_address_postal_code || '',
      seller.dac7_address_country || seller.user_profiles?.country || '',
      seller.dac7_tax_residency_country || '',
      seller.dac7_tax_id || '',
      seller.dac7_tax_id_type || '',
      seller.dac7_annual_transaction_count || 0,
      seller.dac7_annual_sales_total?.toFixed(2) || '0.00',
      seller.dac7_reporting_year || reportingYear,
      seller.dac7_compliance_status || 'unknown',
      seller.dac7_info_submitted_at ? 'Yes' : 'No',
      seller.dac7_info_verified ? 'Yes' : 'No',
    ]);

    // Escape CSV values
    const escapeCSV = (value: string | number | boolean | null | undefined): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return as CSV file
    const filename = `dac7-reportable-sellers-${reportingYear}-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Export DAC7');
  }
}
