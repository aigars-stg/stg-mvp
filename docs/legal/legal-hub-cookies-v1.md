# Cookie Policy

**Document**: Cookie Policy (for `/legal?section=cookies`)
**Status**: Draft v1
**Last Updated**: January 2026

---

## 1. Introduction

This Cookie Policy explains how Second Turn Games SIA ("we", "our", or "us") uses cookies and similar technologies on our platform.

┌─────────────────────────────────────────────────────────────────┐
│ 📋 **In plain terms**                                           │
│                                                                 │
│ We use a small number of cookies to make the site work and      │
│ remember your preferences. We ask before setting any cookies    │
│ that track how you use the site.                                │
└─────────────────────────────────────────────────────────────────┘

---

## 2. What Are Cookies?

Cookies are small text files stored on your device when you visit a website. They help websites remember information about your visit, like your language preference or login status.

**Similar technologies we use:**
- **Local storage** — Stores data in your browser (like saved searches or listing drafts)
- **Session storage** — Temporary data cleared when you close your browser

---

## 3. Cookies We Use

### 3.1 Essential Cookies (Required)

These cookies are necessary for the platform to function. You cannot opt out of these.

| Cookie | Purpose | Duration |
|--------|---------|----------|
| `sb-access-token` | Keeps you signed in (Supabase authentication) | Session |
| `sb-refresh-token` | Refreshes your sign-in session | 7 days |
| `locale` | Remembers your language preference (EN/LV/LT/ET) | 1 year |
| `cookie-consent` | Remembers your cookie preferences | 1 year |
| `cf_clearance` | Cloudflare bot protection verification | Session |

### 3.2 Functional Cookies (Required)

These improve your experience but don't track you across websites.

| Cookie | Purpose | Duration |
|--------|---------|----------|
| `recent-searches` | Remembers your recent game searches | Local storage |
| `listing-draft` | Saves unfinished listing drafts | Local storage |
| `terminal-preference` | Remembers your preferred parcel terminal | Local storage |

### 3.3 Analytics Cookies (Your Choice)

These help us understand how people use the site so we can improve it. **We only set these if you consent.**

| Cookie | Purpose | Provider | Duration |
|--------|---------|----------|----------|
| `va_*` | Page views, session duration, device type | Vercel Analytics | 1 year |

**What analytics cookies collect:**
- Pages you visit
- How long you spend on pages
- What device/browser you use
- Which country you're browsing from

**What they DON'T collect:**
- Your name or email
- What you buy or sell
- Your messages or listing content
- Anything that personally identifies you

---

## 4. Third-Party Cookies

Some features involve third-party services that may set their own cookies:

| Service | Purpose | Their Cookie Policy |
|---------|---------|---------------------|
| **Stripe** | Payment processing (when you checkout) | [stripe.com/cookies-policy](https://stripe.com/cookies-policy) |
| **Cloudflare** | Security and bot protection | [cloudflare.com/cookie-policy](https://cloudflare.com/cookie-policy) |

We don't control these cookies. Check each provider's policy for details.

---

## 5. Your Choices

### 5.1 Cookie Consent Banner

When you first visit, we ask whether you accept analytics cookies. Your choice is saved and you won't be asked again unless you clear your cookies.

### 5.2 Changing Your Preferences

You can change your cookie preferences anytime:

1. Click the **cookie icon** in the footer
2. Or go to **Settings → Privacy → Cookie Preferences**

### 5.3 Browser Settings

You can also control cookies through your browser:

| Browser | How to Manage Cookies |
|---------|----------------------|
| Chrome | Settings → Privacy and Security → Cookies |
| Firefox | Settings → Privacy & Security → Cookies |
| Safari | Preferences → Privacy → Manage Website Data |
| Edge | Settings → Privacy → Cookies |

**Note:** Blocking essential cookies will prevent you from signing in or using core features.

### 5.4 Do Not Track

We respect the "Do Not Track" browser setting. If enabled, we won't set analytics cookies even if you previously consented.

---

## 6. Cookie Retention

| Type | How Long |
|------|----------|
| Session cookies | Deleted when you close your browser |
| Authentication | 7 days (then you'll need to sign in again) |
| Preferences | 1 year |
| Analytics consent | 1 year |

---

## 7. Updates to This Policy

We may update this Cookie Policy when we add new features or change providers. Check the "Last Updated" date at the top.

Significant changes will be announced via the cookie consent banner.

---

## 8. Contact Us

Questions about our cookie practices?

| | |
|---|---|
| **Privacy inquiries** | privacy@secondturn.games |
| **General support** | info@secondturn.games |
| **Address** | Second Turn Games SIA, Evalda Valtera 5-35, Riga, LV-1021, Latvia |

---

## Quick Summary

| Type | Required? | Can You Opt Out? |
|------|-----------|------------------|
| **Essential** (sign-in, security) | Yes | No |
| **Functional** (preferences, drafts) | Yes | No |
| **Analytics** (usage statistics) | No | Yes — we ask first |
| **Third-party** (Stripe, Cloudflare) | Only when you use those features | Check their policies |

---

# Implementation Notes

## Cookie Consent Implementation

The cookie banner should:
1. Appear on first visit
2. Allow "Accept All" or "Essential Only" 
3. Link to this Cookie Policy
4. Save preference in `cookie-consent` cookie
5. Not set analytics cookies until consent is given

## Vercel Analytics

If using Vercel Analytics:
- Only initialize after consent
- Respect Do Not Track header
- No personally identifiable information collected

## GDPR Compliance

- Essential cookies: No consent required (GDPR Recital 30)
- Analytics cookies: Explicit opt-in required
- Clear explanation of each cookie's purpose
- Easy way to withdraw consent

## Cross-References

- Privacy Policy → `/legal?section=privacy`
- For full data practices, see Privacy Policy Section 6

## Translation Notes

Cookie names should remain in English (technical terms). Descriptions should be translated.

Key terms:
- "Essential cookies" / "Functional cookies" / "Analytics cookies"
- "Session" duration
- "Local storage"
