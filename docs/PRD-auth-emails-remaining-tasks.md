# PRD: Multi-language Auth Emails — Remaining Tasks

**Project:** Second Turn Games  
**Feature:** Supabase Auth Hooks with Resend (Completion)  
**Version:** 1.1  
**Date:** January 2025  
**Prerequisites:** `translations.ts` and `templates.ts` already implemented

---

## 1. Overview

### 1.1 Current State

- ✅ `translations.ts` — Email content for EN and LV, all 4 email types
- ✅ `templates.ts` — HTML email builder matching brand design
- ⏳ Edge Function handler — Not yet created
- ⏳ Locale capture at signup — Not yet implemented
- ⏳ Configuration & deployment — Not yet done

### 1.2 Remaining Work

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Edge Function `index.ts` | Medium |
| P0 | Deno configuration | Small |
| P0 | Supabase config.toml | Small |
| P0 | Locale capture during auth | Medium |
| P1 | Local testing setup | Small |
| P1 | Production deployment | Small |
| P2 | Account settings language preference | Medium |

---

## 2. P0: Edge Function Handler

### 2.1 File: `supabase/functions/send-auth-email/index.ts`

```typescript
/**
 * Supabase Auth Email Hook
 * Intercepts auth emails and sends via Resend with locale support
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { getTranslation, SupportedLocale, EmailActionType } from './translations.ts'
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
    }
  }
  email_data: {
    token: string
    token_hash: string
    token_new?: string
    token_hash_new?: string
    redirect_to: string
    email_action_type: EmailActionType
    site_url: string
  }
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  let data: AuthEmailPayload

  try {
    if (isLocalDev) {
      // Skip webhook verification in local development
      console.log('[DEV] Skipping webhook signature verification')
      data = JSON.parse(payload)
    } else {
      // Verify webhook signature in production
      if (!hookSecret) {
        throw new Error('SEND_EMAIL_HOOK_SECRET not configured')
      }
      const secret = hookSecret.replace('v1,whsec_', '')
      const wh = new Webhook(secret)
      data = wh.verify(payload, headers) as AuthEmailPayload
    }
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return new Response(
      JSON.stringify({ error: { message: 'Invalid webhook signature' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { user, email_data } = data

  // Determine locale (default to English)
  const locale = (user.user_metadata?.preferred_locale || 'en') as SupportedLocale
  
  // Get translation for this email type
  const translation = getTranslation(locale, email_data.email_action_type)

  // Build verification URL
  // Use site_url from payload, fallback to SUPABASE_URL
  const baseUrl = email_data.site_url || supabaseUrl
  const verifyUrl = `${baseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`

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

  // Log for debugging (remove sensitive data)
  console.log(JSON.stringify({
    event: 'auth_email_sending',
    action_type: email_data.email_action_type,
    locale: locale,
    user_id: user.id,
    timestamp: new Date().toISOString(),
  }))

  try {
    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Second Turn Games <noreply@secondturngames.com>',
      to: [user.email],
      subject: translation.subject,
      html,
    })

    if (emailError) {
      console.error('Resend API error:', emailError)
      return new Response(
        JSON.stringify({ error: { message: emailError.message } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(JSON.stringify({
      event: 'auth_email_sent',
      action_type: email_data.email_action_type,
      locale: locale,
      user_id: user.id,
      resend_id: emailResult?.id,
      timestamp: new Date().toISOString(),
    }))

    // Return empty object to indicate success
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email send failed:', error)
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 2.2 File: `supabase/functions/send-auth-email/deno.json`

```json
{
  "imports": {
    "resend": "npm:resend@4.0.0"
  }
}
```

### 2.3 Implementation Notes

**Verification URL Construction:**
- Uses `site_url` from the payload (Supabase provides this)
- The URL format is: `{site_url}/auth/v1/verify?token={token_hash}&type={action_type}&redirect_to={redirect_to}`
- `redirect_to` must be URL-encoded

**Error Handling:**
- Returns 401 for webhook verification failures
- Returns 500 for Resend API errors
- Returns 200 with empty JSON `{}` for success (required by Supabase)

**Logging:**
- Structured JSON logs for monitoring
- Excludes sensitive data (email addresses, tokens)
- Includes Resend message ID for tracking

---

## 3. P0: Locale Capture During Auth

### 3.1 Problem

Users signing up need their locale stored in `user_metadata.preferred_locale` so the Edge Function can send emails in the correct language.

### 3.2 File: `lib/auth/AuthContext.tsx`

Update auth methods to accept and store locale:

```typescript
// Update signInWithMagicLink signature
async function signInWithMagicLink(email: string, locale?: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/${locale || 'en'}/auth/confirm`,
      data: {
        full_name: email.split('@')[0],
        preferred_locale: locale || 'en',
      },
    },
  })
  return { error }
}

// Update signUp signature (if using email/password)
async function signUp(
  email: string, 
  password: string, 
  fullName: string, 
  country: string,
  locale?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/${locale || 'en'}/auth/confirm`,
      data: {
        full_name: fullName,
        country: country,
        preferred_locale: locale || 'en',
      },
    },
  })
  return { error }
}

// Update signInWithOAuth signature
async function signInWithOAuth(
  provider: 'google' | 'github',
  locale?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/${locale || 'en'}/auth/confirm`,
    },
  })
  return { error }
}
```

### 3.3 File: `app/[locale]/auth/page.tsx`

Extract locale from URL and pass to auth methods:

```typescript
'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'

export default function AuthPage() {
  const params = useParams()
  const locale = params.locale as string || 'en'
  const { signInWithMagicLink, signInWithOAuth } = useAuth()

  const handleMagicLink = async (email: string) => {
    const { error } = await signInWithMagicLink(email, locale)
    // ... handle result
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    const { error } = await signInWithOAuth(provider, locale)
    // ... handle result
  }

  // ... rest of component
}
```

### 3.4 File: `app/[locale]/auth/confirm/route.ts`

Capture locale for OAuth users who don't have it set:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('redirect_to') ?? '/'

  // Extract locale from URL path: /[locale]/auth/confirm
  const pathSegments = requestUrl.pathname.split('/').filter(Boolean)
  const locale = pathSegments[0] || 'en'

  const supabase = await createClient()

  if (code) {
    // OAuth flow - exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user needs locale set (OAuth users)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && !user.user_metadata?.preferred_locale) {
        // Set locale based on the URL they used
        await supabase.auth.updateUser({
          data: { preferred_locale: locale }
        })
      }
      
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  if (token_hash && type) {
    // Magic link / email verification flow
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'recovery' | 'email' | 'magiclink',
    })
    
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // Error - redirect to auth page with error
  return NextResponse.redirect(
    new URL(`/${locale}/auth?error=verification_failed`, requestUrl.origin)
  )
}
```

### 3.5 Type Updates: `lib/auth/types.ts`

Ensure `preferred_locale` is in the type definitions:

```typescript
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  country?: string
  preferred_locale?: 'en' | 'lv'  // Add this if not present
  // ... other fields
}
```

---

## 4. P0: Configuration

### 4.1 File: `supabase/config.toml`

Add or update the auth hook configuration:

```toml
[auth.hook.send_email]
enabled = true
uri = "http://host.docker.internal:54321/functions/v1/send-auth-email"
secrets = "env(SEND_EMAIL_HOOK_SECRET)"
```

**Note:** This is for local development. Production hook is configured via Dashboard.

### 4.2 File: `.env.local`

Add required environment variables:

```bash
# Resend API (if not already present)
RESEND_API_KEY=re_xxxxx

# Auth hook secret (simple value for local dev)
SEND_EMAIL_HOOK_SECRET=local_dev_secret_12345
```

### 4.3 Supabase Secrets (Production)

```bash
# Set production secrets via CLI
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_xxxxx
```

---

## 5. P1: Deployment

### 5.1 Deploy Edge Function

```bash
# Navigate to project directory
cd packages/marketplace

# Deploy function (--no-verify-jwt required for auth hooks)
supabase functions deploy send-auth-email --no-verify-jwt
```

### 5.2 Configure Hook in Supabase Dashboard

1. Go to **Authentication → Hooks**
2. Click **Add new hook**
3. Select **Send Email** as hook type
4. Choose **HTTPS** endpoint type
5. Enter URL: `https://ettbijaifahenypkmsts.supabase.co/functions/v1/send-auth-email`
6. Click **Generate secret**
7. Copy the generated secret (format: `v1,whsec_xxxxx`)
8. Run: `supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_xxxxx`
9. Save the hook

### 5.3 Verify Deployment

```bash
# Check function is deployed
supabase functions list

# Check logs
supabase functions logs send-auth-email
```

---

## 6. P1: Local Testing

### 6.1 Start Local Supabase

```bash
# Full restart required for hook config changes
supabase stop
supabase start
```

### 6.2 Serve Edge Function

```bash
# In a separate terminal
supabase functions serve send-auth-email --env-file .env.local
```

### 6.3 Test Manually (Optional)

```bash
# Direct function test (bypasses Supabase auth)
curl -X POST http://localhost:54321/functions/v1/send-auth-email \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "id": "test-user-id",
      "email": "your-test-email@example.com",
      "user_metadata": {
        "preferred_locale": "lv"
      }
    },
    "email_data": {
      "token": "test-token",
      "token_hash": "test-token-hash",
      "redirect_to": "http://localhost:3000/",
      "email_action_type": "signup",
      "site_url": "http://localhost:54321"
    }
  }'
```

### 6.4 Test Checklist

| Test | Steps | Expected |
|------|-------|----------|
| EN Signup | Go to `/en/auth`, enter email | English confirmation email |
| LV Signup | Go to `/lv/auth`, enter email | Latvian confirmation email |
| Magic Link EN | Request magic link on `/en/auth` | English magic link email |
| Magic Link LV | Request magic link on `/lv/auth` | Latvian magic link email |
| Password Reset | Click "Forgot password" | Email in user's stored locale |
| OAuth Signup | Sign in with Google on `/lv/auth` | Locale captured from URL |
| Fallback | User without locale preference | English email |

---

## 7. P2: Account Settings Language Preference

### 7.1 Overview

Allow users to change their email language preference after signup.

### 7.2 File: `app/[locale]/account/settings/page.tsx`

Add language preference dropdown to existing settings page:

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { createClient } from '@/lib/supabase/client'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'lv', label: 'Latviešu' },
] as const

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [preferredLocale, setPreferredLocale] = useState(
    user?.user_metadata?.preferred_locale || 'en'
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleLanguageChange = async (newLocale: string) => {
    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { preferred_locale: newLocale }
    })

    if (error) {
      setMessage('Failed to update language preference')
    } else {
      setPreferredLocale(newLocale)
      setMessage('Language preference updated')
      await refreshUser?.()
    }

    setSaving(false)
  }

  return (
    <div>
      {/* ... other settings ... */}
      
      <section>
        <h2>Email Language</h2>
        <p>Choose which language you'd like to receive emails in.</p>
        
        <select
          value={preferredLocale}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={saving}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {message && <p>{message}</p>}
      </section>
      
      {/* ... other settings ... */}
    </div>
  )
}
```

### 7.3 Translations for Settings UI

Add to your i18n translation files:

```json
// en.json
{
  "settings": {
    "emailLanguage": {
      "title": "Email language",
      "description": "Choose which language you'd like to receive emails in.",
      "updated": "Language preference updated",
      "error": "Failed to update language preference"
    }
  }
}

// lv.json
{
  "settings": {
    "emailLanguage": {
      "title": "E-pasta valoda",
      "description": "Izvēlies, kādā valodā vēlies saņemt e-pastus.",
      "updated": "Valodas izvēle saglabāta",
      "error": "Neizdevās saglabāt valodas izvēli"
    }
  }
}
```

---

## 8. File Summary

### New Files

| File | Priority | Status |
|------|----------|--------|
| `supabase/functions/send-auth-email/index.ts` | P0 | Create |
| `supabase/functions/send-auth-email/deno.json` | P0 | Create |
| `supabase/config.toml` | P0 | Create/Update |

### Modified Files

| File | Priority | Changes |
|------|----------|---------|
| `lib/auth/AuthContext.tsx` | P0 | Add locale param to auth methods |
| `app/[locale]/auth/page.tsx` | P0 | Extract and pass locale |
| `app/[locale]/auth/confirm/route.ts` | P0 | Capture locale for OAuth |
| `lib/auth/types.ts` | P0 | Add `preferred_locale` type |
| `.env.local` | P0 | Add secrets |
| `app/[locale]/account/settings/page.tsx` | P2 | Add language preference |

### Existing Files (No Changes)

| File | Status |
|------|--------|
| `supabase/functions/send-auth-email/translations.ts` | ✅ Done |
| `supabase/functions/send-auth-email/templates.ts` | ✅ Done |

---

## 9. Acceptance Criteria

### P0 (Must have for launch)

- [ ] Edge Function deploys successfully
- [ ] Signup on `/en/auth` sends English email
- [ ] Signup on `/lv/auth` sends Latvian email
- [ ] Magic link requests work in both languages
- [ ] Password reset emails work
- [ ] OAuth users get locale captured from URL
- [ ] Users without locale default to English
- [ ] No errors in Supabase function logs
- [ ] Emails render correctly in Gmail, Outlook, Apple Mail

### P1 (Should have)

- [ ] Local development testing works
- [ ] Production deployment documented
- [ ] Monitoring/logging in place

### P2 (Nice to have)

- [ ] Account settings language preference works
- [ ] Settings UI translated

---

## 10. Rollback Plan

If issues occur after deployment:

1. **Disable the hook** in Supabase Dashboard → Authentication → Hooks
2. Supabase will fall back to default email templates
3. Investigate logs: `supabase functions logs send-auth-email`
4. Fix and redeploy

---

**Document Version:** 1.1  
**Last Updated:** January 2025
