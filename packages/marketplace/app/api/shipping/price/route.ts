import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import {
  getShippingPrice,
  TerminalCountry,
  SHIPPING_PRICES,
} from '@/lib/unisend';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/shipping/price
 *
 * Calculate shipping price for a route
 * Query params:
 *   - from: sender country (LT | LV | EE) - required
 *   - to: receiver country (LT | LV | EE) - required
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') as TerminalCountry;
    const to = searchParams.get('to') as TerminalCountry;

    // Validate countries
    if (!from || !['LT', 'LV', 'EE'].includes(from)) {
      return NextResponse.json(
        { error: 'Valid sender country is required (LT, LV, or EE)' },
        { status: 400 }
      );
    }

    if (!to || !['LT', 'LV', 'EE'].includes(to)) {
      return NextResponse.json(
        { error: 'Valid receiver country is required (LT, LV, or EE)' },
        { status: 400 }
      );
    }

    const price = getShippingPrice(from, to);

    if (price == null) {
      return NextResponse.json(
        { error: 'Shipping not available for this route' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      from,
      to,
      price,
      currency: 'EUR',
    });
  } catch (error) {
    return handleApiError(error, 'Calculate shipping');
  }
}
