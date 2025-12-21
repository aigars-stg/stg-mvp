/**
 * Edge Function: price-check
 *
 * Fetches and caches pricing data for a game:
 * - External: BoardGamePrices.co.uk API (lowest new retail prices)
 * - Internal: stats_game_pricing materialized view (sold/listed prices)
 *
 * Caching Strategy (ToS Compliance):
 * - BoardGamePrices.co.uk requires minimum 1-hour cache
 * - We cache for 65 minutes (60 + 5 buffer)
 * - Check external_pricing_cache first
 * - Only fetch from API if cache expired or missing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BoardGamePrices.co.uk API configuration
const BGP_API_BASE = 'https://boardgameprices.co.uk/api/info'
const BGP_SITENAME = 'secondturn.games'

interface BGPPriceOffer {
  shop_name?: string
  name?: string
  price?: number
  product?: number | string
  shipping?: string
  currency?: string
  stock?: string
  url?: string
  link?: string
}

interface BGPItem {
  id?: number
  name?: string
  url?: string
  prices?: BGPPriceOffer[]
}

interface BGPResponse {
  currency?: string
  items?: BGPItem[]
  error?: string
}

interface PriceCheckResponse {
  bggGameId: number
  gameName: string | null
  external: {
    lowestPrice: number | null
    shopName: string | null
    url: string | null
    offerCount: number
    cachedAt: string
    attribution: {
      text: string
      url: string
    }
  } | null
  internal: {
    lowestActivePrice: number | null
    activeListingCount: number
    medianSoldPrice: number | null
    avgSoldPrice: number | null
    completedSalesCount: number
  } | null
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const bggGameId = url.searchParams.get('bgg_game_id')

    if (!bggGameId || isNaN(parseInt(bggGameId))) {
      return new Response(
        JSON.stringify({ error: 'Valid bgg_game_id parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gameId = parseInt(bggGameId)

    // Initialize Supabase client with service role for write access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Check if game exists and get its name
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, name')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: 'Game not found', bggGameId: gameId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch internal pricing stats from materialized view (parallel with cache check)
    const [internalStatsResult, cachedPricingResult] = await Promise.all([
      supabase
        .from('stats_game_pricing')
        .select('*')
        .eq('bgg_game_id', gameId)
        .single(),
      supabase
        .from('external_pricing_cache')
        .select('*')
        .eq('bgg_game_id', gameId)
        .gt('expires_at', new Date().toISOString())
        .single(),
    ])

    const internalStats = internalStatsResult.data
    const cachedPricing = cachedPricingResult.data

    let externalData: PriceCheckResponse['external'] = null

    if (cachedPricing) {
      // Use cached data (cache hit)
      console.log(`[PriceCheck] Cache hit for game ${gameId}`)
      // Extract attribution URL from raw_response if available
      const cachedAttribution = cachedPricing.raw_response?.attribution
      externalData = {
        lowestPrice: cachedPricing.lowest_price,
        shopName: null, // Not stored in cache for simplicity
        url: cachedPricing.lowest_price_url,
        offerCount: cachedPricing.offer_count || 0,
        cachedAt: cachedPricing.cached_at,
        attribution: cachedAttribution || {
          text: 'via BoardGamePrices.co.uk',
          url: `https://boardgameprices.co.uk/item/show/${gameId}`,
        },
      }
    } else {
      // Cache miss - fetch from BoardGamePrices.co.uk API
      console.log(`[PriceCheck] Cache miss for game ${gameId}, fetching from API...`)

      try {
        externalData = await fetchBoardGamePrices(gameId)

        if (externalData) {
          // Cache the response
          const cacheData = {
            bgg_game_id: gameId,
            cached_at: new Date().toISOString(),
            raw_response: externalData,
            lowest_price: externalData.lowestPrice,
            lowest_price_url: externalData.url,
            offer_count: externalData.offerCount,
          }

          // Upsert cache entry (service role bypasses RLS)
          const { error: upsertError } = await supabase
            .from('external_pricing_cache')
            .upsert(cacheData, { onConflict: 'bgg_game_id' })

          if (upsertError) {
            console.error('[PriceCheck] Cache upsert error:', upsertError)
          } else {
            console.log(`[PriceCheck] Cached pricing for game ${gameId}`)
          }
        }
      } catch (apiError: any) {
        console.error('[PriceCheck] Failed to fetch external prices:', apiError.message)
        // Continue without external data - graceful degradation
      }
    }

    // 3. Build response
    const response: PriceCheckResponse = {
      bggGameId: gameId,
      gameName: game.name,
      external: externalData,
      internal: internalStats
        ? {
            lowestActivePrice: internalStats.lowest_active_price,
            activeListingCount: internalStats.active_listing_count || 0,
            medianSoldPrice: internalStats.median_sold_price,
            avgSoldPrice: internalStats.avg_sold_price,
            completedSalesCount: internalStats.completed_sales_count || 0,
          }
        : null,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[PriceCheck] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Fetch pricing data from BoardGamePrices.co.uk API
 *
 * API Parameters (per PRD):
 * - sitename: secondturn.games (required for ToS)
 * - currency: EUR (target market)
 * - destination: DE (Germany for shipping calc)
 * - delivery: PACKAGE,POSTOFFICE (common delivery types)
 * - stock: Y (only in-stock items)
 * - sort: CHEAP2 (sort by product price, excluding shipping)
 * - eid: BGG game ID
 */
async function fetchBoardGamePrices(
  bggGameId: number
): Promise<PriceCheckResponse['external'] | null> {
  const bgpUrl = new URL(BGP_API_BASE)
  bgpUrl.searchParams.set('sitename', BGP_SITENAME)
  bgpUrl.searchParams.set('currency', 'EUR')
  bgpUrl.searchParams.set('destination', 'DE')
  bgpUrl.searchParams.set('delivery', 'PACKAGE,POSTOFFICE')
  bgpUrl.searchParams.set('stock', 'Y')
  bgpUrl.searchParams.set('sort', 'CHEAP2')
  bgpUrl.searchParams.set('eid', bggGameId.toString())

  console.log(`[PriceCheck] Fetching from BGP: ${bgpUrl.toString()}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

  try {
    const response = await fetch(bgpUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SecondTurnGames/1.0 (https://secondturn.games)',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[PriceCheck] BGP API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data: BGPResponse = await response.json()

    // API returns items[].prices[] - get the first matching game item
    const gameItem = data.items?.[0]
    const prices = gameItem?.prices || []

    // Use the item URL from API response for attribution (uses their internal ID)
    const itemUrl = gameItem?.url || `https://boardgameprices.co.uk/item/show/${bggGameId}`

    if (!prices.length) {
      console.log(`[PriceCheck] No price offers found for game ${bggGameId}`)
      return {
        lowestPrice: null,
        shopName: null,
        url: null,
        offerCount: 0,
        cachedAt: new Date().toISOString(),
        attribution: {
          text: 'via BoardGamePrices.co.uk',
          url: itemUrl,
        },
      }
    }

    // Filter for in-stock items only
    const inStockPrices = prices.filter(
      (p) => p.stock === 'Y' || p.stock === 'y'
    )

    // Use in-stock if available, otherwise first price (sorted by CHEAP2)
    const bestOffer = inStockPrices[0] || prices[0]

    // 'product' is the base price (excluding shipping), may be string from API
    const productPrice = typeof bestOffer.product === 'string'
      ? parseFloat(bestOffer.product)
      : bestOffer.product
    const lowestPrice = productPrice ?? bestOffer.price ?? null

    return {
      lowestPrice,
      shopName: bestOffer.shop_name || bestOffer.name || null,
      url: bestOffer.link || bestOffer.url || null,
      offerCount: inStockPrices.length,
      cachedAt: new Date().toISOString(),
      attribution: {
        text: 'via BoardGamePrices.co.uk',
        url: itemUrl,
      },
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      console.error('[PriceCheck] BGP API timeout')
    } else {
      console.error('[PriceCheck] BGP API fetch error:', error.message)
    }
    return null
  }
}
