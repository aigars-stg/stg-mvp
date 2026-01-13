/**
 * Edge Function: cron-process-auctions
 *
 * Processes ended auctions to determine winners:
 * - Calls database function to process ended auctions
 * - Sends winner notification emails with celebratory messaging
 * - Sends no-bid notification emails to sellers with relist prompt
 * - Creates in-app notifications
 *
 * Schedule: Every minute via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuctionResult {
  listing_id: string
  game_name: string
  winner_id: string | null
  winning_bid: number | null
  seller_id: string
  had_bids: boolean
  payment_deadline: string | null
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
      console.error('[Cron] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[Cron] Starting process-auctions job...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Call database function to process ended auctions
    const { data: result, error } = await supabase.rpc('process_ended_auctions')

    if (error) {
      console.error('[Cron] Database function error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const processedAuctions: AuctionResult[] = result || []
    console.log(`[Cron] Processed ${processedAuctions.length} ended auctions`)

    let winnerEmailsSent = 0
    let sellerEmailsSent = 0
    let noBidEmailsSent = 0

    for (const auction of processedAuctions) {
      const { listing_id, game_name, winner_id, winning_bid, seller_id, had_bids, payment_deadline } = auction

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', seller_id)
        .single()

      if (had_bids && winner_id && winning_bid) {
        // Auction ended with a winner
        const { data: winnerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', winner_id)
          .single()

        if (winnerProfile) {
          // Send celebratory winner email
          try {
            await resend.emails.send({
              from: fromEmail,
              to: winnerProfile.email,
              subject: `You won the auction for ${game_name}!`,
              html: generateWinnerEmailHtml({
                winnerName: winnerProfile.full_name,
                gameName: game_name,
                winningBid: winning_bid,
                paymentDeadline: payment_deadline!,
                checkoutUrl: `${appUrl}/checkout/auction/${listing_id}`,
              }),
            })
            console.log(`[Cron] Winner email sent for auction ${listing_id}`)
            winnerEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] Winner email failed for auction ${listing_id}:`, emailError.message)
          }

          // Create in-app notification for winner
          await supabase.from('notifications').insert({
            user_id: winner_id,
            type: 'auction_won',
            title: `You won ${game_name}!`,
            body: `Your winning bid was €${winning_bid.toFixed(2)}. Complete your purchase within 48 hours.`,
            data: { listing_id, amount: winning_bid },
          })
        }

        // Notify seller about the sale
        if (sellerProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: sellerProfile.email,
              subject: `Your auction for ${game_name} has ended - Sold!`,
              html: generateSellerSoldEmailHtml({
                sellerName: sellerProfile.full_name,
                gameName: game_name,
                winningBid: winning_bid,
                dashboardUrl: `${appUrl}/my-listings`,
              }),
            })
            console.log(`[Cron] Seller sold email sent for auction ${listing_id}`)
            sellerEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] Seller email failed for auction ${listing_id}:`, emailError.message)
          }
        }
      } else {
        // Auction ended with no bids
        if (sellerProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: sellerProfile.email,
              subject: `Your auction for ${game_name} ended without bids`,
              html: generateNoBidEmailHtml({
                sellerName: sellerProfile.full_name,
                gameName: game_name,
                relistUrl: `${appUrl}/sell?relist=${listing_id}`,
              }),
            })
            console.log(`[Cron] No-bid email sent for auction ${listing_id}`)
            noBidEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] No-bid email failed for auction ${listing_id}:`, emailError.message)
          }

          // Create in-app notification for seller
          await supabase.from('notifications').insert({
            user_id: seller_id,
            type: 'auction_expired',
            title: `Your auction for ${game_name} ended`,
            body: 'No bids were placed. Consider relisting at a lower starting price.',
            data: { listing_id },
          })
        }
      }
    }

    const summary = {
      success: true,
      processedCount: processedAuctions.length,
      winnerEmailsSent,
      sellerEmailsSent,
      noBidEmailsSent,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Job completed:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[Cron] Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Generate celebratory winner email HTML
 */
function generateWinnerEmailHtml(params: {
  winnerName: string
  gameName: string
  winningBid: number
  paymentDeadline: string
  checkoutUrl: string
}): string {
  const { winnerName, gameName, winningBid, paymentDeadline, checkoutUrl } = params
  const deadlineDate = new Date(paymentDeadline).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #9333ea; font-size: 28px; margin-bottom: 20px; text-align: center;">Congratulations!</h1>

  <p style="font-size: 18px; text-align: center;">Hi ${winnerName},</p>

  <p style="font-size: 18px; text-align: center;">
    <strong>${gameName}</strong> is heading your way!
  </p>

  <div style="background: linear-gradient(135deg, #9333ea10, #7c3aed10); border: 2px solid #9333ea30; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #666;">Your winning bid</p>
    <p style="margin: 0; font-size: 32px; font-weight: bold; color: #9333ea;">€${winningBid.toFixed(2)}</p>
  </div>

  <p style="text-align: center;">
    Complete your purchase by <strong>${deadlineDate}</strong> to secure your game.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${checkoutUrl}" style="display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Complete Purchase</a>
  </div>

  <p style="color: #666; font-size: 14px; text-align: center;">
    If you don't complete payment within 48 hours, the item may be offered to other bidders.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}

/**
 * Generate seller sold notification email HTML
 */
function generateSellerSoldEmailHtml(params: {
  sellerName: string
  gameName: string
  winningBid: number
  dashboardUrl: string
}): string {
  const { sellerName, gameName, winningBid, dashboardUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 20px;">Your Auction Sold!</h1>

  <p>Hi ${sellerName},</p>

  <p>Great news! Your auction for <strong>${gameName}</strong> has ended successfully.</p>

  <div style="background: #22c55e10; border: 2px solid #22c55e30; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; color: #666;">Final selling price</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #22c55e;">€${winningBid.toFixed(2)}</p>
  </div>

  <p>The winner has 48 hours to complete their payment. Once payment is confirmed, you'll receive instructions to ship the item.</p>

  <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View Your Listings</a>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}

/**
 * Generate no-bid notification email HTML
 */
function generateNoBidEmailHtml(params: {
  sellerName: string
  gameName: string
  relistUrl: string
}): string {
  const { sellerName, gameName, relistUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Auction Ended</h1>

  <p>Hi ${sellerName},</p>

  <p>Your auction for <strong>${gameName}</strong> has ended without any bids.</p>

  <p>Don't worry - this happens sometimes! Here are some tips to increase interest:</p>

  <ul style="color: #666;">
    <li>Try a lower starting price to attract more bidders</li>
    <li>Add more photos showing the game's condition</li>
    <li>Consider listing as "Buy Now" if you prefer a quick sale</li>
  </ul>

  <a href="${relistUrl}" style="display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">Relist This Game</a>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
