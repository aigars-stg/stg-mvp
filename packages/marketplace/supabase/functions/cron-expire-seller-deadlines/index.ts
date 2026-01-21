/**
 * Edge Function: cron-expire-seller-deadlines
 *
 * Handles orders where sellers haven't responded within 24 hours.
 * - Calls database function to cancel expired orders
 * - Processes Stripe refunds for cancelled orders
 * - Sends cancellation emails to buyers
 *
 * Schedule: Every 5 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundInfo {
  order_id: string
  buyer_id: string
  amount: number
  payment_intent_id: string
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

    console.log('[Cron] Starting expire-seller-deadlines job...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Call database function to cancel expired orders
    const { data: result, error } = await supabase.rpc('handle_expired_seller_deadlines')

    if (error) {
      console.error('[Cron] Database function error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cancelledCount = result?.cancelled_count || 0
    const refundsNeeded: RefundInfo[] = result?.refunds_needed || []

    console.log(`[Cron] Cancelled ${cancelledCount} orders with expired deadlines`)

    // Process refunds and send emails
    let refundsProcessed = 0
    let refundsFailed = 0
    let emailsSent = 0

    for (const refundInfo of refundsNeeded) {
      const { order_id, buyer_id, amount, payment_intent_id } = refundInfo

      // IDEMPOTENCY CHECK: Verify order hasn't already been refunded
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, seller_id, refunded_at')
        .eq('id', order_id)
        .single()

      if (!order) {
        console.error(`[Cron] Order ${order_id} not found`)
        continue
      }

      // Skip if already refunded (idempotency protection)
      if (order.refunded_at) {
        console.log(`[Cron] Order ${order_id} already refunded, skipping`)
        continue
      }

      // Process Stripe refund
      if (payment_intent_id) {
        try {
          console.log(`[Cron] Processing refund for order ${order_id}...`)

          const refund = await stripe.refunds.create({
            payment_intent: payment_intent_id,
            reason: 'requested_by_customer',
            metadata: {
              order_id,
              reason: 'Seller did not respond within 24 hours',
            },
          })

          console.log(`[Cron] Refund created: ${refund.id}`)

          // Update order with refund info
          await supabase
            .from('orders')
            .update({
              refunded_at: new Date().toISOString(),
              refund_amount: amount,
            })
            .eq('id', order_id)

          refundsProcessed++
        } catch (refundError: unknown) {
          console.error(`[Cron] Refund failed for order ${order_id}:`, refundError instanceof Error ? refundError.message : 'Unknown error')
          refundsFailed++
          continue
        }
      }

      // Fetch buyer and seller profiles for email
      const { data: buyerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', buyer_id)
        .single()

      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', order.seller_id)
        .single()

      // Send cancellation email
      if (buyerProfile && sellerProfile) {
        try {
          await resend.emails.send({
            from: fromEmail,
            to: buyerProfile.email,
            subject: `Order #${order.order_number} Cancelled - Refund Processed`,
            html: generateCancellationEmailHtml({
              buyerName: buyerProfile.full_name,
              orderNumber: order.order_number,
              sellerName: sellerProfile.full_name,
              refundAmount: amount,
              cancellationReason: 'Seller did not respond within 24 hours',
              browseUrl: `${appUrl}/browse`,
            }),
          })

          console.log(`[Cron] Cancellation email sent for order ${order_id}`)
          emailsSent++
        } catch (emailError: unknown) {
          console.error(`[Cron] Email failed for order ${order_id}:`, emailError instanceof Error ? emailError.message : 'Unknown error')
        }
      }
    }

    const summary = {
      success: true,
      cancelledCount,
      refundsProcessed,
      refundsFailed,
      emailsSent,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Job completed:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[Cron] Unexpected error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Generate cancellation email HTML
 */
function generateCancellationEmailHtml(params: {
  buyerName: string
  orderNumber: string
  sellerName: string
  refundAmount: number
  cancellationReason: string
  browseUrl: string
}): string {
  const { buyerName, orderNumber, sellerName, refundAmount, cancellationReason, browseUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Order Cancelled</h1>

  <p>Hi ${buyerName},</p>

  <p>We're sorry to inform you that your order <strong>#${orderNumber}</strong> from ${sellerName} has been cancelled.</p>

  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${cancellationReason}</p>
    <p style="margin: 0;"><strong>Refund Amount:</strong> €${refundAmount.toFixed(2)}</p>
  </div>

  <p>Your refund has been processed and should appear in your account within 5-10 business days, depending on your bank.</p>

  <p>We apologize for any inconvenience. Feel free to browse our marketplace for other great finds!</p>

  <a href="${browseUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">Browse Games</a>

  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    Questions? Reply to this email or contact us at support@secondturn.games
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
