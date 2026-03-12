/**
 * Edge Function: cron-auction-ending-soon
 *
 * Sends "ending soon" notifications to bidders on auctions ending within 60 minutes.
 * Deduplicates so each bidder only receives one notification per auction.
 *
 * Schedule: Every 15 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (authHeader !== 'Bearer ' + serviceRoleKey) {
      console.error('[EndingSoon] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[EndingSoon] Starting auction-ending-soon check...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Find active auctions ending within 60 minutes that have bids
    const now = new Date()
    const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    const { data: endingAuctions, error: auctionError } = await supabase
      .from('listings')
      .select('id, game_name, bgg_game_id, auction_ends_at, auction_current_bid, auction_bid_count')
      .eq('status', 'active')
      .eq('listing_type', 'auction')
      .gt('auction_bid_count', 0)
      .gt('auction_ends_at', now.toISOString())
      .lte('auction_ends_at', sixtyMinutesFromNow.toISOString())

    if (auctionError) {
      console.error('[EndingSoon] Query error:', auctionError)
      return new Response(JSON.stringify({ error: auctionError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!endingAuctions || endingAuctions.length === 0) {
      console.log('[EndingSoon] No auctions ending soon with bids')
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[EndingSoon] Found ${endingAuctions.length} auctions ending soon`)
    let totalNotified = 0

    for (const auction of endingAuctions) {
      // Get unique bidders for this auction
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('bidder_id')
        .eq('listing_id', auction.id)

      if (bidsError || !bids) {
        console.error(`[EndingSoon] Failed to fetch bids for ${auction.id}:`, bidsError)
        continue
      }

      // Deduplicate bidder IDs
      const uniqueBidderIds = [...new Set(bids.map(b => b.bidder_id))]

      for (const bidderId of uniqueBidderIds) {
        // Check if we already sent an ending-soon notification for this auction+user
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', bidderId)
          .eq('type', 'auction_ending')
          .contains('data', { listing_id: auction.id })

        if (count && count > 0) {
          continue // Already notified
        }

        // Fetch bidder profile for email
        const { data: bidderProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', bidderId)
          .single()

        if (!bidderProfile) continue

        const gameUrl = auction.bgg_game_id
          ? `${appUrl}/game/${auction.bgg_game_id}`
          : `${appUrl}/browse`

        const minutesLeft = Math.ceil(
          (new Date(auction.auction_ends_at).getTime() - now.getTime()) / (1000 * 60)
        )

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: bidderId,
          type: 'auction_ending',
          title: `${auction.game_name} auction ending soon`,
          body: `Less than ${minutesLeft} minutes left. Current bid: €${(auction.auction_current_bid || 0).toFixed(2)}.`,
          data: {
            listing_id: auction.id,
            bgg_game_id: auction.bgg_game_id,
            amount: auction.auction_current_bid,
            auction_ends_at: auction.auction_ends_at,
          },
        })

        // Send email (fire-and-forget per bidder)
        try {
          await resend.emails.send({
            from: fromEmail,
            to: bidderProfile.email,
            subject: `${auction.game_name} auction ending soon`,
            html: generateEndingSoonEmailHtml({
              userName: bidderProfile.full_name,
              gameName: auction.game_name,
              currentBid: auction.auction_current_bid || 0,
              minutesLeft,
              gameUrl,
            }),
          })
        } catch (emailError: unknown) {
          console.error(`[EndingSoon] Email failed for ${bidderId}:`, emailError instanceof Error ? emailError.message : 'Unknown error')
        }

        totalNotified++
      }
    }

    const summary = {
      success: true,
      auctionsChecked: endingAuctions.length,
      notified: totalNotified,
      timestamp: now.toISOString(),
    }

    console.log('[EndingSoon] Job completed:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[EndingSoon] Unexpected error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Generate ending-soon notification email HTML
 */
function generateEndingSoonEmailHtml(params: {
  userName: string
  gameName: string
  currentBid: number
  minutesLeft: number
  gameUrl: string
}): string {
  const { userName, gameName, currentBid, minutesLeft, gameUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #D08770; font-size: 24px; margin-bottom: 20px;">Auction ending soon</h1>

  <p>Hi ${userName},</p>

  <p>The auction for <strong>${gameName}</strong> is ending in less than ${minutesLeft} minutes.</p>

  <div style="background: #D0877010; border: 2px solid #D0877030; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #666;">Current bid</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #D08770;">€${currentBid.toFixed(2)}</p>
  </div>

  <p>Make sure your bid is the highest before time runs out.</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${gameUrl}" style="display: inline-block; background: #88C0D0; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600;">View Auction</a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Bids placed in the final minutes may extend the auction to prevent sniping.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
