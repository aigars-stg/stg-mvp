import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/games/[id]/pricing
 *
 * Returns pricing data for a specific game:
 * - External: Lowest new retail price from BoardGamePrices.co.uk
 * - Internal: Marketplace statistics (active listings, sold prices)
 *
 * Proxies to the price-check Edge Function which handles caching.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bggGameId = params.id;

  if (!bggGameId || isNaN(parseInt(bggGameId))) {
    return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Pricing API] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Call the Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/price-check?bgg_game_id=${bggGameId}`;

    const response = await fetch(edgeFunctionUrl, {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Pricing API] Edge function error:', response.status, errorData);

      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch pricing data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the data with cache headers
    return NextResponse.json(data, {
      headers: {
        // Cache for 5 minutes on client, allow stale for 1 hour while revalidating
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('[Pricing API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
}
