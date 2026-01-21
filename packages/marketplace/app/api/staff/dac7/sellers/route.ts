import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface SellerDac7Data {
  user_id: string;
  dac7_compliance_status: string | null;
  dac7_annual_transaction_count: number | null;
  dac7_annual_sales_total: number | null;
  dac7_reporting_year: number | null;
  dac7_tax_id: string | null;
  dac7_tax_id_type: string | null;
  dac7_full_legal_name: string | null;
  dac7_info_submitted_at: string | null;
  dac7_info_verified: boolean | null;
  seller_status: string | null;
}

/**
 * GET /api/staff/dac7/sellers
 *
 * Staff-only endpoint to list all sellers with DAC7 data.
 * Supports filtering by compliance status, search, and pagination.
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
    const status = searchParams.get('status'); // exempt, approaching, required, compliant, blocked
    const search = searchParams.get('search');
    const reportingYear = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build query using serviceClient (staff already verified, bypass RLS)
    let query = serviceClient
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
        dac7_info_submitted_at,
        dac7_info_verified,
        seller_status,
        user_profiles!inner (
          email,
          full_name,
          country
        )
      `,
        { count: 'exact' }
      )
      .eq('seller_status', 'active'); // Only active sellers

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('dac7_compliance_status', status);
    }

    if (reportingYear) {
      query = query.eq('dac7_reporting_year', parseInt(reportingYear, 10));
    }

    // Apply search filter (name or email)
    if (search) {
      // Search in user_profiles.full_name or user_profiles.email
      query = query.or(
        `user_profiles.full_name.ilike.%${search}%,user_profiles.email.ilike.%${search}%`
      );
    }

    // Order and paginate
    query = query
      .order('dac7_annual_sales_total', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: sellers, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error fetching DAC7 sellers:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch sellers' },
        { status: 500 }
      );
    }

    // Transform data to flatten user_profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedSellers = (sellers || []).map((seller: any) => ({
      userId: seller.user_id,
      email: seller.user_profiles?.email,
      fullName: seller.user_profiles?.full_name,
      country: seller.user_profiles?.country,
      sellerStatus: seller.seller_status,
      complianceStatus: seller.dac7_compliance_status || 'exempt',
      annualTransactionCount: seller.dac7_annual_transaction_count || 0,
      annualSalesTotal: seller.dac7_annual_sales_total || 0,
      reportingYear: seller.dac7_reporting_year,
      taxId: seller.dac7_tax_id ? `***${seller.dac7_tax_id.slice(-4)}` : null,
      taxIdType: seller.dac7_tax_id_type,
      legalName: seller.dac7_full_legal_name,
      infoSubmittedAt: seller.dac7_info_submitted_at,
      isVerified: seller.dac7_info_verified || false,
    }));

    // Get summary counts
    const { data: summaryData } = await serviceClient
      .from('seller_profiles')
      .select('dac7_compliance_status')
      .eq('seller_status', 'active');

    const summary = {
      total: summaryData?.length || 0,
      exempt: summaryData?.filter((s) => !s.dac7_compliance_status || s.dac7_compliance_status === 'exempt').length || 0,
      approaching: summaryData?.filter((s) => s.dac7_compliance_status === 'approaching').length || 0,
      required: summaryData?.filter((s) => s.dac7_compliance_status === 'required').length || 0,
      compliant: summaryData?.filter((s) => s.dac7_compliance_status === 'compliant').length || 0,
      blocked: summaryData?.filter((s) => s.dac7_compliance_status === 'blocked').length || 0,
    };

    return NextResponse.json({
      sellers: transformedSellers,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in staff DAC7 sellers endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
