# STG-PRD-Flow1-Signup-First-Login-v1.0

**Document:** PRD — Flow 1: User Signup & First Login
**Version:** 1.0
**Date:** 2026-03-04
**Author:** Aigars / Claude (architecture analysis)
**Status:** Draft for review

---

## 1. Context & Goals

This PRD covers the user signup and first-login experience for Second Turn Games. It consolidates findings from a codebase audit into actionable implementation tasks grouped by priority.

**Goals:**
- Clean up dead/orphaned code from the signup flow
- Fix email rendering issues across all templates
- Add missing emails (welcome, payout completed, DAC7 approaching, auction won, review reminder)
- Remove the `'OTHER'` country option entirely (only LV, LT, EE supported)
- Move wallet creation from signup to seller onboarding
- Link newsletter subscribers to user accounts on signup
- Show `CountryPrompt` on homepage for immediate post-signup visibility

**Out of scope:** Seller onboarding flow (Flow 2), listing creation (Flow 3), checkout (Flow 4). Those are separate PRDs.

---

## 2. Current State Summary

### 2.1 Auth Methods
- Email magic link (passwordless)
- Google OAuth
- Facebook OAuth
- (GitHub is in the TypeScript type but has no UI button — leave as-is)

### 2.2 Signup Trigger Chain
```
auth.users INSERT
  → handle_new_user()     → user_profiles (id, full_name, email, preferred_locale)
  → create_wallet_for_user() → wallets (user_id, balance_cents: 0)  ← REMOVE
```

### 2.3 Post-Signup UI
- Homepage: no special state for new users
- `/browse`: `CountryPrompt` banner (LV/EE/LT flags) if country not set
- `/cart`: same `CountryPrompt` banner
- User menu: "My Orders", "Saved & Wanted", "Start Selling", "Account Settings"

### 2.4 Existing Emails Sent During Signup
- Signup confirmation (branded, en/lv only via `send-auth-email` Edge Function)
- Magic link (for returning users)
- Password recovery and email change translations exist but recovery has no UI trigger

### 2.5 Current Data
- 3 users (all LV, all sellers)
- 3 newsletter subscribers (0 linked to user accounts)
- 3 wallets (all from auto-creation trigger)

---

## 3. Changes

### 3.1 Remove Dead / Orphaned Code

#### 3.1.1 OnboardingProvider (dead — avatar nudge banner with no consumer)

**Delete files:**
- `components/onboarding/OnboardingProvider.tsx` (80 lines)

**Modify files:**
- `components/onboarding/index.ts` — remove `OnboardingProvider` and `useOnboarding` exports
- `app/[locale]/providers.tsx` — remove `OnboardingProvider` import and wrapper (lines 6, 39, 42)

**Keep:** `CountryPrompt` component and its export from `components/onboarding/index.ts` — this is actively used.

#### 3.1.2 ProfileCompletionCard (orphaned — never imported anywhere)

**Delete files:**
- `components/account/ProfileCompletionCard.tsx` (248 lines)

**Port to CountryPrompt:** The geo-detection pattern from this component (calling `/api/geo/detect` on mount to auto-detect country from Vercel/Cloudflare IP headers) is valuable and should be integrated into the `CountryPrompt` component. See Section 3.5 for the full UX spec.

#### 3.1.3 Login Alert Email (built, never triggered)

**Delete files:**
- `lib/email/templates/login-alert.tsx`

**Modify files:**
- `lib/email/send-account-emails.ts` — remove `sendLoginAlertEmail` function and `LoginAlertEmail` import

**Rationale:** For a passwordless auth system with magic links and OAuth, unusual login detection adds minimal security value — the authentication itself is the verification. A bad actor would need access to the user's email inbox or OAuth account, at which point a login alert email to that same inbox is circular. If we want login alerts in the future, we can rebuild with push notifications or in-app alerts rather than email.

#### 3.1.4 Password Recovery Email Translation (dead — no passwords, no UI trigger)

**Modify files:**
- `supabase/functions/send-auth-email/translations.ts` — remove `recovery` entries from both `en` and `lv` translation objects

**Keep:** The `send-auth-email` Edge Function still handles `email_change` which is valid. The `supportedTypes` array (line 90) should be updated:
```typescript
// Before
const supportedTypes = ['signup', 'magiclink', 'recovery', 'email_change']
// After
const supportedTypes = ['signup', 'magiclink', 'email_change']
```

#### 3.1.5 Unused Database Columns on `user_profiles`

**Migration: drop columns**
```sql
ALTER TABLE user_profiles DROP COLUMN IF EXISTS profile_banner_dismissed_until;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS onboarding_email_step;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_onboarding_email_at;
```

**Modify files:**
- `lib/auth/AuthContext.tsx` (line 82) — remove `profile_banner_dismissed_until`, `onboarding_email_step`, `last_onboarding_email_at` from the `.select()` query
- `lib/auth/types.ts` — remove corresponding fields from `UserProfile` interface (lines 40-42)

**Note:** `auth_providers` column stays — it's actively used by the `check-email` API for fast provider lookup.

---

### 3.2 Remove `'OTHER'` Country Option

The `'OTHER'` country code was introduced to handle non-Baltic users. With Claim-only listings (all requiring Unisend T2T shipping within the Baltics), there's no use case for `'OTHER'` sellers. Buyers from other countries are not supported at checkout either (no terminal selection outside LV/LT/EE).

#### 3.2.1 Type and Constants

**Modify file:** `lib/country-utils.ts`
```typescript
// Before
export type CountryCode = 'LV' | 'EE' | 'LT' | 'OTHER';

export const COUNTRIES: Country[] = [
  { code: 'LV', name: 'Latvia', flagClass: 'fi fi-lv' },
  { code: 'EE', name: 'Estonia', flagClass: 'fi fi-ee' },
  { code: 'LT', name: 'Lithuania', flagClass: 'fi fi-lt' },
  { code: 'OTHER', name: 'Other', flagClass: 'fi fi-un' },
];

// After
export type CountryCode = 'LV' | 'EE' | 'LT';

export const COUNTRIES: Country[] = [
  { code: 'LV', name: 'Latvia', flagClass: 'fi fi-lv' },
  { code: 'EE', name: 'Estonia', flagClass: 'fi fi-ee' },
  { code: 'LT', name: 'Lithuania', flagClass: 'fi fi-lt' },
];
```

#### 3.2.2 CountrySelector (account settings)

**Modify file:** `components/auth/CountrySelector.tsx`
This component renders from the `COUNTRIES` array, so the type change propagates automatically. However, verify that the account settings page doesn't hardcode `'OTHER'` anywhere else.

#### 3.2.3 CountryPrompt

`components/onboarding/CountryPrompt.tsx` already only shows LV/EE/LT (line 14-18) — the `'OTHER'` removal doesn't affect it. However, the component is being enhanced with geo-detection (see Section 3.5), which will change its internal logic significantly.

#### 3.2.4 Geo-Detection API

**Modify file:** `app/api/geo/detect/route.ts`
Remove the `&& detectedCode !== 'OTHER'` check (line 31) — it's now redundant since `isValidCountryCode` will only accept LV/EE/LT.

#### 3.2.5 Database Constraint

**Migration:**
```sql
-- No existing users have 'OTHER', so this is safe
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_country_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_country_check
  CHECK (country IS NULL OR country IN ('LV', 'EE', 'LT'));
```

#### 3.2.6 Translation Keys

**Check and update** `messages/en.json` and `messages/lv.json` — remove any `Countries.OTHER` translation key if present.

---

### 3.3 Move Wallet Creation to Seller Onboarding

Currently, every user gets a wallet at signup via the `create_wallet_for_user` trigger on `auth.users`. Wallets are only useful for sellers (receiving sale credits) and for buyers who have previously been sellers (spending wallet balance). A pure buyer who has never sold has no way to fund a wallet, so the wallet creation is wasted.

#### 3.3.1 Remove Auto-Creation Trigger

**Migration:**
```sql
DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
-- Keep the function for potential manual use, just detach the trigger
```

#### 3.3.2 Create Wallet on Seller Onboarding

**Modify file:** `app/api/seller/onboarding/accept-terms/route.ts` (or wherever `seller_profiles` is created)

After creating the `seller_profiles` row, create a wallet:
```typescript
// After seller_profiles upsert succeeds:
await supabase.from('wallets')
  .upsert({ user_id: user.id, balance_cents: 0 }, { onConflict: 'user_id' });
```

The `ON CONFLICT DO NOTHING` pattern already exists throughout the codebase (checkout, `credit_seller_wallet` RPC), so if a wallet somehow already exists, this is safe.

#### 3.3.3 Checkout Wallet Logic — Guard for Missing Wallet

**Modify file:** `lib/services/checkout.ts` and `app/[locale]/checkout/page.tsx`

The checkout page currently fetches wallet balance and shows a "Use wallet balance" toggle. For pure buyers without a wallet, this should gracefully show zero or hide the toggle entirely.

Check: `GET /api/wallet/balance` route — if it returns 0 or null for users without wallets, the UI should handle that case (likely already does via the `ON CONFLICT DO NOTHING` fallback, but verify).

**Acceptance criteria:**
- New user who has never become a seller sees no wallet-related UI at checkout
- Existing users who are also sellers continue to see wallet balance normally
- No breaking changes to checkout flow

---

### 3.4 Link Newsletter Subscribers on Signup

The `link_newsletter_to_user` RPC exists in the database but is never called. When a user signs up with an email that matches an existing newsletter subscriber, the subscriber row should be linked.

#### 3.4.1 Call from `handle_new_user` Trigger

**Migration:** Update the `handle_new_user()` function to also call `link_newsletter_to_user`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email,
    preferred_locale
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );

  -- Link existing newsletter subscription to this user
  PERFORM link_newsletter_to_user(NEW.id, NEW.email);

  RETURN NEW;
END;
$function$;
```

**Also:** Run a one-time backfill for existing users:
```sql
-- One-time backfill: link existing newsletter subscribers to existing users
UPDATE newsletter_subscribers ns
SET user_id = up.id, updated_at = NOW()
FROM user_profiles up
WHERE LOWER(TRIM(ns.email)) = LOWER(TRIM(up.email))
  AND ns.user_id IS NULL;
```

---

### 3.5 Enhance CountryPrompt with Geo-Detection & Add to Homepage

Currently `CountryPrompt` only appears on `/browse` and `/cart`, shows three equal flag buttons, and does no geo-detection. New users who sign up and land on the homepage never see it. The component should be enhanced with IP-based country detection (ported from the orphaned `ProfileCompletionCard`) and added to the homepage.

#### 3.5.1 Add to Homepage

**Modify file:** `app/[locale]/page.tsx` (or whichever file renders the homepage)

Add the same pattern used on browse/cart:
```tsx
import { CountryPrompt } from '@/components/onboarding';

// Inside the page component, after hero / before main content:
{user && !profile?.country && <CountryPrompt />}
```

**Positioning:** Below the hero section, above the main content grid. Same visual style as browse/cart — orange inline banner, no modal, no blocking.

#### 3.5.2 Add Geo-Detection to CountryPrompt

**Modify file:** `components/onboarding/CountryPrompt.tsx`

Port the geo-detection pattern from `ProfileCompletionCard` (lines 46-59). On mount, call `/api/geo/detect`. If a Baltic country is detected, render a personalized confirmation variant. If detection fails or returns a non-Baltic IP, fall back to the current three-button design.

**New state:**
```typescript
const [detectedCountry, setDetectedCountry] = useState<CountryCode | null>(null);
const [geoLoading, setGeoLoading] = useState(true);
const [showAllCountries, setShowAllCountries] = useState(false);

useEffect(() => {
  fetch('/api/geo/detect')
    .then(res => res.json())
    .then(data => {
      if (data.detected && data.country) {
        setDetectedCountry(data.country);
      }
    })
    .catch(() => {})
    .finally(() => setGeoLoading(false));
}, []);
```

#### 3.5.3 UX — Two Variants

**Variant A: Geo-detection succeeded (Baltic IP detected)**

Personalized single-button confirmation. Much lower friction — one tap instead of scanning three options.

```
┌────────────────────────────────────────────────────────┐
│ 📍  Looks like you're in Latvia                        │
│                                                        │
│  [🇱🇻 Yes, I'm in Latvia]        Not in Latvia? ↓     │
└────────────────────────────────────────────────────────┘
```

- Primary CTA: confirm button for detected country (frost-ice background, prominent)
- Secondary: "Not in {country}?" text link that expands to show the other two flag buttons inline
- Once expanded, all three buttons show (same layout as current Variant B)
- Clicking any button saves country and dismisses prompt

**Variant B: Geo-detection failed (non-Baltic IP, VPN, API error, or loading)**

Fall back to current design — three equal flag buttons:

```
┌────────────────────────────────────────────────────────┐
│ 📍  Pick your country                                  │
│                                                        │
│  [🇱🇻 Latvia]   [🇪🇪 Estonia]   [🇱🇹 Lithuania]        │
└────────────────────────────────────────────────────────┘
```

This is what users see today — no change from current behavior.

**Loading state:** While geo-detection is in progress (typically <200ms), show a brief skeleton or render Variant B immediately. Do NOT block the page — the prompt should appear instantly with either variant, and if geo comes back fast enough, swap to Variant A. If geo is slow (>500ms), just stay on Variant B.

**Implementation approach:** Render Variant B immediately on mount. If geo-detection returns a Baltic country within a short window, swap to Variant A. This avoids any flash or layout shift for slow connections.

#### 3.5.4 Copy (en, lv)

**Variant A (detected):**

| Locale | Prompt text | Confirm button | Secondary link |
|--------|-------------|----------------|----------------|
| `en` | "Looks like you're in {country}" | "Yes, I'm in {country}" | "Not in {country}?" |
| `lv` | "Izskatās, ka esi {country}" | "Jā, esmu {country}" | "Neesi {country}?" |

Where `{country}` is the localized country name (e.g., "Latvia" / "Latvijā"). Latvian uses the locative case for country names in this context.

**Variant B (fallback):**

Existing `CountryPrompt.pickCountry` translation key — no change needed.

#### 3.5.5 Translation Keys

Add to `CountryPrompt` namespace in `messages/*.json`:

```json
{
  "CountryPrompt": {
    "pickCountry": "Pick your country",
    "looksLikeYoureIn": "Looks like you're in {country}",
    "yesImIn": "Yes, I'm in {country}",
    "notInCountry": "Not in {country}?"
  }
}
```

EN and LV locales only for launch. LT and ET will use English fallback.

---

### 3.6 Fix Email Template Rendering (Text Overflow)

All React Email templates (`lib/email/templates/*.tsx`) and the auth email Edge Function (`supabase/functions/send-auth-email/templates.ts`) share the same layout problem: internal elements use `margin: '24px 40px'` or `padding: '0 40px'` within a `maxWidth: 600px` container. On narrow mobile email clients, this creates horizontal overflow because the container fills the viewport but the 80px total horizontal margin pushes content wider than the visible area.

#### 3.6.1 Fix Pattern — React Email Templates

**Affected files (all in `lib/email/templates/`):**
- `order-confirmation-buyer.tsx`
- `order-placed-seller.tsx`
- `order-accepted-buyer.tsx`
- `order-cancelled-buyer.tsx`
- `shipping-label-seller.tsx`
- `package-delivered-buyer.tsx`
- `dispute-opened-seller.tsx`
- `dispute-resolved.tsx`
- `new-message.tsx`
- `newsletter-welcome.tsx`
- `account-deleted.tsx`

**Changes per template:**

1. **Container style** — add `width: '100%'` alongside `maxWidth: '600px'`, and move horizontal padding to the container:
```typescript
const container = {
  margin: '0 auto',
  padding: '40px 24px',  // was: padding: '40px 0'
  maxWidth: '600px',
  width: '100%',
};
```

2. **Remove per-element horizontal margins** — change all `margin: 'Xpx 40px'` to `margin: 'Xpx 0'`:
```typescript
// Before
const infoBox = { margin: '24px 40px', padding: '20px', ... };
const buttonContainer = { margin: '32px 40px', ... };
const footer = { margin: '32px 40px 0', ... };

// After
const infoBox = { margin: '24px 0', padding: '20px', ... };
const buttonContainer = { margin: '32px 0', ... };
const footer = { margin: '32px 0 0', ... };
```

3. **Add word-break safety** to text styles:
```typescript
const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  wordBreak: 'break-word' as const,  // ADD
};
```

#### 3.6.2 Fix Pattern — Auth Email Edge Function

**Modify file:** `supabase/functions/send-auth-email/templates.ts`

Same pattern: the raw HTML template uses `padding: 0 40px` on `<td>` elements. Change to `padding: 0 24px` and ensure the outer table has `width: 100%; max-width: 600px`.

Also add to the `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; width: 100% !important; }
  table { border-collapse: collapse; }
  td { word-break: break-word; }
</style>
```

#### 3.6.3 Fix Pattern — Outbid Email (Edge Function raw HTML)

**Modify file:** `supabase/functions/send-outbid-notification/index.ts`

The `generateOutbidEmailHtml` function (line 155) uses `max-width: 600px; margin: 0 auto; padding: 20px` on the body — this is actually correct already. Just add the viewport meta tag and `word-break: break-word` on text elements.

---

### 3.7 New Email Templates

All new emails should use React Email components (consistent with existing order emails), support en and lv locales (LT/ET users receive English fallback), and follow the fixed layout pattern from Section 3.6.

#### 3.7.1 Welcome Email

**Trigger:** After successful signup confirmation (first auth session created)

**Where to trigger:** `app/[locale]/auth/confirm/route.ts` — after successful `verifyOtp` or `exchangeCodeForSession`, check if this is the user's first login:
```typescript
// After session creation, check if this is first login
if (user) {
  const { count } = await supabase
    .from('login_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (count === 1) {
    // This is the first login — send welcome email (fire and forget)
    void sendWelcomeEmail({
      email: user.email,
      userName: user.user_metadata?.full_name || 'there',
      locale: locale,
    });
  }
}
```

**Create files:**
- `lib/email/templates/welcome.tsx` — React Email template
- Add `sendWelcomeEmail` function to `lib/email/send-account-emails.ts`

**Email content (en):**
- **Subject:** "Welcome to Second Turn Games"
- **Heading:** "Welcome to Second Turn Games"
- **Body:** Brief intro — what the marketplace is, what they can do. Tone per Brand Voice Guide: warm, welcoming, no exclamation marks in body (one in heading is the celebration exception).
- **CTA:** "Explore games" → links to `/browse`
- **Secondary:** Mention they can list games for sale (link to `/sell`)
- **Footer:** Standard STG footer with tagline

**Email content (lv):** Transcreation, not literal translation. Use informal **tu** form.

#### 3.7.2 Payout Completed Email

**Trigger:** Staff marks withdrawal as completed

**Where to trigger:** `lib/services/withdrawal.ts` → `completeWithdrawal` function — after successful status update, send email.

Alternatively, add to the staff API route that calls `completeWithdrawal`: `app/api/staff/withdrawals/[id]/complete/route.ts` (or equivalent — check actual file path).

**Create files:**
- `lib/email/templates/payout-completed.tsx`
- Add `sendPayoutCompletedEmail` function to a new `lib/email/send-seller-emails.ts`

**Email content:**
- **Subject:** "Your payout of €XX.XX has been sent"
- **Body:** Confirm amount, bank reference, IBAN (masked: `LV****1234`), estimated arrival (1-2 business days SEPA)
- **CTA:** "View your balance" → `/seller/dashboard?tab=earnings`

**Parameters:** `sellerName`, `sellerEmail`, `amountCents`, `bankReference`, `maskedIban`, `locale`

#### 3.7.3 DAC7 Threshold Approaching Email

**Trigger:** Seller reaches ~80% of DAC7 thresholds (24 transactions or €1,600 in sales)

**Where to trigger:** After each completed sale, in the `credit_seller_wallet` RPC flow. The `update_seller_dac7_metrics` trigger already fires on order completion and updates `seller_profiles.dac7_compliance_status`. After crediting the seller wallet, check if `dac7_compliance_status` has transitioned to `'approaching'` — if so, send the email. This avoids adding database webhooks and happens at the natural moment (seller just made a sale).

**Create files:**
- `lib/email/templates/dac7-approaching.tsx`
- Add `sendDac7ApproachingEmail` function to `lib/email/send-seller-emails.ts`

**Email content:**
- **Subject:** "Action needed: tax information for your selling account"
- **Body:** Explain they're approaching the EU DAC7 reporting threshold. What info is needed (tax ID, full legal name, date of birth, address). Reassure: this is standard EU regulation, their data is secure.
- **CTA:** "Complete your tax information" → `/account/settings#tax` (or dedicated DAC7 form)
- **Tone:** Straightforward, not alarming. Per Brand Voice: "clear rules make better games."

#### 3.7.4 Auction Won Email

**Trigger:** Auction ends and a winner is determined

**Where to trigger:** `supabase/functions/cron-process-auctions/index.ts` — this Edge Function already processes ended auctions. After determining the winner, send the email.

**Create files:**
- Raw HTML email generator in `supabase/functions/cron-process-auctions/index.ts` (inline, matching `send-outbid-notification` pattern — no separate React Email template needed)

**Email content:**
- **Subject:** "You won the auction for [Game Name]"
- **Body:** Congratulations, winning bid amount, deadline to complete purchase
- **CTA:** "Complete your purchase" → checkout/payment link
- **Urgency:** Include payment deadline (e.g., 24 hours to pay)

#### 3.7.5 Review Reminder Email

**Trigger:** 3 days after order delivery, if buyer hasn't left a review

**Where to trigger:** New cron route `app/api/cron/review-reminders/route.ts`

Query: find orders where `status = 'completed'` AND `delivered_at < NOW() - INTERVAL '3 days'` AND no matching `seller_reviews` row exists for this `order_id` + `buyer_id`.

**Create files:**
- `app/api/cron/review-reminders/route.ts`
- `lib/email/templates/review-reminder.tsx`
- Add `sendReviewReminderEmail` function to `lib/email/send-order-emails.ts`

**Email content:**
- **Subject:** "How was your game from [Seller Name]?"
- **Body:** Light touch — "Your [Game Name] arrived a few days ago. If you have a moment, a quick review helps the community."
- **CTA:** "Leave a review" → `/orders/[id]/review`
- **Tone:** Not pushy. One reminder only — add a `review_reminder_sent_at` column to `orders` to prevent re-sending.

**Migration:**
```sql
ALTER TABLE orders ADD COLUMN review_reminder_sent_at TIMESTAMPTZ;
```

---

### 3.8 Auth Email Localization (LT/ET) — DEFERRED

The `send-auth-email` Edge Function currently supports `en` and `lv`. Lithuanian and Estonian users receive English fallback. This is acceptable for launch — LT/ET auth email translations will be added post-launch alongside broader LT/ET content localization.

---

## 4. Database Migrations Summary

All migrations in a single file, ordered by dependency:

```sql
-- Migration: flow1_signup_cleanup
-- Description: Clean up dead columns, remove OTHER country, 
-- move wallet creation, link newsletter subscribers, add review reminder column

-- 1. Drop unused columns from user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS profile_banner_dismissed_until;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS onboarding_email_step;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_onboarding_email_at;

-- 2. Remove 'OTHER' country option
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_country_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_country_check
  CHECK (country IS NULL OR country IN ('LV', 'EE', 'LT'));

-- 3. Remove auto wallet creation on signup
DROP TRIGGER IF EXISTS trigger_create_wallet ON auth.users;
-- Function kept for potential manual use

-- 4. Update handle_new_user to link newsletter subscribers
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email,
    preferred_locale
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );

  -- Link existing newsletter subscription to this user
  PERFORM link_newsletter_to_user(NEW.id, NEW.email);

  RETURN NEW;
END;
$function$;

-- 5. One-time backfill: link existing newsletter subscribers
UPDATE newsletter_subscribers ns
SET user_id = up.id, updated_at = NOW()
FROM user_profiles up
WHERE LOWER(TRIM(ns.email)) = LOWER(TRIM(up.email))
  AND ns.user_id IS NULL;

-- 6. Add review reminder tracking column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMPTZ;

-- 7. Create wallet on seller onboarding instead of signup
-- (wallet creation logic moves to accept-terms API route)
```

---

## 5. Files Changed — Complete List

### Delete (3 files, ~530 lines)
| File | Lines | Reason |
|------|-------|--------|
| `components/onboarding/OnboardingProvider.tsx` | 80 | Dead code — no consumer |
| `components/account/ProfileCompletionCard.tsx` | 248 | Orphaned — never imported |
| `lib/email/templates/login-alert.tsx` | ~200 | Built but never triggered |

### Create (6 files)
| File | Purpose |
|------|---------|
| `lib/email/templates/welcome.tsx` | Welcome email template |
| `lib/email/templates/payout-completed.tsx` | Payout completed email template |
| `lib/email/templates/dac7-approaching.tsx` | DAC7 threshold approaching email |
| `lib/email/templates/review-reminder.tsx` | Review reminder email |
| `lib/email/send-seller-emails.ts` | Seller email sending service (payout, DAC7) |
| `app/api/cron/review-reminders/route.ts` | Cron route for review reminder emails |

### Modify (20+ files)
| File | Change |
|------|--------|
| `components/onboarding/index.ts` | Remove `OnboardingProvider`, `useOnboarding` exports |
| `app/[locale]/providers.tsx` | Remove `OnboardingProvider` wrapper |
| `lib/email/send-account-emails.ts` | Remove `sendLoginAlertEmail`; add `sendWelcomeEmail` |
| `lib/email/send-order-emails.ts` | Add `sendReviewReminderEmail` |
| `lib/country-utils.ts` | Remove `'OTHER'` from type and `COUNTRIES` array |
| `app/api/geo/detect/route.ts` | Remove `!== 'OTHER'` check |
| `lib/auth/AuthContext.tsx` | Remove dropped columns from `.select()` |
| `lib/auth/types.ts` | Remove dropped fields from `UserProfile` |
| `app/[locale]/auth/confirm/route.ts` | Add welcome email trigger on first login |
| `app/[locale]/page.tsx` | Add `CountryPrompt` to homepage |
| `components/onboarding/CountryPrompt.tsx` | Add geo-detection, two-variant rendering (Variant A: confirm detected country; Variant B: three-button fallback) |
| `app/api/seller/onboarding/accept-terms/route.ts` | Add wallet creation |
| `supabase/functions/send-auth-email/translations.ts` | Remove `recovery` translations |
| `supabase/functions/send-auth-email/index.ts` | Remove `recovery` from supported types |
| `supabase/functions/send-auth-email/templates.ts` | Fix layout (40px → 24px padding) |
| `supabase/functions/send-outbid-notification/index.ts` | Add viewport meta, word-break |
| `supabase/functions/cron-process-auctions/index.ts` | Add auction won email — inline raw HTML generator + Resend send |
| `lib/email/templates/order-confirmation-buyer.tsx` | Fix layout |
| `lib/email/templates/order-placed-seller.tsx` | Fix layout |
| `lib/email/templates/order-accepted-buyer.tsx` | Fix layout |
| `lib/email/templates/order-cancelled-buyer.tsx` | Fix layout |
| `lib/email/templates/shipping-label-seller.tsx` | Fix layout |
| `lib/email/templates/package-delivered-buyer.tsx` | Fix layout |
| `lib/email/templates/dispute-opened-seller.tsx` | Fix layout |
| `lib/email/templates/dispute-resolved.tsx` | Fix layout |
| `lib/email/templates/new-message.tsx` | Fix layout |
| `lib/email/templates/newsletter-welcome.tsx` | Fix layout |
| `lib/email/templates/account-deleted.tsx` | Fix layout |
| `lib/services/withdrawal.ts` | Add payout email trigger in `completeWithdrawal` (or staff route) |
| `lib/services/wallet.ts` | After `credit_seller_wallet` call, check DAC7 status and send approaching email if needed |
| `messages/en.json` | Add `CountryPrompt` geo-detection keys; remove `Countries.OTHER` |
| `messages/lv.json` | Add `CountryPrompt` geo-detection keys; remove `Countries.OTHER` |

---

## 6. Translation Keys

### 6.1 New Keys Required

**Namespace: `Welcome` (for welcome email — rendered server-side, not in next-intl)**
Email content is rendered via React Email, so translations live in the template file or a dedicated email translations module, not in `messages/*.json`. Follow the same pattern as existing email templates.

**Namespace: `CountryPrompt`** — new keys needed for geo-detection variant:
- `looksLikeYoureIn` — "Looks like you're in {country}"
- `yesImIn` — "Yes, I'm in {country}"
- `notInCountry` — "Not in {country}?"
EN and LV only for launch. See Section 3.5.4 for full copy table.

**Namespace: `Countries`** — remove `OTHER` key from en and lv locale files if present.

### 6.2 Auth Email Translations

Only change for launch: remove `recovery` translations from en and lv in `supabase/functions/send-auth-email/translations.ts`. LT/ET auth email localization is deferred (Section 3.8).

---

## 7. Acceptance Criteria

### Code Cleanup
- [ ] `OnboardingProvider` removed; app renders without errors
- [ ] `ProfileCompletionCard` deleted; no broken imports
- [ ] `login-alert.tsx` template deleted; `send-account-emails.ts` has no `LoginAlertEmail` reference
- [ ] `recovery` translation removed from `send-auth-email`; password reset emails are not intercepted (Supabase fallback is acceptable — they won't be triggered without UI)
- [ ] Three columns dropped from `user_profiles`; `AuthContext` select query updated; `UserProfile` type updated

### Country
- [ ] `CountryCode` type is `'LV' | 'EE' | 'LT'` (no `'OTHER'`)
- [ ] `COUNTRIES` array has 3 entries
- [ ] `CountrySelector` in account settings shows 3 countries
- [ ] `CountryPrompt` continues to show 3 countries (was already correct)
- [ ] Database constraint prevents `'OTHER'` in `user_profiles.country`
- [ ] `CountryPrompt` appears on homepage for logged-in users without country set
- [ ] `CountryPrompt` calls `/api/geo/detect` on mount
- [ ] When geo-detection returns a Baltic country, Variant A renders (personalized confirmation)
- [ ] When geo-detection fails/non-Baltic, Variant B renders (three equal flag buttons — current design)
- [ ] "Not in {country}?" link expands to show remaining two country buttons
- [ ] Prompt renders immediately (no blank/loading state blocking page content)

### Wallet
- [ ] New user signup does NOT create a wallet row
- [ ] Accepting seller terms DOES create a wallet row
- [ ] Checkout handles missing wallet gracefully (no wallet = no wallet toggle, or zero balance shown)
- [ ] Existing wallets are unaffected

### Newsletter Linking
- [ ] `handle_new_user` trigger calls `link_newsletter_to_user`
- [ ] Existing 3 newsletter subscribers are backfilled (linked to matching user accounts)
- [ ] New user signing up with an existing newsletter email gets linked automatically

### Email Rendering
- [ ] All email templates use container padding (24px) instead of per-element 40px margins
- [ ] Emails render without horizontal overflow on iPhone Mail, Gmail app, Outlook mobile
- [ ] `word-break: break-word` applied to text elements
- [ ] Auth email templates include viewport meta tag

### New Emails
- [ ] Welcome email sent on first login only (not on subsequent logins)
- [ ] Welcome email available in en and lv
- [ ] Payout completed email sent when staff completes withdrawal
- [ ] DAC7 approaching email sent when seller status transitions to `'approaching'`
- [ ] Auction won email sent when auction ends with a winner
- [ ] Review reminder sent 3 days after delivery if no review exists
- [ ] Review reminder sent at most once per order (`review_reminder_sent_at` column)

### Auth Emails
- [ ] `recovery` translations removed from `send-auth-email`
- [ ] LT/ET users receive English fallback for auth emails (acceptable for launch)

---

## 8. Implementation Order

Recommended sequencing for Claude Code:

1. **Database migration** — drop columns, add constraints, update trigger, remove wallet trigger, backfill newsletter (Section 4)
2. **Code cleanup** — delete files, update imports, remove dead code (Section 3.1)
3. **Country changes** — update types, remove OTHER (Section 3.2)
4. **Wallet move** — add creation in seller onboarding, verify checkout handles missing wallet (Section 3.3)
5. **CountryPrompt enhancement** — add to homepage, integrate geo-detection, two-variant UX, new translation keys (Section 3.5)
6. **Email layout fix** — update all existing templates (Section 3.6)
7. **New email templates** — welcome, payout, DAC7, auction won, review reminder (Section 3.7)

Steps 1-5 can be done in a single implementation pass. Steps 6-7 are independent and can be parallelized.

---

## 9. Decisions (Resolved)

1. **Welcome email timing:** Immediate — fires on first auth confirm. No delay needed.

2. **Review reminder frequency:** One reminder per order only. The `review_reminder_sent_at` column prevents re-sending.

3. **DAC7 email trigger mechanism:** Check after each completed sale when crediting the seller wallet. The `credit_seller_wallet` RPC already runs on order completion — after crediting, check `seller_profiles.dac7_compliance_status`. If it just transitioned to `'approaching'`, send the DAC7 email. This is simpler than a database webhook and happens at the natural moment (seller just made a sale).

4. **Auction won email template style:** Raw HTML in the `cron-process-auctions` Edge Function, matching the existing `send-outbid-notification` pattern.

5. **CountryPrompt dismissal:** No dismiss button. Acceptable friction — the marketplace only serves Baltic users, so country selection is functionally required. The prompt is non-blocking (inline banner, no modal) and disappears permanently once a country is selected.
