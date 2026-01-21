/**
 * Edge Function: send-auth-email
 *
 * Supabase Send Email Auth Hook that intercepts authentication emails
 * and sends them via Resend with locale-aware templates.
 *
 * Handles: signup, magiclink, recovery, email_change
 * Languages: English (en), Latvian (lv)
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@2'
import { getTranslation, type SupportedLocale } from './translations.ts'
import { buildEmailHtml } from './templates.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') || ''

// Detect local development environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const isLocalDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')

interface AuthEmailPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      preferred_locale?: string
      full_name?: string
    }
  }
  email_data: {
    token: string
    token_hash: string
    token_new?: string
    token_hash_new?: string
    redirect_to: string
    email_action_type: 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite' | 'reauthentication'
    site_url: string
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  let data: AuthEmailPayload

  try {
    if (isLocalDev) {
      // Skip webhook verification in local dev
      console.log('[send-auth-email] Local dev mode - skipping webhook verification')
      data = JSON.parse(payload)
    } else {
      // Verify webhook signature in production
      if (!hookSecret) {
        console.error('[send-auth-email] SEND_EMAIL_HOOK_SECRET not configured')
        return new Response(
          JSON.stringify({ error: { message: 'Hook secret not configured' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const secret = hookSecret.replace('v1,whsec_', '')
      const wh = new Webhook(secret)
      data = wh.verify(payload, headers) as AuthEmailPayload
    }
  } catch (error: unknown) {
    console.error('[send-auth-email] Webhook verification failed:', error)
    return new Response(
      JSON.stringify({ error: { message: error instanceof Error ? error.message : 'Webhook verification failed' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { user, email_data } = data

  // Determine user's preferred locale, default to English
  const locale = (user.user_metadata?.preferred_locale || 'en') as SupportedLocale

  // Only handle supported email types
  const supportedTypes = ['signup', 'magiclink', 'recovery', 'email_change']
  if (!supportedTypes.includes(email_data.email_action_type)) {
    console.log(`[send-auth-email] Unsupported email type: ${email_data.email_action_type}, skipping`)
    // Return empty success to let Supabase fall back to default
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const translation = getTranslation(locale, email_data.email_action_type)

    // Build verification URL
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`

    // Build HTML email
    const html = buildEmailHtml({
      heading: translation.heading,
      body: translation.body,
      ctaText: translation.cta,
      ctaUrl: verifyUrl,
      expiryNote: translation.expiryNote,
      featuresHeading: translation.featuresHeading,
      footerNote: translation.footerNote,
      footerSecurity: translation.footerSecurity,
      tagline: translation.tagline,
      features: translation.features,
    })

    console.log(`[send-auth-email] Sending ${email_data.email_action_type} email to ${user.email} in ${locale}`)

    // Send the email
    const { error } = await resend.emails.send({
      from: 'Second Turn Games <noreply@secondturn.games>',
      to: [user.email],
      subject: translation.subject,
      html,
    })

    if (error) {
      console.error('[send-auth-email] Resend error:', error)
      return new Response(
        JSON.stringify({ error: { message: error.message } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-auth-email] Email sent successfully to ${user.email}`)

    // Return empty response to indicate success (Supabase requirement)
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('[send-auth-email] Error:', error)
    return new Response(
      JSON.stringify({ error: { message: error instanceof Error ? error.message : 'Unknown error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
