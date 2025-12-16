import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getTerminals, TerminalCountry, UnisendApiError } from '@/lib/unisend';

/**
 * GET /api/shipping/terminals
 *
 * Fetch available Unisend terminals for a country
 * Query params:
 *   - country: LT | LV | EE (required)
 *   - search: optional search query for terminal name/address/city
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') as TerminalCountry;
    const search = searchParams.get('search') || undefined;

    // Validate country
    if (!country || !['LT', 'LV', 'EE'].includes(country)) {
      return NextResponse.json(
        { error: 'Valid country is required (LT, LV, or EE)' },
        { status: 400 }
      );
    }

    console.log(`📍 [Terminals] Fetching terminals for ${country}${search ? ` (search: "${search}")` : ''}`);

    const terminals = await getTerminals(country, search);

    console.log(`✅ [Terminals] Found ${terminals.length} terminals`);

    return NextResponse.json({
      terminals,
      country,
      count: terminals.length,
    });
  } catch (error) {
    console.error('❌ [Terminals] Error:', error);

    if (error instanceof UnisendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch terminals' },
      { status: 500 }
    );
  }
}
