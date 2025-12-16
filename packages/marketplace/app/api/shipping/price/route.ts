import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import {
  getShippingPrice,
  TerminalCountry,
  ParcelSize,
  SHIPPING_PRICES,
} from '@/lib/unisend';

/**
 * GET /api/shipping/price
 *
 * Calculate shipping price for a route
 * Query params:
 *   - from: sender country (LT | LV | EE) - required
 *   - to: receiver country (LT | LV | EE) - required
 *   - size: parcel size (XS | S | M | L) - optional, defaults to 'M' for quotes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') as TerminalCountry;
    const to = searchParams.get('to') as TerminalCountry;
    const size = (searchParams.get('size') as ParcelSize) || 'M';

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

    // Validate size
    if (!['XS', 'S', 'M', 'L'].includes(size)) {
      return NextResponse.json(
        { error: 'Valid parcel size is required (XS, S, M, or L)' },
        { status: 400 }
      );
    }

    const price = getShippingPrice(from, to, size);
    const allPrices = SHIPPING_PRICES[from]?.[to];

    return NextResponse.json({
      from,
      to,
      size,
      price,
      currency: 'EUR',
      // Include all size prices for the route
      prices: allPrices || null,
    });
  } catch (error) {
    console.error('❌ [Shipping Price] Error:', error);

    return NextResponse.json(
      { error: 'Failed to calculate shipping price' },
      { status: 500 }
    );
  }
}
