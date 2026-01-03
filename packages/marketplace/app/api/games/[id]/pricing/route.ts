import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/games/[id]/pricing
 *
 * Returns pricing data for a specific game:
 * - External: Lowest new retail price from BoardGamePrices.co.uk
 * - Internal: Marketplace statistics (active listings, sold prices)
 * - Expansions: Pricing for bundled expansions (optional)
 *
 * Query params:
 * - expansions: Comma-separated list of expansion BGG IDs (optional, max 10)
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

  // Parse expansion IDs from query string
  const { searchParams } = new URL(request.url);
  const expansionsParam = searchParams.get('expansions');
  const expansionIds = expansionsParam
    ? expansionsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)).slice(0, 10)
    : [];

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

    // Call the Edge Function with optional expansion IDs
    let edgeFunctionUrl = `${supabaseUrl}/functions/v1/price-check?bgg_game_id=${bggGameId}`;
    if (expansionIds.length > 0) {
      edgeFunctionUrl += `&expansion_ids=${expansionIds.join(',')}`;
    }

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
