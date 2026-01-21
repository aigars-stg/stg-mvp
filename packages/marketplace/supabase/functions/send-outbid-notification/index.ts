/**
 * Edge Function: send-outbid-notification
 *
 * Sends outbid notifications when someone is outbid on an auction.
 * Can be triggered via HTTP POST or database trigger.
 *
 * Expected payload:
 * {
 *   listing_id: string,
 *   outbid_user_id: string,
 *   new_bid_amount: number,
 *   game_name: string
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutbidPayload {
  listing_id: string
  outbid_user_id: string
  new_bid_amount: number
  game_name: string
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

    if (!authHeader?.includes(serviceRoleKey)) {
      console.error('[Outbid] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: OutbidPayload = await req.json()
    const { listing_id, outbid_user_id, new_bid_amount, game_name } = payload

    if (!listing_id || !outbid_user_id || !new_bid_amount || !game_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Outbid] Processing notification for user ${outbid_user_id} on listing ${listing_id}`)

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Fetch outbid user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', outbid_user_id)
      .single()

    if (!userProfile) {
      console.error(`[Outbid] User ${outbid_user_id} not found`)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get listing info for the game page URL
    const { data: listing } = await supabase
      .from('listings')
      .select('bgg_game_id')
      .eq('id', listing_id)
      .single()

    const gameUrl = listing?.bgg_game_id
      ? `${appUrl}/game/${listing.bgg_game_id}`
      : `${appUrl}/browse`

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: outbid_user_id,
      type: 'outbid',
      title: `You've been outbid on ${game_name}`,
      body: `Current bid is now €${new_bid_amount.toFixed(2)}. Place a higher bid to stay in the running!`,
      data: { listing_id, amount: new_bid_amount },
    })

    // Send email notification
    try {
      await resend.emails.send({
        from: fromEmail,
        to: userProfile.email,
        subject: `You've been outbid on ${game_name}`,
        html: generateOutbidEmailHtml({
          userName: userProfile.full_name,
          gameName: game_name,
          newBidAmount: new_bid_amount,
          gameUrl,
        }),
      })
      console.log(`[Outbid] Email sent to ${userProfile.email}`)
    } catch (emailError: unknown) {
      console.error(`[Outbid] Email failed:`, emailError instanceof Error ? emailError.message : 'Unknown error')
      // Don't fail the function if email fails - in-app notification was created
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[Outbid] Unexpected error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Generate outbid notification email HTML
 */
function generateOutbidEmailHtml(params: {
  userName: string
  gameName: string
  newBidAmount: number
  gameUrl: string
}): string {
  const { userName, gameName, newBidAmount, gameUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 20px;">You've Been Outbid!</h1>

  <p>Hi ${userName},</p>

  <p>Someone has placed a higher bid on <strong>${gameName}</strong>.</p>

  <div style="background: #f59e0b10; border: 2px solid #f59e0b30; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #666;">Current bid is now</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f59e0b;">€${newBidAmount.toFixed(2)}</p>
  </div>

  <p>Still want this game? Place a higher bid to get back in the lead!</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${gameUrl}" style="display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600;">Place New Bid</a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Act fast - auctions can end at any time and may be extended if bids are placed in the final minutes.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Don't want these notifications? Update your <a href="${gameUrl.split('/game')[0]}/settings/notifications" style="color: #999;">notification preferences</a>.
  </p>

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
