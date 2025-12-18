/**
 * Edge Function: cron-process-payouts
 *
 * Processes pending seller payouts for completed orders via Stripe Connect.
 * - Finds completed orders awaiting payout
 * - Creates Stripe transfers to seller's connected accounts
 * - Updates order and payout transaction records
 *
 * Schedule: Daily at 4:00 AM UTC via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayoutResult {
  orderId: string
  orderNumber: string
  success: boolean
  amount?: number
  transferId?: string
  error?: string
}

Deno.serve(async (req) => {
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

    console.log('[Cron] Starting process-payouts job...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Get all completed orders awaiting payout
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, seller_id, items_total, shipping_cost, service_fee, payout_status')
      .eq('status', 'completed')
      .eq('payout_status', 'pending')

    if (ordersError) {
      console.error('[Cron] Error fetching orders:', ordersError)
      return new Response(JSON.stringify({ error: ordersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Cron] Found ${orders?.length || 0} orders awaiting payout`)

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: PayoutResult[] = []
    let successCount = 0
    let errorCount = 0

    for (const order of orders) {
      const result = await processOrderPayout(supabase, stripe, order)
      results.push(result)

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const summary = {
      success: true,
      totalProcessed: orders.length,
      successCount,
      errorCount,
      results,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Job completed:', { ...summary, results: `${results.length} results` })

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
 * Process payout for a single order
 */
async function processOrderPayout(
  supabase: any,
  stripe: Stripe,
  order: {
    id: string
    order_number: string
    seller_id: string
    items_total: number
    shipping_cost: number
    service_fee: number
    payout_status: string
  }
): Promise<PayoutResult> {
  try {
    console.log(`[Cron] Processing payout for order ${order.order_number}`)

    // IDEMPOTENCY CHECK: Double-check payout status hasn't changed
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('payout_status')
      .eq('id', order.id)
      .single()

    if (currentOrder?.payout_status !== 'pending') {
      console.log(`[Cron] Order ${order.order_number} no longer pending payout`)
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: true,
      }
    }

    // Get seller's Stripe Connect account
    const { data: seller, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('user_id, stripe_connect_account_id, stripe_connect_payouts_enabled')
      .eq('user_id', order.seller_id)
      .single()

    if (sellerError || !seller) {
      console.error(`[Cron] Seller not found for order ${order.order_number}`)
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: false,
        error: 'Seller not found',
      }
    }

    // Check if seller can receive payouts
    if (!seller.stripe_connect_account_id || !seller.stripe_connect_payouts_enabled) {
      console.log(`[Cron] Seller ${seller.user_id} cannot receive payouts - putting on hold`)

      await supabase
        .from('orders')
        .update({ payout_status: 'on_hold' })
        .eq('id', order.id)

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: false,
        error: 'Seller payout account not ready',
      }
    }

    // Calculate payout amount (seller gets items + shipping, platform already took fee)
    const grossAmount = order.items_total + order.shipping_cost
    const netAmount = grossAmount

    console.log(`[Cron] Payout amount: €${netAmount}`)

    // Mark as processing
    await supabase
      .from('orders')
      .update({ payout_status: 'processing' })
      .eq('id', order.id)

    // Create payout transaction record
    const { data: payoutTx, error: txError } = await supabase
      .from('payout_transactions')
      .insert({
        order_id: order.id,
        seller_id: order.seller_id,
        stripe_connect_account_id: seller.stripe_connect_account_id,
        gross_amount: grossAmount,
        platform_fee: order.service_fee,
        net_amount: netAmount,
        status: 'processing',
      })
      .select()
      .single()

    if (txError) {
      console.error(`[Cron] Failed to create transaction record:`, txError)
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: false,
        error: 'Failed to create transaction record',
      }
    }

    // Create Stripe Transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'eur',
        destination: seller.stripe_connect_account_id,
        description: `Payout for order ${order.order_number}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          seller_id: order.seller_id,
          payout_transaction_id: payoutTx.id,
        },
      })

      console.log(`[Cron] Transfer created: ${transfer.id} for €${netAmount}`)

      // Update order
      await supabase
        .from('orders')
        .update({
          stripe_transfer_id: transfer.id,
          stripe_transfer_amount: netAmount,
          transferred_to_seller_at: new Date().toISOString(),
          payout_status: 'completed',
        })
        .eq('id', order.id)

      // Update transaction record
      await supabase
        .from('payout_transactions')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payoutTx.id)

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: true,
        amount: netAmount,
        transferId: transfer.id,
      }
    } catch (stripeError: any) {
      console.error(`[Cron] Stripe transfer failed:`, stripeError.message)

      // Update order
      await supabase
        .from('orders')
        .update({ payout_status: 'failed' })
        .eq('id', order.id)

      // Update transaction record
      await supabase
        .from('payout_transactions')
        .update({
          status: 'failed',
          error_code: stripeError.code,
          error_message: stripeError.message,
        })
        .eq('id', payoutTx.id)

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        success: false,
        error: stripeError.message,
      }
    }
  } catch (error: any) {
    console.error(`[Cron] Error processing payout for order ${order.order_number}:`, error)
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      success: false,
      error: error.message,
    }
  }
}
