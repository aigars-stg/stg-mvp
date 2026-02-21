import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getTerminals, TerminalCountry, UnisendApiError } from '@/lib/unisend';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/shipping/terminals
 *
 * Fetch available Unisend terminals for a country
 * Query params:
 *   - country: LT | LV | EE (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') as TerminalCountry;

    // Validate country
    if (!country || !['LT', 'LV', 'EE'].includes(country)) {
      return NextResponse.json(
        { error: 'Valid country is required (LT, LV, or EE)' },
        { status: 400 }
      );
    }

    const terminals = await getTerminals(country);

    return NextResponse.json({
      terminals,
      country,
      count: terminals.length,
    });
  } catch (error) {
    if (error instanceof UnisendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return handleApiError(error, 'Fetch terminals');
  }
}
