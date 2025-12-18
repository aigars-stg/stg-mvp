/**
 * Edge Function: cron-sync-tracking
 *
 * Syncs tracking events from Unisend API for T2T shipments.
 * - Fetches active orders with tracking barcodes
 * - Gets tracking events from Unisend
 * - Updates order status based on tracking state
 * - Sends delivery notification emails
 *
 * Schedule: Every 30 minutes via pg_cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Unisend API configuration
interface UnisendTokenCache {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

let tokenCache: UnisendTokenCache | null = null

interface TrackingEvent {
  eventType: string
  stateType: string
  stateText: string
  location?: string
  description?: string
  timestamp: string
}

interface StatusChange {
  orderId: string
  orderNumber: string
  oldStatus: string
  newStatus: string
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

    console.log('[Cron] Starting sync-tracking job...')

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const resend = new Resend(resendApiKey)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Second Turn <info@secondturn.games>'
    const appUrl = Deno.env.get('APP_URL') || 'https://secondturn.games'

    // Get Unisend configuration
    const unisendApiUrl = Deno.env.get('UNISEND_API_URL') || 'https://api-manosiuntostst.post.lt'
    const unisendUsername = Deno.env.get('UNISEND_USERNAME')!
    const unisendPassword = Deno.env.get('UNISEND_PASSWORD')!

    // Get all T2T orders with tracking that need syncing
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, barcode, status, buyer_id, seller_id, destination_terminal_name, destination_terminal_address')
      .eq('shipping_method', 't2t')
      .not('barcode', 'is', null)
      .in('status', ['accepted', 'shipped', 'in_transit'])

    if (ordersError) {
      console.error('[Cron] Error fetching orders:', ordersError)
      return new Response(JSON.stringify({ error: ordersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[Cron] Found ${orders?.length || 0} orders to sync`)

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        totalProcessed: 0,
        successCount: 0,
        errorCount: 0,
        statusChanges: [],
        deliveryEmailsSent: 0,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let successCount = 0
    let errorCount = 0
    const statusChanges: StatusChange[] = []

    // Process each order
    for (const order of orders) {
      try {
        const oldStatus = order.status

        // Get tracking events from Unisend
        const trackingEvents = await fetchUnisendTracking(
          unisendApiUrl,
          unisendUsername,
          unisendPassword,
          order.barcode!
        )

        if (!trackingEvents || trackingEvents.length === 0) {
          successCount++
          continue
        }

        // Insert tracking events
        let newEventsCount = 0
        for (const event of trackingEvents) {
          const { data: wasInserted, error: insertError } = await supabase.rpc('add_tracking_event', {
            p_order_id: order.id,
            p_event_type: event.eventType,
            p_state_type: event.stateType,
            p_state_text: event.stateText,
            p_location: event.location || null,
            p_description: event.description || event.stateText,
            p_event_timestamp: event.timestamp,
          })

          if (insertError) {
            console.error(`[Cron] Error inserting event:`, insertError)
          } else if (wasInserted) {
            newEventsCount++
          }
        }

        // Check if status changed
        const { data: updatedOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', order.id)
          .single()

        if (updatedOrder && updatedOrder.status !== oldStatus) {
          statusChanges.push({
            orderId: order.id,
            orderNumber: order.order_number,
            oldStatus,
            newStatus: updatedOrder.status,
          })
        }

        successCount++
      } catch (err: any) {
        console.error(`[Cron] Error syncing order ${order.id}:`, err.message)
        errorCount++
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log(`[Cron] Sync complete: ${successCount} success, ${errorCount} errors, ${statusChanges.length} status changes`)

    // Send delivery emails for newly delivered orders
    let deliveryEmailsSent = 0
    for (const change of statusChanges) {
      if (change.newStatus === 'delivered') {
        const order = orders.find(o => o.id === change.orderId)
        if (!order) continue

        // Fetch buyer and seller profiles
        const { data: buyerProfile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', order.buyer_id)
          .single()

        const { data: sellerProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', order.seller_id)
          .single()

        if (buyerProfile && sellerProfile) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: buyerProfile.email,
              subject: `Package Delivered - Order #${order.order_number}`,
              html: generateDeliveryEmailHtml({
                buyerName: buyerProfile.full_name,
                orderNumber: order.order_number,
                sellerName: sellerProfile.full_name,
                destinationTerminalName: order.destination_terminal_name || '',
                destinationTerminalAddress: order.destination_terminal_address || '',
                barcode: order.barcode || '',
                orderUrl: `${appUrl}/orders/${order.id}`,
                reviewUrl: `${appUrl}/orders/${order.id}/review`,
              }),
            })

            console.log(`[Cron] Delivery email sent for order ${order.id}`)
            deliveryEmailsSent++
          } catch (emailError: any) {
            console.error(`[Cron] Email failed for order ${order.id}:`, emailError.message)
          }
        }
      }
    }

    const result = {
      success: true,
      totalProcessed: orders.length,
      successCount,
      errorCount,
      statusChanges,
      deliveryEmailsSent,
      timestamp: new Date().toISOString(),
    }

    console.log('[Cron] Job completed:', result)

    return new Response(JSON.stringify(result), {
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
 * Authenticate with Unisend API
 */
async function authenticateUnisend(
  apiUrl: string,
  username: string,
  password: string
): Promise<void> {
  const params = new URLSearchParams({
    scope: 'read+write+API_CLIENT',
    grant_type: 'password',
    clientSystem: 'PUBLIC',
    username,
    password,
  })

  const response = await fetch(`${apiUrl}/oauth/token?${params.toString()}`, {
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Unisend authentication failed: ${text}`)
  }

  const data = await response.json()

  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
}

/**
 * Fetch tracking events from Unisend API
 */
async function fetchUnisendTracking(
  apiUrl: string,
  username: string,
  password: string,
  barcode: string
): Promise<TrackingEvent[]> {
  // Check if token is valid
  if (!tokenCache || tokenCache.expiresAt <= Date.now()) {
    await authenticateUnisend(apiUrl, username, password)
  }

  const response = await fetch(`${apiUrl}/api/v2/tracking/${barcode}/events`, {
    headers: {
      Authorization: `Bearer ${tokenCache!.accessToken}`,
      'Accept-Language': 'en',
    },
  })

  if (response.status === 401) {
    // Token expired, re-authenticate and retry
    tokenCache = null
    await authenticateUnisend(apiUrl, username, password)

    const retryResponse = await fetch(`${apiUrl}/api/v2/tracking/${barcode}/events`, {
      headers: {
        Authorization: `Bearer ${tokenCache!.accessToken}`,
        'Accept-Language': 'en',
      },
    })

    if (!retryResponse.ok) {
      throw new Error(`Unisend tracking request failed: ${retryResponse.status}`)
    }

    return retryResponse.json()
  }

  if (!response.ok) {
    throw new Error(`Unisend tracking request failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Generate delivery email HTML
 */
function generateDeliveryEmailHtml(params: {
  buyerName: string
  orderNumber: string
  sellerName: string
  destinationTerminalName: string
  destinationTerminalAddress: string
  barcode: string
  orderUrl: string
  reviewUrl: string
}): string {
  const {
    buyerName,
    orderNumber,
    sellerName,
    destinationTerminalName,
    destinationTerminalAddress,
    barcode,
    orderUrl,
    reviewUrl,
  } = params

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Your Package Has Arrived!</h1>

  <p>Hi ${buyerName},</p>

  <p>Great news! Your package from ${sellerName} is ready for pickup.</p>

  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0; font-weight: 600; color: #15803d;">Pickup Location</p>
    <p style="margin: 0 0 5px 0;"><strong>${destinationTerminalName}</strong></p>
    <p style="margin: 0; color: #666;">${destinationTerminalAddress}</p>
  </div>

  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 10px 0;"><strong>Order:</strong> #${orderNumber}</p>
    <p style="margin: 0;"><strong>Pickup Code:</strong> ${barcode}</p>
  </div>

  <p>You have <strong>7 days</strong> to pick up your package. After pickup, you'll have 3 days to inspect the games before the order is automatically completed.</p>

  <a href="${orderUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0;">View Order Details</a>

  <p style="margin-top: 30px;">Happy with your purchase? Please leave a review to help other buyers!</p>

  <a href="${reviewUrl}" style="display: inline-block; background: #f5f5f5; color: #333; text-decoration: none; padding: 12px 24px; border-radius: 6px; border: 1px solid #ddd;">Leave a Review</a>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px;">
    Second Turn Games - Baltic's Board Game Marketplace
  </p>
</body>
</html>
  `.trim()
}
