/**
 * Edge Function: cron-shipping-reminders
 *
 * Sends shipping reminder emails to sellers who accepted an order 24+ hours ago
 * but haven't shipped yet (no tracking events).
 *
 * Schedule: Every 6 hours via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    console.log('[Cron] Starting shipping-reminders job...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('[Cron] RESEND_API_KEY not set')
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Find accepted orders 24h+ without shipping reminder and no tracking
    const { data: needsReminder, error: queryError } = await supabase
      .from('orders')
      .select('id, order_number, seller_id, shipping_deadline')
      .eq('status', 'accepted')
      .not('shipping_deadline', 'is', null)
      .is('shipping_reminder_sent_at', null)
      .lt('seller_responded_at', twentyFourHoursAgo)
      .limit(50)

    if (queryError) {
      console.error('[Cron] Query error:', queryError)
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!needsReminder || needsReminder.length === 0) {
      console.log('[Cron] No shipping reminders needed')
      return new Response(JSON.stringify({ success: true, remindersSent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Batch-fetch tracking events and seller profiles
    const orderIds = needsReminder.map(o => o.id)
    const sellerIds = [...new Set(needsReminder.map(o => o.seller_id))]

    const [{ data: trackingEvents }, { data: sellerProfiles }] = await Promise.all([
      supabase.from('tracking_events').select('order_id').in('order_id', orderIds),
      supabase.from('user_profiles').select('id, full_name, email').in('id', sellerIds),
    ])

    const ordersWithTracking = new Set((trackingEvents || []).map(e => e.order_id))
    const sellerMap = new Map((sellerProfiles || []).map(p => [p.id, p]))

    let remindersSent = 0

    for (const order of needsReminder) {
      // Skip if seller already shipped
      if (ordersWithTracking.has(order.id)) continue

      const sellerProfile = sellerMap.get(order.seller_id)
      if (!sellerProfile?.email) continue

      const deadlineDate = order.shipping_deadline
        ? new Date(order.shipping_deadline).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'soon'

      try {
        await resend.emails.send({
          from: fromEmail,
          to: sellerProfile.email,
          subject: `Reminder: Ship order #${order.order_number}`,
          html: generateReminderEmailHtml({
            sellerName: sellerProfile.full_name || 'Seller',
            orderNumber: order.order_number,
            deadline: deadlineDate,
            orderUrl: `${appUrl}/orders/${order.id}`,
          }),
        })

        // Mark reminder as sent
        await supabase
          .from('orders')
          .update({ shipping_reminder_sent_at: new Date().toISOString() })
          .eq('id', order.id)

        remindersSent++
        console.log(`[Cron] Shipping reminder sent for ${order.order_number}`)
      } catch (emailError: unknown) {
        console.error(`[Cron] Reminder email failed for ${order.order_number}:`, emailError instanceof Error ? emailError.message : 'Unknown error')
      }
    }

    const summary = {
      success: true,
      remindersSent,
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

function generateReminderEmailHtml(params: {
  sellerName: string
  orderNumber: string
  deadline: string
  orderUrl: string
}): string {
  const { sellerName, orderNumber, deadline, orderUrl } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Shipping Reminder</h1>

  <p>Hi ${sellerName},</p>

  <p>Just a friendly reminder that order <strong>#${orderNumber}</strong> is waiting to be shipped.</p>

  <div style="background: #f59e0b10; border: 2px solid #f59e0b30; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0; color: #666;">Shipping deadline</p>
    <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #f59e0b;">${deadline}</p>
  </div>

  <p>Please drop off the parcel at the nearest parcel locker as soon as possible. If you're unable to ship, you can cancel the order from your dashboard.</p>

  <a href="${orderUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View Order</a>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
