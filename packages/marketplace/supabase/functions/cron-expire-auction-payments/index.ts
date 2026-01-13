/**
 * Edge Function: cron-expire-auction-payments
 *
 * Handles auctions where winners didn't pay within 48 hours:
 * - Offers to second-highest bidder (if >= 80% of winning bid)
 * - Otherwise marks listing as expired
 * - Sends appropriate notifications
 *
 * Schedule: Every 5 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpiredPaymentResult {
  listing_id: string
  game_name: string
  original_winner_id: string
  seller_id: string
  winning_bid: number
  second_bidder_id: string | null
  second_bid_amount: number | null
  action_taken: 'offered_to_second' | 'expired'
  new_payment_deadline: string | null
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

    console.log('[Cron] Starting expire-auction-payments job...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Call database function to handle expired payments
    const { data: result, error } = await supabase.rpc('handle_expired_auction_payments')

    if (error) {
      console.error('[Cron] Database function error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiredPayments: ExpiredPaymentResult[] = result || []
    console.log(`[Cron] Processed ${expiredPayments.length} expired auction payments`)

    let secondChanceEmailsSent = 0
    let expiredEmailsSent = 0

    for (const expired of expiredPayments) {
      const {
        listing_id,
        game_name,
        original_winner_id,
        seller_id,
        winning_bid,
        second_bidder_id,
        second_bid_amount,
        action_taken,
        new_payment_deadline,
      } = expired

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', seller_id)
        .single()

      if (action_taken === 'offered_to_second' && second_bidder_id && second_bid_amount) {
        // Second chance offer
        const { data: secondBidderProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', second_bidder_id)
          .single()

        if (secondBidderProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: secondBidderProfile.email,
              subject: `Second chance: ${game_name} is available at your bid!`,
              html: generateSecondChanceEmailHtml({
                bidderName: secondBidderProfile.full_name,
                gameName: game_name,
                bidAmount: second_bid_amount,
                paymentDeadline: new_payment_deadline!,
                checkoutUrl: `${appUrl}/checkout/auction/${listing_id}`,
              }),
            })
            console.log(`[Cron] Second chance email sent for auction ${listing_id}`)
            secondChanceEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] Second chance email failed for auction ${listing_id}:`, emailError.message)
          }

          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: second_bidder_id,
            type: 'second_chance',
            title: `Second chance for ${game_name}!`,
            body: `The original winner's payment didn't go through. Would you still like it at your bid of €${second_bid_amount.toFixed(2)}?`,
            data: { listing_id, amount: second_bid_amount },
          })
        }

        // Notify seller about the situation
        if (sellerProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: sellerProfile.email,
              subject: `Payment issue on ${game_name} - Offered to next bidder`,
              html: generateSellerSecondChanceEmailHtml({
                sellerName: sellerProfile.full_name,
                gameName: game_name,
                originalBid: winning_bid,
                newBid: second_bid_amount,
                dashboardUrl: `${appUrl}/my-listings`,
              }),
            })
          } catch (emailError: any) {
            console.error(`[Cron] Seller notification failed for auction ${listing_id}:`, emailError.message)
          }
        }
      } else {
        // Auction expired completely
        if (sellerProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: sellerProfile.email,
              subject: `Auction for ${game_name} expired - Payment not received`,
              html: generateAuctionExpiredEmailHtml({
                sellerName: sellerProfile.full_name,
                gameName: game_name,
                winningBid: winning_bid,
                relistUrl: `${appUrl}/sell?relist=${listing_id}`,
              }),
            })
            console.log(`[Cron] Expired email sent for auction ${listing_id}`)
            expiredEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] Expired email failed for auction ${listing_id}:`, emailError.message)
          }

          // Create in-app notification for seller
          await supabase.from('notifications').insert({
            user_id: seller_id,
            type: 'auction_expired',
            title: `Payment not received for ${game_name}`,
            body: 'The winning bidder did not complete payment. Consider relisting your item.',
            data: { listing_id },
          })
        }
      }
    }

    const summary = {
      success: true,
      processedCount: expiredPayments.length,
      secondChanceEmailsSent,
      expiredEmailsSent,
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
 * Generate second chance offer email HTML
 */
function generateSecondChanceEmailHtml(params: {
  bidderName: string
  gameName: string
  bidAmount: number
  paymentDeadline: string
  checkoutUrl: string
}): string {
  const { bidderName, gameName, bidAmount, paymentDeadline, checkoutUrl } = params
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
  <h1 style="color: #9333ea; font-size: 24px; margin-bottom: 20px;">Second Chance Opportunity!</h1>

  <p>Hi ${bidderName},</p>

  <p>Good news! The original winner's payment for <strong>${gameName}</strong> didn't go through.</p>

  <p>Would you still like it at your bid of <strong>€${bidAmount.toFixed(2)}</strong>?</p>

  <div style="background: linear-gradient(135deg, #9333ea10, #7c3aed10); border: 2px solid #9333ea30; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #666;">Your bid</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #9333ea;">€${bidAmount.toFixed(2)}</p>
  </div>

  <p>Complete your purchase by <strong>${deadlineDate}</strong> to secure the game.</p>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${checkoutUrl}" style="display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600;">Complete Purchase</a>
  </div>

  <p style="color: #666; font-size: 14px;">
    This offer expires in 48 hours. If you're no longer interested, no action is needed.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}

/**
 * Generate seller notification about second chance offer
 */
function generateSellerSecondChanceEmailHtml(params: {
  sellerName: string
  gameName: string
  originalBid: number
  newBid: number
  dashboardUrl: string
}): string {
  const { sellerName, gameName, originalBid, newBid, dashboardUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 20px;">Payment Issue - Offered to Next Bidder</h1>

  <p>Hi ${sellerName},</p>

  <p>The winning bidder for <strong>${gameName}</strong> (€${originalBid.toFixed(2)}) did not complete payment within 48 hours.</p>

  <p>We've automatically offered it to the next highest bidder at <strong>€${newBid.toFixed(2)}</strong>.</p>

  <p>They have 48 hours to complete payment. We'll notify you of the outcome.</p>

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
 * Generate auction expired email HTML
 */
function generateAuctionExpiredEmailHtml(params: {
  sellerName: string
  gameName: string
  winningBid: number
  relistUrl: string
}): string {
  const { sellerName, gameName, winningBid, relistUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 20px;">Auction Expired</h1>

  <p>Hi ${sellerName},</p>

  <p>Unfortunately, the winner of your auction for <strong>${gameName}</strong> (€${winningBid.toFixed(2)}) did not complete payment.</p>

  <p>There were no other eligible bidders to offer it to, so the listing has been marked as expired.</p>

  <p>You can relist the item whenever you're ready:</p>

  <a href="${relistUrl}" style="display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">Relist This Game</a>

  <p style="color: #666; font-size: 14px;">
    Consider using a "Buy Now" listing if you prefer guaranteed payment, or try a lower starting price to attract more bidders.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
