import { NextRequest, NextResponse } from 'next/server';
import { getPaymentMethods } from '@/lib/everypay/client';
import { handleApiError } from '@/lib/api/error-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/payment-methods?country=LV
 * Returns available payment methods filtered by buyer's country.
 * Cards (country_code === null) are always included.
 */
export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get('country');

    const allMethods = await getPaymentMethods();

    const filtered = country
      ? allMethods.filter(
          (m) => m.country_code === null || m.country_code === country
        )
      : allMethods;

    const methods = filtered.map(({ source, display_name, logo_url }) => ({
      source,
      display_name,
      logo_url,
    }));

    return NextResponse.json(methods, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Get payment methods');
  }
}
