/**
 * Edge Function: cron-refund-safety-net
 *
 * Sweeps for cancelled orders that have settled EveryPay payments but no refund processed.
 * Acts as a safety net for any refund path that failed silently (seller decline, cron timeout,
 * shipping deadline, dispute resolution).
 *
 * - Tries void first, falls back to refund
 * - Handles bank_link payments (marks as manual_sepa_required)
 * - Retries failed refunds after 1 hour (caps at 24h from cancellation)
 * - Processes max 10 orders per sweep to avoid timeout
 *
 * Schedule: Every 10 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { voidEveryPay, refundEveryPay } from '../_shared/everypay-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (authHeader !== 'Bearer ' + serviceRoleKey) {
      console.error('[Cron] Unauthorized access attempt')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[Cron] Starting refund-safety-net sweep...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Step 1: Find cancelled orders with no refund processed (5-min grace to avoid racing inline refunds)
    const { data: needsRefund, error: queryError } = await supabase
      .from('orders')
      .select('id, order_number, buyer_id, total_amount, everypay_payment_reference, everypay_payment_state, buyer_wallet_debit_cents, payment_method')
      .eq('status', 'cancelled')
      .is('refunded_at', null)
      .is('refund_status', null)
      .not('everypay_payment_reference', 'is', null)
      .lt('cancelled_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('cancelled_at', { ascending: true })
      .limit(10)

    if (queryError) {
      console.error('[Cron] Query error:', queryError)
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Find failed refunds older than 1 hour for retry (cap at 24h from cancellation)
    const { data: failedRefunds } = await supabase
      .from('orders')
      .select('id, order_number, buyer_id, total_amount, everypay_payment_reference, everypay_payment_state, buyer_wallet_debit_cents, payment_method')
      .eq('status', 'cancelled')
      .eq('refund_status', 'failed')
      .lt('refund_initiated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .gt('cancelled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('cancelled_at', { ascending: true })
      .limit(5)

    // Reset failed refunds so the main sweep picks them up
    if (failedRefunds && failedRefunds.length > 0) {
      for (const order of failedRefunds) {
        await supabase
          .from('orders')
          .update({ refund_status: null, refund_error: null })
          .eq('id', order.id)
        console.log(`[Cron] Reset failed refund for retry: ${order.order_number}`)
      }
    }

    const orders = needsRefund || []
    let processed = 0
    let failed = 0
    let manualSepa = 0

    console.log(`[Cron] Found ${orders.length} orders needing refund`)

    for (const order of orders) {
      const walletDebitCents = order.buyer_wallet_debit_cents || 0
      const everypayPortionCents = Math.round(order.total_amount * 100) - walletDebitCents
      const isBankLink = order.payment_method === 'bank_link'

      try {
        // Mark as processing
        await supabase
          .from('orders')
          .update({ refund_status: 'processing', refund_initiated_at: new Date().toISOString() })
          .eq('id', order.id)

        // EveryPay refund: void first, fall back to refund
        if (everypayPortionCents > 0 && order.everypay_payment_reference) {
          try {
            await voidEveryPay(order.everypay_payment_reference)
            console.log(`[Cron] Void succeeded for ${order.order_number}`)
          } catch {
            await refundEveryPay(order.everypay_payment_reference, everypayPortionCents)
            console.log(`[Cron] Refund processed for ${order.order_number} (void failed)`)
          }
        }

        // Wallet refund via credit_wallet RPC
        if (walletDebitCents > 0) {
          const { error: walletError } = await supabase.rpc('credit_wallet', {
            p_user_id: order.buyer_id,
            p_amount_cents: walletDebitCents,
            p_order_id: order.id,
            p_description: 'Refund — order cancelled',
          })

          if (walletError) {
            throw new Error(`Wallet refund failed: ${walletError.message}`)
          }
          console.log(`[Cron] Wallet refund of ${walletDebitCents} cents for ${order.order_number}`)
        }

        // Update refund tracking
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
            refund_amount: order.total_amount,
            refund_status: refundStatus,
            refund_method: refundMethod,
          })
          .eq('id', order.id)

        if (isBankLink) {
          manualSepa++
          console.log(`[Cron] Bank link refund marked manual_sepa_required: ${order.order_number}`)
        } else {
          processed++
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Cron] Refund failed for ${order.order_number}:`, errorMsg)

        await supabase
          .from('orders')
          .update({
            refund_status: 'failed',
            refund_error: errorMsg,
          })
          .eq('id', order.id)

        failed++
      }
    }

    // Log any manual_sepa_required orders for visibility
    const { data: sepaOrders } = await supabase
      .from('orders')
      .select('order_number, total_amount, cancelled_at')
      .eq('refund_status', 'manual_sepa_required')
      .is('refund_completed_at', null)
      .limit(20)

    if (sepaOrders && sepaOrders.length > 0) {
      console.log(`[Cron] ${sepaOrders.length} orders awaiting manual SEPA transfer:`, sepaOrders.map(o => o.order_number))
    }

    const summary = {
      success: true,
      processed,
      failed,
      manualSepa,
      retriesReset: failedRefunds?.length || 0,
      pendingSepa: sepaOrders?.length || 0,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Sweep completed:', summary)

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
