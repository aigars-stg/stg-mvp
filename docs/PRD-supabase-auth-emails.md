# PRD: Multi-language Authentication Emails

**Project:** Second Turn Games  
**Feature:** Supabase Auth Hooks with Resend Integration  
**Version:** 1.0  
**Date:** January 2025

---

## 1. Overview

### 1.1 Problem Statement

Second Turn Games is a Baltic board game marketplace serving Latvia, Lithuania, and Estonia. The platform requires authentication emails (signup confirmation, magic link, password reset, email change) in four languages: English, Latvian, Lithuanian, and Estonian.

Supabase's built-in auth emails only support one template per email type, making multi-language support impossible without customization.

### 1.2 Solution

Implement Supabase's **Send Email Auth Hook** to intercept all authentication emails and route them through Resend with locale-aware template selection. The user's language preference is stored in `user_metadata.preferred_lang` during signup and used to select the appropriate email template.

### 1.3 Success Criteria

- All auth emails sent in the user's preferred language
- Email design matches Second Turn Games brand identity
- Link expiration and token handling work correctly
- Emails render properly across major email clients
- Implementation works in both local development and production

---

## 2. Technical Architecture

### 2.1 Flow Diagram

```
User triggers auth action (signup, magic link, etc.)
    ↓
Supabase Auth generates token/link
    ↓
Send Email Hook intercepts (instead of default SMTP)
    ↓
Edge Function receives payload with user data + token
    ↓
Function reads user.user_metadata.preferred_lang
    ↓
Selects appropriate language template
    ↓
Constructs verification URL with token_hash
    ↓
Sends email via Resend API
    ↓
Returns empty response to confirm success
```

### 2.2 Tech Stack

- **Supabase Edge Functions** (Deno runtime)
- **Resend** for email delivery
- **React Email** (optional, for template development)
- **Next.js 14 App Router** (existing application)

### 2.3 Environment Variables

```bash
# Edge Function secrets (set via Supabase CLI)
RESEND_API_KEY=re_xxxxx
SEND_EMAIL_HOOK_SECRET=v1,whsec_xxxxx

# Derived from Supabase (available automatically)
SUPABASE_URL=https://[project-ref].supabase.co
```

---

## 3. Email Types

The hook must handle these `email_action_type` values:

| Type | Trigger | Purpose |
|------|---------|---------|
| `signup` | User registers with email/password | Confirm email address |
| `magiclink` | User requests passwordless login | One-time login link |
| `recovery` | User requests password reset | Reset password link |
| `email_change` | User changes email address | Confirm new email |
| `invite` | Admin invites user | Accept invitation |
| `reauthentication` | Sensitive action requires re-auth | Confirm identity |

**Priority for v1.0:** `signup`, `magiclink`, `recovery`, `email_change`

---

## 4. Email Content Requirements

### 4.1 Brand Voice Guidelines

From the Second Turn Games Brand Voice Guide:

**Voice Pillars:**
- **Welcoming:** Warm, inclusive, like inviting someone to game night
- **Straightforward:** Clear, simple language, lead with important info
- **Playful:** Room for wit, but humor supports communication
- **Trustworthy:** Reliable, transparent, security language in payment contexts

**Email Structure:**
1. Subject line: Clear, specific, no clickbait
2. Opening: Confirmation or key information first
3. Body: Details and context
4. Call to action: One clear next step
5. Sign-off: Warm, brief

**Word Preferences:**
- Use "pre-loved" not "used/secondhand"
- Use "discover" not "purchase"
- Use "community" not "user base"
- Use contractions (we're, you'll, it's)
- Avoid exclamation marks except for celebrations

### 4.2 Design Specifications

Match the existing confirmation email design:

```
Colors:
- Background: #ECEFF4 (Frost)
- Card: #FEFEFE (White)
- Accent bar: #88C0D0 (Aurora blue)
- Primary text: #2E3440 (Polar Night)
- Secondary text: #4C566A (Polar Night light)
- Divider: #D8DEE9

Typography:
- Font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- Heading: 24px, weight 600
- Body: 16px, line-height 1.6
- Caption: 13px

Layout:
- Max width: 520px
- Card border-radius: 16px
- Button border-radius: 10px
- Padding: 40px horizontal, 32px between sections

Logo:
- URL: https://ettbijaifahenypkmsts.supabase.co/storage/v1/object/public/public-assets/logo_nav.svg
- Width: 180px
```

### 4.3 Email Templates

#### 4.3.1 Signup Confirmation

**Intent:** Welcome user warmly, confirm this is legitimate, provide clear action

**English:**
```
Subject: Confirm your email – welcome to Second Turn Games 🎲

Preheader: You're one click away from joining the Baltic's community for pre-loved board games.

---

[Logo]

Hey there – welcome!

You're one click away from joining the Baltic's community for pre-loved board games. Confirm your email and start discovering.

[Button: Confirm my email]

This link expires in 1 hour.

---

Once you're in, you can:
• Discover games from your community
• Save your favorites to a wishlist
• List games to sell (completely free!)

---

Didn't sign up? Just ignore this – nothing will happen.
Questions? Reply to this email – we're happy to help.

---

Second Turn Games SIA · Riga, Latvia
Every game deserves a second turn
```

**Latvian:**
```
Subject: Apstiprini savu e-pastu – laipni lūdzam Second Turn Games 🎲

Preheader: Viens klikšķis, un tu būsi daļa no Baltijas galda spēļu kopienas.

---

[Logo]

Sveiks – laipni lūdzam!

Viens klikšķis, un tu būsi daļa no Baltijas kopienas, kur galda spēles atrod jaunus spēlētājus. Apstiprini savu e-pastu un sāc atklāt.

[Button: Apstiprināt e-pastu]

Šī saite derīga 1 stundu.

---

Kad būsi iekšā, tu varēsi:
• Atklāt spēles no savas kopienas
• Saglabāt favorītus vēlmju sarakstā
• Pārdot spēles (pilnīgi bez maksas!)

---

Nereģistrējies? Vienkārši ignorē šo – nekas nenotiks.
Jautājumi? Atbildi uz šo e-pastu – labprāt palīdzēsim.

---

Second Turn Games SIA · Rīga, Latvija
Katra spēle ir pelnījusi vēl vienu kārtu
```

**Lithuanian:**
```
Subject: Patvirtink savo el. paštą – sveiki atvykę į Second Turn Games 🎲

Preheader: Vienas paspaudimas, ir būsi Baltijos stalo žaidimų bendruomenės dalis.

---

[Logo]

Sveiki – džiaugiamės, kad esi čia!

Vienas paspaudimas, ir prisijungsi prie Baltijos bendruomenės, kur stalo žaidimai randa naujus žaidėjus. Patvirtink savo el. paštą ir pradėk atrasti.

[Button: Patvirtinti el. paštą]

Ši nuoroda galioja 1 valandą.

---

Kai būsi viduje, galėsi:
• Atrasti žaidimus iš savo bendruomenės
• Išsaugoti mėgstamiausius norų sąraše
• Parduoti žaidimus (visiškai nemokamai!)

---

Neregistravotės? Tiesiog ignoruok – nieko neįvyks.
Klausimai? Atsakyk į šį laišką – mielai padėsime.

---

Second Turn Games SIA · Ryga, Latvija
Kiekvienas žaidimas nusipelno dar vieno ėjimo
```

**Estonian:**
```
Subject: Kinnita oma e-post – tere tulemast Second Turn Games'i 🎲

Preheader: Üks klikk, ja oled osa Baltikumi lauamängude kogukonnast.

---

[Logo]

Tere – tore, et liitud!

Üks klikk, ja oled osa Baltikumi kogukonnast, kus lauamängud leiavad uued mängijad. Kinnita oma e-post ja alusta avastamist.

[Button: Kinnita e-post]

See link aegub 1 tunni pärast.

---

Kui oled sees, saad:
• Avastada mänge oma kogukonnast
• Salvestada lemmikud soovinimekirja
• Müüa mänge (täiesti tasuta!)

---

Ei registreerunud? Lihtsalt ignoreeri – midagi ei juhtu.
Küsimused? Vasta sellele e-kirjale – aitame hea meelega.

---

Second Turn Games SIA · Riia, Läti
Iga mäng väärib teist vooru
```

#### 4.3.2 Magic Link

**Intent:** Get user logged in quickly, emphasize security

**English:**
```
Subject: Your login link for Second Turn Games

Preheader: Click to sign in – no password needed.

---

[Logo]

Sign in to Second Turn Games

Click below to sign in to your account. No password needed – this link works just once.

[Button: Sign in]

This link expires in 1 hour.

---

Didn't request this? You can safely ignore this email.

---

Second Turn Games SIA · Riga, Latvia
Every game deserves a second turn
```

**Latvian:**
```
Subject: Tava pieteikšanās saite Second Turn Games

Preheader: Noklikšķini, lai pieteiktos – parole nav nepieciešama.

---

[Logo]

Piesakies Second Turn Games

Noklikšķini zemāk, lai pieteiktos savā kontā. Parole nav nepieciešama – šī saite darbojas tikai vienu reizi.

[Button: Pieteikties]

Šī saite derīga 1 stundu.

---

Nepieprasīji? Droši ignorē šo e-pastu.

---

Second Turn Games SIA · Rīga, Latvija
Katra spēle ir pelnījusi vēl vienu kārtu
```

**Lithuanian:**
```
Subject: Tavo prisijungimo nuoroda Second Turn Games

Preheader: Spustelėk, kad prisijungtum – slaptažodžio nereikia.

---

[Logo]

Prisijunk prie Second Turn Games

Spustelėk žemiau, kad prisijungtum prie savo paskyros. Slaptažodžio nereikia – ši nuoroda veikia tik vieną kartą.

[Button: Prisijungti]

Ši nuoroda galioja 1 valandą.

---

Neprašei? Drąsiai ignoruok šį laišką.

---

Second Turn Games SIA · Ryga, Latvija
Kiekvienas žaidimas nusipelno dar vieno ėjimo
```

**Estonian:**
```
Subject: Sinu sisselogimise link Second Turn Games

Preheader: Kliki sisselogimiseks – parooli pole vaja.

---

[Logo]

Logi sisse Second Turn Games'i

Kliki allpool, et oma kontole sisse logida. Parooli pole vaja – see link töötab ainult üks kord.

[Button: Logi sisse]

See link aegub 1 tunni pärast.

---

Ei küsinud? Võid seda e-kirja rahulikult ignoreerida.

---

Second Turn Games SIA · Riia, Läti
Iga mäng väärib teist vooru
```

#### 4.3.3 Password Recovery

**Intent:** Help user regain access, reassure about security

**English:**
```
Subject: Reset your password – Second Turn Games

Preheader: Click to create a new password.

---

[Logo]

Reset your password

Someone requested a password reset for your Second Turn Games account. Click below to create a new password.

[Button: Reset password]

This link expires in 1 hour.

---

Didn't request this? You can safely ignore this email. Your password won't change unless you click the link above.

---

Second Turn Games SIA · Riga, Latvia
Every game deserves a second turn
```

**Latvian:**
```
Subject: Atjauno savu paroli – Second Turn Games

Preheader: Noklikšķini, lai izveidotu jaunu paroli.

---

[Logo]

Atjauno savu paroli

Kāds pieprasīja paroles atjaunošanu tavam Second Turn Games kontam. Noklikšķini zemāk, lai izveidotu jaunu paroli.

[Button: Atjaunot paroli]

Šī saite derīga 1 stundu.

---

Nepieprasīji? Droši ignorē šo e-pastu. Tava parole netiks mainīta, ja nenoklikšķināsi uz saites.

---

Second Turn Games SIA · Rīga, Latvija
Katra spēle ir pelnījusi vēl vienu kārtu
```

**Lithuanian:**
```
Subject: Atkurk savo slaptažodį – Second Turn Games

Preheader: Spustelėk, kad sukurtum naują slaptažodį.

---

[Logo]

Atkurk savo slaptažodį

Kažkas paprašė slaptažodžio atkūrimo tavo Second Turn Games paskyrai. Spustelėk žemiau, kad sukurtum naują slaptažodį.

[Button: Atkurti slaptažodį]

Ši nuoroda galioja 1 valandą.

---

Neprašei? Drąsiai ignoruok šį laišką. Tavo slaptažodis nebus pakeistas, jei nepaspaudai nuorodos.

---

Second Turn Games SIA · Ryga, Latvija
Kiekvienas žaidimas nusipelno dar vieno ėjimo
```

**Estonian:**
```
Subject: Taasta oma parool – Second Turn Games

Preheader: Kliki uue parooli loomiseks.

---

[Logo]

Taasta oma parool

Keegi soovis sinu Second Turn Games'i konto parooli taastada. Kliki allpool, et luua uus parool.

[Button: Taasta parool]

See link aegub 1 tunni pärast.

---

Ei küsinud? Võid seda e-kirja rahulikult ignoreerida. Sinu parool ei muutu, kui sa lingil ei kliki.

---

Second Turn Games SIA · Riia, Läti
Iga mäng väärib teist vooru
```

#### 4.3.4 Email Change

**Intent:** Confirm the change, emphasize this is a security action

**English:**
```
Subject: Confirm your new email address – Second Turn Games

Preheader: Click to confirm your email change.

---

[Logo]

Confirm your new email

You requested to change your email address for your Second Turn Games account. Click below to confirm this change.

[Button: Confirm email change]

This link expires in 1 hour.

---

Didn't request this? Please secure your account immediately by resetting your password.

---

Second Turn Games SIA · Riga, Latvia
Every game deserves a second turn
```

**Latvian:**
```
Subject: Apstiprini savu jauno e-pasta adresi – Second Turn Games

Preheader: Noklikšķini, lai apstiprinātu e-pasta maiņu.

---

[Logo]

Apstiprini savu jauno e-pastu

Tu pieprasīji e-pasta adreses maiņu savam Second Turn Games kontam. Noklikšķini zemāk, lai apstiprinātu šo maiņu.

[Button: Apstiprināt e-pasta maiņu]

Šī saite derīga 1 stundu.

---

Nepieprasīji? Lūdzu, nekavējoties nodrošini savu kontu, atjaunojot paroli.

---

Second Turn Games SIA · Rīga, Latvija
Katra spēle ir pelnījusi vēl vienu kārtu
```

**Lithuanian:**
```
Subject: Patvirtink savo naują el. pašto adresą – Second Turn Games

Preheader: Spustelėk, kad patvirtintum el. pašto keitimą.

---

[Logo]

Patvirtink savo naują el. paštą

Tu paprašei pakeisti el. pašto adresą savo Second Turn Games paskyroje. Spustelėk žemiau, kad patvirtintum šį pakeitimą.

[Button: Patvirtinti el. pašto keitimą]

Ši nuoroda galioja 1 valandą.

---

Neprašei? Prašome nedelsiant apsaugoti savo paskyrą atstatant slaptažodį.

---

Second Turn Games SIA · Ryga, Latvija
Kiekvienas žaidimas nusipelno dar vieno ėjimo
```

**Estonian:**
```
Subject: Kinnita oma uus e-posti aadress – Second Turn Games

Preheader: Kliki e-posti muudatuse kinnitamiseks.

---

[Logo]

Kinnita oma uus e-post

Sa soovisid muuta oma Second Turn Games'i konto e-posti aadressi. Kliki allpool, et seda muudatust kinnitada.

[Button: Kinnita e-posti muudatus]

See link aegub 1 tunni pärast.

---

Ei küsinud? Palun kaitse oma kontot kohe parooli taastamisega.

---

Second Turn Games SIA · Riia, Läti
Iga mäng väärib teist vooru
```

---

## 5. Implementation Specification

### 5.1 File Structure

```
supabase/
├── functions/
│   └── send-auth-email/
│       ├── index.ts          # Main Edge Function
│       ├── translations.ts   # i18n content
│       ├── templates.ts      # HTML template builder
│       └── deno.json         # Deno configuration
└── config.toml               # Local dev configuration (update)
```

### 5.2 Edge Function Code

**`supabase/functions/send-auth-email/index.ts`**

```typescript
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { getTranslation, SupportedLocale } from './translations.ts'
import { buildEmailHtml } from './templates.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')!

interface AuthEmailPayload {
  user: {
    id: string
    email: string
    user_metadata?: {
      preferred_lang?: string
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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  // Strip the v1,whsec_ prefix from the secret
  const secret = hookSecret.replace('v1,whsec_', '')
  const wh = new Webhook(secret)

  try {
    const { user, email_data } = wh.verify(payload, headers) as AuthEmailPayload
    
    // Determine user's preferred language, default to English
    const locale = (user.user_metadata?.preferred_lang || 'en') as SupportedLocale
    const translation = getTranslation(locale, email_data.email_action_type)
    
    // Build verification URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`
    
    // Build HTML email
    const html = buildEmailHtml({
      heading: translation.heading,
      body: translation.body,
      ctaText: translation.cta,
      ctaUrl: verifyUrl,
      footerNote: translation.footerNote,
      footerSecurity: translation.footerSecurity,
      tagline: translation.tagline,
      features: translation.features,
    })

    // Handle email_change special case (two emails needed)
    if (email_data.email_action_type === 'email_change' && email_data.token_hash_new) {
      // Send to current email
      const currentEmailUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash_new}&type=email_change&redirect_to=${encodeURIComponent(email_data.redirect_to)}`
      const currentEmailHtml = buildEmailHtml({
        heading: translation.heading,
        body: translation.body,
        ctaText: translation.cta,
        ctaUrl: currentEmailUrl,
        footerNote: translation.footerNote,
        footerSecurity: translation.footerSecurity,
        tagline: translation.tagline,
      })
      
      await resend.emails.send({
        from: 'Second Turn Games <noreply@secondturngames.com>',
        to: [user.email],
        subject: translation.subject,
        html: currentEmailHtml,
      })
      
      // Note: The new email address would need to be sent separately
      // For now, we handle the primary flow
    }

    // Send the email
    const { error } = await resend.emails.send({
      from: 'Second Turn Games <noreply@secondturngames.com>',
      to: [user.email],
      subject: translation.subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(
        JSON.stringify({ error: { message: error.message } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return empty response to indicate success
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Hook verification error:', error)
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 5.3 Translations Module

**`supabase/functions/send-auth-email/translations.ts`**

```typescript
export type SupportedLocale = 'en' | 'lv' | 'lt' | 'et'
export type EmailActionType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite' | 'reauthentication'

interface EmailTranslation {
  subject: string
  heading: string
  body: string
  cta: string
  footerNote: string
  footerSecurity: string
  tagline: string
  features?: string[]
}

type TranslationMap = {
  [K in SupportedLocale]: {
    [T in EmailActionType]?: EmailTranslation
  }
}

const translations: TranslationMap = {
  en: {
    signup: {
      subject: 'Confirm your email – welcome to Second Turn Games 🎲',
      heading: 'Hey there – welcome!',
      body: "You're one click away from joining the Baltic's community for pre-loved board games. Confirm your email and start discovering.",
      cta: 'Confirm my email',
      footerNote: "Didn't sign up? Just ignore this – nothing will happen.",
      footerSecurity: "Questions? Reply to this email – we're happy to help.",
      tagline: 'Every game deserves a second turn',
      features: [
        'Discover games from your community',
        'Save your favorites to a wishlist',
        'List games to sell (completely free!)',
      ],
    },
    magiclink: {
      subject: 'Your login link for Second Turn Games',
      heading: 'Sign in to Second Turn Games',
      body: 'Click below to sign in to your account. No password needed – this link works just once.',
      cta: 'Sign in',
      footerNote: "Didn't request this? You can safely ignore this email.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
    recovery: {
      subject: 'Reset your password – Second Turn Games',
      heading: 'Reset your password',
      body: 'Someone requested a password reset for your Second Turn Games account. Click below to create a new password.',
      cta: 'Reset password',
      footerNote: "Didn't request this? You can safely ignore this email. Your password won't change unless you click the link above.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
    email_change: {
      subject: 'Confirm your new email address – Second Turn Games',
      heading: 'Confirm your new email',
      body: 'You requested to change your email address for your Second Turn Games account. Click below to confirm this change.',
      cta: 'Confirm email change',
      footerNote: "Didn't request this? Please secure your account immediately by resetting your password.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
  },
  lv: {
    signup: {
      subject: 'Apstiprini savu e-pastu – laipni lūdzam Second Turn Games 🎲',
      heading: 'Sveiks – laipni lūdzam!',
      body: 'Viens klikšķis, un tu būsi daļa no Baltijas kopienas, kur galda spēles atrod jaunus spēlētājus. Apstiprini savu e-pastu un sāc atklāt.',
      cta: 'Apstiprināt e-pastu',
      footerNote: 'Nereģistrējies? Vienkārši ignorē šo – nekas nenotiks.',
      footerSecurity: 'Jautājumi? Atbildi uz šo e-pastu – labprāt palīdzēsim.',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
      features: [
        'Atklāt spēles no savas kopienas',
        'Saglabāt favorītus vēlmju sarakstā',
        'Pārdot spēles (pilnīgi bez maksas!)',
      ],
    },
    magiclink: {
      subject: 'Tava pieteikšanās saite Second Turn Games',
      heading: 'Piesakies Second Turn Games',
      body: 'Noklikšķini zemāk, lai pieteiktos savā kontā. Parole nav nepieciešama – šī saite darbojas tikai vienu reizi.',
      cta: 'Pieteikties',
      footerNote: 'Nepieprasīji? Droši ignorē šo e-pastu.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
    recovery: {
      subject: 'Atjauno savu paroli – Second Turn Games',
      heading: 'Atjauno savu paroli',
      body: 'Kāds pieprasīja paroles atjaunošanu tavam Second Turn Games kontam. Noklikšķini zemāk, lai izveidotu jaunu paroli.',
      cta: 'Atjaunot paroli',
      footerNote: 'Nepieprasīji? Droši ignorē šo e-pastu. Tava parole netiks mainīta, ja nenoklikšķināsi uz saites.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
    email_change: {
      subject: 'Apstiprini savu jauno e-pasta adresi – Second Turn Games',
      heading: 'Apstiprini savu jauno e-pastu',
      body: 'Tu pieprasīji e-pasta adreses maiņu savam Second Turn Games kontam. Noklikšķini zemāk, lai apstiprinātu šo maiņu.',
      cta: 'Apstiprināt e-pasta maiņu',
      footerNote: 'Nepieprasīji? Lūdzu, nekavējoties nodrošini savu kontu, atjaunojot paroli.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
  },
  lt: {
    signup: {
      subject: 'Patvirtink savo el. paštą – sveiki atvykę į Second Turn Games 🎲',
      heading: 'Sveiki – džiaugiamės, kad esi čia!',
      body: 'Vienas paspaudimas, ir prisijungsi prie Baltijos bendruomenės, kur stalo žaidimai randa naujus žaidėjus. Patvirtink savo el. paštą ir pradėk atrasti.',
      cta: 'Patvirtinti el. paštą',
      footerNote: 'Neregistravotės? Tiesiog ignoruok – nieko neįvyks.',
      footerSecurity: 'Klausimai? Atsakyk į šį laišką – mielai padėsime.',
      tagline: 'Kiekvienas žaidimas nusipelno dar vieno ėjimo',
      features: [
        'Atrasti žaidimus iš savo bendruomenės',
        'Išsaugoti mėgstamiausius norų sąraše',
        'Parduoti žaidimus (visiškai nemokamai!)',
      ],
    },
    magiclink: {
      subject: 'Tavo prisijungimo nuoroda Second Turn Games',
      heading: 'Prisijunk prie Second Turn Games',
      body: 'Spustelėk žemiau, kad prisijungtum prie savo paskyros. Slaptažodžio nereikia – ši nuoroda veikia tik vieną kartą.',
      cta: 'Prisijungti',
      footerNote: 'Neprašei? Drąsiai ignoruok šį laišką.',
      footerSecurity: '',
      tagline: 'Kiekvienas žaidimas nusipelno dar vieno ėjimo',
    },
    recovery: {
      subject: 'Atkurk savo slaptažodį – Second Turn Games',
      heading: 'Atkurk savo slaptažodį',
      body: 'Kažkas paprašė slaptažodžio atkūrimo tavo Second Turn Games paskyrai. Spustelėk žemiau, kad sukurtum naują slaptažodį.',
      cta: 'Atkurti slaptažodį',
      footerNote: 'Neprašei? Drąsiai ignoruok šį laišką. Tavo slaptažodis nebus pakeistas, jei nepaspaudai nuorodos.',
      footerSecurity: '',
      tagline: 'Kiekvienas žaidimas nusipelno dar vieno ėjimo',
    },
    email_change: {
      subject: 'Patvirtink savo naują el. pašto adresą – Second Turn Games',
      heading: 'Patvirtink savo naują el. paštą',
      body: 'Tu paprašei pakeisti el. pašto adresą savo Second Turn Games paskyroje. Spustelėk žemiau, kad patvirtintum šį pakeitimą.',
      cta: 'Patvirtinti el. pašto keitimą',
      footerNote: 'Neprašei? Prašome nedelsiant apsaugoti savo paskyrą atstatant slaptažodį.',
      footerSecurity: '',
      tagline: 'Kiekvienas žaidimas nusipelno dar vieno ėjimo',
    },
  },
  et: {
    signup: {
      subject: 'Kinnita oma e-post – tere tulemast Second Turn Games'i 🎲',
      heading: 'Tere – tore, et liitud!',
      body: 'Üks klikk, ja oled osa Baltikumi kogukonnast, kus lauamängud leiavad uued mängijad. Kinnita oma e-post ja alusta avastamist.',
      cta: 'Kinnita e-post',
      footerNote: 'Ei registreerunud? Lihtsalt ignoreeri – midagi ei juhtu.',
      footerSecurity: 'Küsimused? Vasta sellele e-kirjale – aitame hea meelega.',
      tagline: 'Iga mäng väärib teist vooru',
      features: [
        'Avastada mänge oma kogukonnast',
        'Salvestada lemmikud soovinimekirja',
        'Müüa mänge (täiesti tasuta!)',
      ],
    },
    magiclink: {
      subject: 'Sinu sisselogimise link Second Turn Games',
      heading: 'Logi sisse Second Turn Games'i',
      body: 'Kliki allpool, et oma kontole sisse logida. Parooli pole vaja – see link töötab ainult üks kord.',
      cta: 'Logi sisse',
      footerNote: 'Ei küsinud? Võid seda e-kirja rahulikult ignoreerida.',
      footerSecurity: '',
      tagline: 'Iga mäng väärib teist vooru',
    },
    recovery: {
      subject: 'Taasta oma parool – Second Turn Games',
      heading: 'Taasta oma parool',
      body: 'Keegi soovis sinu Second Turn Games'i konto parooli taastada. Kliki allpool, et luua uus parool.',
      cta: 'Taasta parool',
      footerNote: 'Ei küsinud? Võid seda e-kirja rahulikult ignoreerida. Sinu parool ei muutu, kui sa lingil ei kliki.',
      footerSecurity: '',
      tagline: 'Iga mäng väärib teist vooru',
    },
    email_change: {
      subject: 'Kinnita oma uus e-posti aadress – Second Turn Games',
      heading: 'Kinnita oma uus e-post',
      body: 'Sa soovisid muuta oma Second Turn Games'i konto e-posti aadressi. Kliki allpool, et seda muudatust kinnitada.',
      cta: 'Kinnita e-posti muudatus',
      footerNote: 'Ei küsinud? Palun kaitse oma kontot kohe parooli taastamisega.',
      footerSecurity: '',
      tagline: 'Iga mäng väärib teist vooru',
    },
  },
}

export function getTranslation(locale: SupportedLocale, actionType: EmailActionType): EmailTranslation {
  const localeTranslations = translations[locale] || translations.en
  const translation = localeTranslations[actionType] || translations.en[actionType]
  
  if (!translation) {
    throw new Error(`No translation found for ${locale}/${actionType}`)
  }
  
  return translation
}
```

### 5.4 HTML Template Builder

**`supabase/functions/send-auth-email/templates.ts`**

```typescript
interface EmailTemplateProps {
  heading: string
  body: string
  ctaText: string
  ctaUrl: string
  footerNote: string
  footerSecurity: string
  tagline: string
  features?: string[]
}

export function buildEmailHtml(props: EmailTemplateProps): string {
  const { heading, body, ctaText, ctaUrl, footerNote, footerSecurity, tagline, features } = props
  
  const logoUrl = 'https://ettbijaifahenypkmsts.supabase.co/storage/v1/object/public/public-assets/logo_nav.svg'
  
  const featuresHtml = features && features.length > 0
    ? `
      <tr>
        <td style="padding: 0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="height: 1px; background-color: #D8DEE9;"></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px 40px 32px 40px;">
          <p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #2E3440;">
            Once you're in, you can:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="text-align: left;">
            ${features.map(feature => `
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #4C566A;">• ${feature}</td>
              </tr>
            `).join('')}
          </table>
        </td>
      </tr>
    `
    : ''
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ECEFF4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${body.substring(0, 100)}
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ECEFF4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #FEFEFE; border-radius: 16px; box-shadow: 0 4px 24px rgba(46, 52, 64, 0.08);">
          
          <tr>
            <td style="height: 6px; background-color: #88C0D0; border-radius: 16px 16px 0 0;"></td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 40px 40px 32px 40px;">
              <img 
                src="${logoUrl}" 
                alt="Second Turn Games" 
                width="180" 
                style="display: block; max-width: 180px; height: auto;"
              />
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #2E3440; line-height: 1.3;">
                ${heading}
              </h1>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4C566A;">
                ${body}
              </p>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #88C0D0; border-radius: 10px;">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #2E3440; text-decoration: none; letter-spacing: 0.3px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 13px; color: #4C566A;">
                This link expires in 1 hour
              </p>
            </td>
          </tr>
          
          ${featuresHtml}
          
          <tr>
            <td style="background-color: #ECEFF4; border-radius: 0 0 16px 16px; padding: 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #4C566A;">
                      ${footerNote}
                    </p>
                    ${footerSecurity ? `
                    <p style="margin: 0; font-size: 13px; color: #4C566A;">
                      ${footerSecurity}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #4C566A;">
                Second Turn Games SIA · Riga, Latvia
              </p>
              <p style="margin: 0; font-size: 12px; color: #4C566A;">
                ${tagline}
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim()
}
```

### 5.5 Deno Configuration

**`supabase/functions/send-auth-email/deno.json`**

```json
{
  "imports": {
    "resend": "npm:resend@4.0.0"
  }
}
```

---

## 6. Configuration Steps

### 6.1 Local Development Setup

1. **Update `supabase/config.toml`:**

```toml
[auth.hook.send_email]
enabled = true
uri = "http://host.docker.internal:54321/functions/v1/send-auth-email"
secrets = "env(SEND_EMAIL_HOOK_SECRET)"
```

2. **Create `.env` file for local secrets:**

```bash
RESEND_API_KEY=re_xxxxx
SEND_EMAIL_HOOK_SECRET=test_secret_for_local_dev
```

3. **Restart Supabase:**

```bash
supabase stop
supabase start
```

Note: `supabase db reset` alone won't activate hook changes; full restart required.

### 6.2 Production Deployment

1. **Deploy the Edge Function:**

```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

2. **Set secrets:**

```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set SEND_EMAIL_HOOK_SECRET=v1,whsec_xxxxx
```

3. **Configure hook in Supabase Dashboard:**

   - Navigate to **Authentication → Hooks**
   - Click "Add new hook"
   - Select "Send Email" hook type
   - Choose HTTPS endpoint type
   - Enter URL: `https://[project-ref].supabase.co/functions/v1/send-auth-email`
   - Generate and save the webhook secret
   - Copy the generated secret (format: `v1,whsec_xxxxx`) 
   - Add this secret to your Edge Function secrets

### 6.3 Update Signup Flow

Ensure the signup action stores the user's language preference:

```typescript
// In your signup server action or API route
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      preferred_lang: locale, // 'en', 'lv', 'lt', or 'et'
    },
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  },
})
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

Test the translation lookup and template generation:

```typescript
// Test cases
- getTranslation('en', 'signup') returns correct English content
- getTranslation('lv', 'signup') returns correct Latvian content
- getTranslation('invalid', 'signup') falls back to English
- buildEmailHtml() generates valid HTML
- buildEmailHtml() includes all required elements (logo, CTA, footer)
```

### 7.2 Integration Tests

1. **Signup flow:**
   - Register new user with `preferred_lang: 'lv'`
   - Verify email is sent in Latvian
   - Verify confirmation link works

2. **Magic link flow:**
   - Request magic link for existing user
   - Verify email matches user's stored language preference
   - Verify link logs user in successfully

3. **Password reset flow:**
   - Request password reset
   - Verify email content
   - Verify reset link works

4. **Email change flow:**
   - Change email for authenticated user
   - Verify confirmation email sent
   - Verify new email is updated after confirmation

### 7.3 Email Client Testing

Test email rendering in:
- Gmail (web)
- Outlook (web and desktop)
- Apple Mail
- Mobile email apps (iOS Mail, Gmail app)

Use tools like Litmus or Email on Acid for comprehensive testing.

---

## 8. Monitoring & Debugging

### 8.1 Logging

Add structured logging to the Edge Function:

```typescript
console.log(JSON.stringify({
  event: 'auth_email_sent',
  action_type: email_data.email_action_type,
  locale: locale,
  user_id: user.id,
  timestamp: new Date().toISOString(),
}))
```

### 8.2 Resend Dashboard

Monitor delivery rates, bounces, and complaints in the Resend dashboard.

### 8.3 Error Handling

- Log Resend API errors
- Return appropriate HTTP status codes
- Consider adding alerting for repeated failures

---

## 9. Security Considerations

- **Webhook verification:** Always verify the webhook signature using standardwebhooks
- **Token exposure:** Use `token_hash` in URLs, never raw tokens
- **Rate limiting:** Supabase applies 30 emails/hour default; monitor for abuse
- **Secret management:** Never commit secrets; use Supabase secrets management

---

## 10. Future Enhancements

- Add `invite` and `reauthentication` email types
- Implement React Email for easier template development
- Add email analytics tracking (opens, clicks)
- Consider Resend webhooks for delivery monitoring
- Add retry logic for failed email sends

---

## 11. Acceptance Criteria

- [ ] Edge Function deploys successfully
- [ ] Signup confirmation emails sent in all 4 languages
- [ ] Magic link emails sent in user's preferred language
- [ ] Password reset emails sent correctly
- [ ] Email change confirmation works
- [ ] All emails match brand design specifications
- [ ] Links in emails work correctly (confirmation, login, reset)
- [ ] Fallback to English when language preference missing
- [ ] No sensitive data exposed in logs
- [ ] Works in both local development and production

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Claude (with Aigars)
