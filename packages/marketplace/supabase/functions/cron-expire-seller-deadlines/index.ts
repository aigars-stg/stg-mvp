/**
 * Edge Function: cron-expire-seller-deadlines
 *
 * Handles orders where sellers haven't responded within 24 hours:
 * - Calls handle_expired_seller_deadlines() RPC to cancel orders and relist items
 * - Processes EveryPay refunds (void first, fall back to refund)
 * - Refunds wallet portions via credit_wallet() RPC
 * - Posts system messages to order conversations
 * - Sends cancellation emails to buyers
 * - Creates in-app notifications for buyers
 *
 * Schedule: Every 5 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
import { voidEveryPay, refundEveryPay } from '../_shared/everypay-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RefundNeeded {
  order_id: string
  buyer_id: string
  amount: number
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (authHeader !== 'Bearer ' + serviceRoleKey) {
      console.error('[Cron] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[Cron] Starting expire-seller-deadlines job...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resend = resendApiKey ? new Resend(resendApiKey) : null
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Step 1: Cancel expired orders and relist items via SQL RPC
    const { data: result, error } = await supabase.rpc('handle_expired_seller_deadlines')

    if (error) {
      console.error('[Cron] RPC error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rpcResult = result as { cancelled_count?: number; refunds_needed?: RefundNeeded[] } | null
    const cancelledCount = rpcResult?.cancelled_count || 0
    const refundsNeeded = rpcResult?.refunds_needed || []

    console.log(`[Cron] Cancelled ${cancelledCount} orders, ${refundsNeeded.length} refunds needed`)

    // Step 2: Batch-fetch orders and profiles upfront to avoid N+1 queries
    const orderIds = refundsNeeded.map(r => r.order_id)
    const orderMap = new Map<string, {
      order_number: string; seller_id: string; everypay_payment_reference: string | null
      everypay_payment_state: string | null; buyer_wallet_debit_cents: number | null
      total_amount: number; payment_method: string | null
    }>()
    const buyerProfileMap = new Map<string, { full_name: string; email: string }>()
    const sellerProfileMap = new Map<string, { full_name: string }>()

    if (orderIds.length > 0) {
      // Fetch all orders in one query
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, seller_id, everypay_payment_reference, everypay_payment_state, buyer_wallet_debit_cents, total_amount, payment_method')
        .in('id', orderIds)

      if (orders) {
        for (const o of orders) {
          orderMap.set(o.id, o)
        }
      }

      // Batch-fetch buyer and seller profiles for emails
      if (resend) {
        const buyerIds = [...new Set(refundsNeeded.map(r => r.buyer_id))]
        const sellerIds = [...new Set([...orderMap.values()].map(o => o.seller_id))]

        const [{ data: buyerProfiles }, { data: sellerProfiles }] = await Promise.all([
          supabase.from('user_profiles').select('id, full_name, email').in('id', buyerIds),
          supabase.from('user_profiles').select('id, full_name').in('id', sellerIds),
        ])

        if (buyerProfiles) {
          for (const p of buyerProfiles) buyerProfileMap.set(p.id, { full_name: p.full_name, email: p.email })
        }
        if (sellerProfiles) {
          for (const p of sellerProfiles) sellerProfileMap.set(p.id, { full_name: p.full_name })
        }
      }
    }

    // Step 3: Process refunds and send notifications
    let refundsProcessed = 0
    let refundsFailed = 0
    let emailsSent = 0

    for (const refundInfo of refundsNeeded) {
      const { order_id, buyer_id, amount } = refundInfo

      try {
        // Look up order from pre-fetched map
        const order = orderMap.get(order_id)

        if (!order) {
          console.error(`[Cron] Order ${order_id} not found in batch fetch`)
          refundsFailed++
          continue
        }

        const walletDebitCents = order.buyer_wallet_debit_cents || 0
        const everypayPortionCents = Math.round(order.total_amount * 100) - walletDebitCents
        const isBankLink = order.payment_method === 'bank_link'

        // EveryPay refund: void first, fall back to refund
        if (everypayPortionCents > 0 && order.everypay_payment_reference) {
          try {
            await voidEveryPay(order.everypay_payment_reference)
            console.log(`[Cron] EveryPay void succeeded for order ${order_id}`)
          } catch {
            await refundEveryPay(order.everypay_payment_reference, everypayPortionCents)
            console.log(`[Cron] EveryPay refund processed for order ${order_id} (void failed)`)
          }
        }

        // Wallet refund via credit_wallet RPC (4 params only, no p_type)
        if (walletDebitCents > 0) {
          const { error: walletError } = await supabase.rpc('credit_wallet', {
            p_user_id: buyer_id,
            p_amount_cents: walletDebitCents,
            p_order_id: order_id,
            p_description: 'Refund — seller did not respond within 24 hours',
          })

          if (walletError) {
            console.error(`[Cron] Wallet refund failed for order ${order_id}:`, walletError)
            refundsFailed++
            continue
          }
          console.log(`[Cron] Wallet refund of ${walletDebitCents} cents for order ${order_id}`)
        }

        // Update order with refund tracking fields
        const refundStatus = isBankLink ? 'manual_sepa_required' : 'completed'
        const refundMethod = walletDebitCents > 0 && everypayPortionCents > 0
          ? 'mixed'
          : walletDebitCents > 0
            ? 'wallet_only'
            : isBankLink
              ? 'bank_link'
              : 'everypay_card'

        await supabase
          .from('orders')
          .update({
            refunded_at: new Date().toISOString(),
            refund_amount: amount,
            refund_status: refundStatus,
            refund_method: refundMethod,
            refund_initiated_at: new Date().toISOString(),
          })
          .eq('id', order_id)

        refundsProcessed++

        // Post system message to order conversation
        try {
          const { error: msgError } = await supabase.rpc('post_transaction_system_message', {
            p_order_id: order_id,
            p_message_type: 'order_cancelled',
            p_content: 'Order automatically cancelled: seller did not respond within 24 hours. Your payment will be refunded.',
          })
          if (msgError) console.error(`[Cron] System message failed for ${order_id}:`, msgError)
        } catch (msgErr) {
          console.error(`[Cron] System message failed for ${order_id}:`, msgErr)
        }

        // In-app notification to buyer
        try {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: buyer_id,
            type: 'order_cancelled',
            title: `Order #${order.order_number} cancelled`,
            body: 'The seller did not respond in time. Your refund is being processed.',
            data: { order_id },
          })
          if (notifError) console.error(`[Cron] Notification insert failed for ${order_id}:`, notifError)
        } catch (notifErr) {
          console.error(`[Cron] Notification insert failed for ${order_id}:`, notifErr)
        }

        // Send cancellation email to buyer
        if (resend) {
          const buyerProfile = buyerProfileMap.get(buyer_id)
          const sellerProfile = sellerProfileMap.get(order.seller_id)

          if (buyerProfile?.email && sellerProfile) {
            try {
              await resend.emails.send({
                from: fromEmail,
                to: buyerProfile.email,
                subject: `Order #${order.order_number} has been cancelled`,
                html: generateCancellationEmailHtml({
                  buyerName: buyerProfile.full_name || 'there',
                  orderNumber: order.order_number,
                  sellerName: sellerProfile.full_name || 'The seller',
                  refundAmount: amount,
                  ordersUrl: `${appUrl}/orders`,
                }),
              })
              console.log(`[Cron] Cancellation email sent for order ${order_id}`)
              emailsSent++
            } catch (emailError: unknown) {
              console.error(`[Cron] Email failed for order ${order_id}:`, emailError instanceof Error ? emailError.message : 'Unknown error')
            }
          }
        }
      } catch (refundError: unknown) {
        console.error(`[Cron] Refund failed for order ${order_id}:`, refundError instanceof Error ? refundError.message : 'Unknown error')
        refundsFailed++
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

// --- Email template ---

function generateCancellationEmailHtml(params: {
  buyerName: string
  orderNumber: string
  sellerName: string
  refundAmount: number
  ordersUrl: string
}): string {
  const { buyerName, orderNumber, sellerName, refundAmount, ordersUrl } = params

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

  <p>Unfortunately, ${sellerName} did not respond to your order <strong>#${orderNumber}</strong> within 24 hours, so it has been automatically cancelled.</p>

  <div style="background: #22c55e10; border: 2px solid #22c55e30; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; color: #666;">Your refund</p>
    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #22c55e;">&euro;${refundAmount.toFixed(2)}</p>
    <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Refund is being processed to your original payment method.</p>
  </div>

  <p>The game has been relisted and is available for other buyers.</p>

  <a href="${ordersUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View Your Orders</a>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
