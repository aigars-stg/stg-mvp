# PRD: Newsletter Subscription Feature

**Project:** Second Turn Games  
**Feature:** Newsletter subscription with footer signup and account settings management  
**Priority:** Pre-launch  
**Estimated Effort:** 1-2 days

---

## Overview

Add newsletter subscription capability to collect emails for feature announcements, community updates, and occasional marketplace highlights. The implementation should be minimal-friction (email only) with easy unsubscription via account settings.

### Goals

1. Capture email subscribers from footer across all pages
2. Allow authenticated users to manage subscription in account settings
3. Send branded welcome email on subscription
4. Support one-click unsubscribe from emails
5. Maintain brand voice across all touchpoints

### Non-Goals

- Double opt-in confirmation (single opt-in is sufficient for our use case)
- Preference centers or topic selection
- Integration with external email marketing platforms (Resend handles sending)
- Newsletter composition/sending interface (will be handled separately)

---

## User Stories

### US-1: Visitor subscribes via footer
**As a** visitor browsing the marketplace  
**I want to** enter my email in the footer  
**So that** I can stay updated on new features and community news

**Acceptance Criteria:**
- Email input field with "Join" button in footer
- Loading state while submitting
- Success message: "You're in. Welcome to the community."
- Error handling with user-friendly messages
- Duplicate emails handled gracefully (no error shown, silently succeeds)
- Works for both authenticated and anonymous users

### US-2: User manages subscription in settings
**As a** registered user  
**I want to** toggle newsletter subscription in my account settings  
**So that** I can subscribe or unsubscribe without leaving the site

**Acceptance Criteria:**
- Toggle switch in account settings under notifications section
- Shows current subscription status on load
- Immediate feedback on toggle change
- Links to user's email if they subscribed anonymously before registering

### US-3: Subscriber receives welcome email
**As a** new subscriber  
**I want to** receive a confirmation email  
**So that** I know my subscription was successful

**Acceptance Criteria:**
- Email sent immediately after subscription
- Subject line localized to user's locale
- Nordic minimalist design matching brand
- Includes unsubscribe link
- Works in all 4 locales (EN, LV, LT, ET)

### US-4: Subscriber unsubscribes via email link
**As a** subscriber  
**I want to** click an unsubscribe link in any newsletter email  
**So that** I can opt out without logging in

**Acceptance Criteria:**
- One-click unsubscribe (no confirmation page required)
- Redirects to confirmation page with appropriate message
- Works without authentication (token-based)
- Handles already-unsubscribed state gracefully

---

## Technical Specification

### Database Schema

Create `newsletter_subscribers` table in Supabase:

```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,  -- Soft delete
  source TEXT DEFAULT 'footer',  -- 'footer', 'registration', 'settings'
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'lv', 'lt', 'et')),
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_user_id ON newsletter_subscribers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_newsletter_active ON newsletter_subscribers(subscribed_at) WHERE unsubscribed_at IS NULL;
CREATE INDEX idx_newsletter_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);
```

### RLS Policies

```sql
-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
  ON newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

### API Routes

#### POST `/api/newsletter/subscribe`

**Request:**
```json
{
  "email": "user@example.com",
  "locale": "en",
  "source": "footer"
}
```

**Response (success):**
```json
{ "success": true }
```

**Logic:**
1. Validate email format
2. Normalize email (lowercase, trim)
3. Check for existing subscription
   - If exists and unsubscribed: re-subscribe (clear `unsubscribed_at`)
   - If exists and active: return success (don't reveal status)
4. Link to `user_id` if authenticated
5. Insert new record
6. Send welcome email via Resend
7. Return success

#### POST `/api/newsletter/unsubscribe`

**Auth:** Required

**Response:**
```json
{ "success": true, "alreadyUnsubscribed": false }
```

**Logic:**
1. Get authenticated user
2. Find subscription by `user_id` or email
3. Set `unsubscribed_at` to now
4. Return success

#### GET `/api/newsletter/unsubscribe?token={uuid}`

**Auth:** None (token-based)

**Logic:**
1. Find subscription by `unsubscribe_token`
2. Set `unsubscribed_at` to now
3. Redirect to `/[locale]/unsubscribed?status=success`

### Components

#### `NewsletterSignup` (Client Component)

Location: `src/components/newsletter-signup.tsx`

```tsx
// Props: none (uses locale from next-intl)
// State: email, status ('idle' | 'loading' | 'success' | 'error'), errorMessage
// On success: show checkmark + success message, clear input
```

#### `NewsletterSettings` (Client Component)

Location: `src/components/newsletter-settings.tsx`

```tsx
// Props: none
// State: isSubscribed, isLoading, isSaving, error
// On mount: fetch current subscription status
// Toggle: subscribe or unsubscribe via API
```

### Email Template

Location: `src/emails/newsletter-welcome.tsx`

Use `@react-email/components` with Resend. Match the existing email template patterns.

**Content structure:**
1. Logo
2. Heading: "Welcome to the community"
3. Body: Brief welcome message (2 short paragraphs)
4. CTA button: "Browse the marketplace"
5. Footer: Unsubscribe link

### Pages

#### `/[locale]/unsubscribed`

Simple confirmation page with status-based messaging:
- `success`: "You've unsubscribed"
- `already_unsubscribed`: "Already unsubscribed"  
- `error`: "Something went wrong"

---

## Translations

Add to `messages/[locale].json` under `Newsletter` namespace:

| Key | EN | Purpose |
|-----|-----|---------|
| `description` | "New features, community updates, and the occasional good find. No spam." | Footer helper text |
| `placeholder` | "Your email" | Input placeholder |
| `subscribe` | "Join" | Button text |
| `success` | "You're in. Welcome to the community." | Success message |
| `error` | "Something went wrong. Try again?" | Generic error |
| `settingsTitle` | "Newsletter" | Settings section title |
| `settingsDescription` | "Hear about new features and community updates" | Settings helper text |

Full translations needed for: EN, LV, LT, ET

Refer to `/mnt/project/STG-Brand-Voice-Guide.md` for tone. Key points:
- Use contractions (you're, we'll)
- Sentence case for buttons
- No exclamation marks in UI
- Friendly but not pushy

---

## Integration Points

### Footer

Add `<NewsletterSignup />` to the footer component, positioned in the brand/about column.

### Account Settings

Add `<NewsletterSettings />` to the notifications section of account settings page.

### User Registration (Optional Enhancement)

Consider calling `link_newsletter_to_user(user_id, email)` after registration to link any pre-existing anonymous subscription to the new account.

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── newsletter/
│   │       ├── subscribe/route.ts
│   │       └── unsubscribe/route.ts
│   └── [locale]/
│       └── unsubscribed/
│           └── page.tsx
├── components/
│   ├── newsletter-signup.tsx
│   └── newsletter-settings.tsx
├── emails/
│   └── newsletter-welcome.tsx
└── lib/
    └── newsletter.ts  # Shared utilities (validation, types)
```

---

## Testing Checklist

- [ ] Subscribe with valid email from footer (anonymous)
- [ ] Subscribe with valid email from footer (authenticated)
- [ ] Subscribe with invalid email shows error
- [ ] Duplicate subscription succeeds silently
- [ ] Re-subscribe after unsubscribing works
- [ ] Welcome email received with correct locale
- [ ] Settings toggle shows current status on load
- [ ] Settings toggle subscribes/unsubscribes correctly
- [ ] Email unsubscribe link works without login
- [ ] Unsubscribe confirmation page shows correct status
- [ ] All 4 locales display correctly

---

## Success Metrics

- Subscription conversion rate from footer views
- Unsubscribe rate
- Email open rates (tracked via Resend)

---

## Open Questions

None - ready for implementation.
