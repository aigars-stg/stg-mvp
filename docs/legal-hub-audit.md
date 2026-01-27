# Legal Hub Audit - Second Turn Games

**Generated**: 2026-01-26
**Purpose**: Extract business rules, data practices, and policy information to inform unified legal documents.

---

## Executive Summary

This audit extracts all business rules, data practices, and policy information from the Second Turn Games codebase to inform the creation of unified legal documents.

---

## 1. Existing Legal Pages

### Current Structure

| Page | Route | File |
|------|-------|------|
| Privacy Policy | `/privacy` | `app/[locale]/privacy/page.tsx` |
| Terms of Service | `/terms` | `app/[locale]/terms/page.tsx` |
| Seller Terms | `/seller/terms` | `app/[locale]/seller/terms/page.tsx` |
| Pricing | `/pricing` | `content/legal/pricing.md` |

### Content Storage Pattern
- **Format**: Markdown files with YAML frontmatter
- **Location**: `/packages/marketplace/content/legal/`
- **Rendering**: `react-markdown` with `remark-gfm` via `getLegalDocument()` function
- **i18n**: Minimal - only UI elements translated (lastUpdated, backToHome), not content itself

### Last Updated
All legal documents: **November 25, 2025**

### Missing Documents
- Buyer Protection Policy (referenced but not standalone)
- Cookie Policy (embedded in Privacy Policy, not separate)
- Acceptable Use Policy (embedded in Terms)

---

## 2. Business Rules & Policies (from code)

### Fees (VAT-Inclusive, 21% Latvia VAT)

| Fee Type | Amount | Source File |
|----------|--------|-------------|
| **Service Fee (Buyer)** | 6% + €0.50 | `lib/pricing/constants.ts:28-30` |
| **Shipping (Flat Rate)** | €2.00 | `lib/pricing/constants.ts:16` |
| **Seller Fee** | €0.00 (free) | Seller Terms Section 6.2 |
| **Minimum Payout** | €5.00 | `lib/pricing/constants.ts:40` |
| **Chargeback Fee** | ~€15 (Stripe) | Seller Terms Section 9.2 |

### Timelines

| Timeline | Duration | Source |
|----------|----------|--------|
| **Seller Response Deadline** | 24 hours | Database `paid_at + 24 hours` |
| **Shipping Window** | 2 business days | Seller Terms Section 7.2 |
| **Dispute Window (Post-Delivery)** | 2 days | `lib/pricing/constants.ts:51` |
| **Auto-Complete After Delivery** | 2 days | Cron: `complete-delivered-orders` |
| **Wanted Listing Expiration** | 30 days | `lib/hooks/useWantedListingForm.ts` |
| **Account Recovery Window** | 14 days | Terms Section 11 |
| **Account Deletion (Permanent)** | 90 days after deactivation | Privacy Policy Section 7 |
| **Transaction Record Retention** | 7 years | Privacy Policy Section 7 |
| **Login Activity Retention** | 30 days | Privacy Policy Section 7 |
| **Appeal Window** | 14 days from action | Terms Section 7.4 |
| **Appeal Response Time** | 30 days | Terms Section 7.4 |
| **Chargeback Resolution** | 60-90 days (bank) | Seller Terms Section 9.4 |
| **Payout Hold (Termination)** | 180 days | Seller Terms Section 13.3 |
| **Standard Payout Timing** | 2-7 business days | Seller Terms Section 8.2 |

### DAC7 Thresholds (EU Tax Reporting)

| Threshold | Amount | Source |
|-----------|--------|--------|
| **Transaction Count** | 30/year | `lib/types/seller.ts:248` |
| **Sales Total** | €2,000/year | `lib/types/seller.ts:249` |
| **Warning - Transactions** | 24 (80%) | `lib/types/seller.ts:250` |
| **Warning - Sales** | €1,600 (80%) | `lib/types/seller.ts:251` |
| **Approaching Trigger (Code)** | 25 transactions OR €1,800 | `lib/types/seller.ts:122-125` |

### Liability Cap
- **Maximum Platform Liability**: €100 or 12-month service fees (whichever greater)
- **Source**: Terms Section 10.2

### Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Sign In | 5 requests | 15 minutes |
| Sign Up | 3 requests | 1 hour |
| Password Reset | 3 requests | 1 hour |
| Email Resend | 1 request | 5 minutes |
| Magic Link Generate | 5 per email | 1 hour |
| Magic Link Validate | 10 per IP | 10 minutes |
| Message Create | 30 messages | 1 minute |
| New Conversation | 5 | 1 hour |
| Checkout | 5 | 1 hour |
| Listing (Buyer) | 2 | 1 day |
| Listing (Seller) | 50 | 1 day |
| Upload (Buyer) | 10 | 1 hour |
| Upload (Seller) | 100 | 1 hour |
| Review Create | 5 | 1 hour |
| Global DoS Protection | 1,000 | 1 minute |

### Geographic Restrictions
- **Supported Countries**: Latvia (LV), Lithuania (LT), Estonia (EE)
- **Primary Launch Market**: Latvia only (Unisend integration)
- **Source**: `lib/country-utils.ts`

### Age Requirements
- **Platform Use**: 16+ years
- **Selling (Stripe Connect)**: 18+ years
- **Source**: Terms Section 4.1, Seller Terms Section 2.2

---

## 3. Third-Party Integrations

### Payment: Stripe Connect
- **Type**: Express accounts for sellers
- **Purpose**: Payment processing, seller payouts, KYC/AML
- **Data Shared**: Name, email, DOB, address, bank details, ID docs, transactions
- **Data Location**: EU and US (with safeguards)
- **Files**: `lib/stripe/connect-service.ts`, `lib/stripe/transfer-service.ts`

### Shipping: Unisend SIA
- **Type**: Terminal-to-terminal parcel delivery
- **Coverage**: Latvia, Lithuania, Estonia
- **Data Shared**: Names, phone numbers, terminal selections, parcel info
- **Data Location**: EU (Baltic states)
- **Files**: `lib/unisend/client.ts`, `lib/unisend/label-service.ts`

### Email: Resend
- **Purpose**: Transactional email delivery
- **Data Shared**: Email addresses, user names, order info
- **Types**: Order confirmations, shipping, login alerts, deletion, messages

### Database/Auth: Supabase
- **Purpose**: PostgreSQL database, authentication, file storage
- **Data Location**: EU (Stockholm, Sweden)
- **Auth Methods**: Magic links (primary), OAuth (Google, GitHub, Facebook)
- **Files**: `lib/supabase/client.ts`, `lib/supabase/server.ts`

### Bot Protection: Cloudflare Turnstile
- **Purpose**: CAPTCHA for signup forms
- **Data Shared**: IP address, browser fingerprint, verification tokens
- **File**: `app/api/auth/verify-captcha/route.ts`

### Analytics: Vercel Analytics & Speed Insights
- **Purpose**: Page views, Web Vitals, performance metrics
- **Consent Required**: Yes (opt-in via cookie banner)
- **Data Shared**: Page views, device info, performance metrics
- **File**: `components/ConditionalAnalytics.tsx`

### Rate Limiting: Upstash Redis
- **Purpose**: API rate limiting, DDoS protection
- **Data Location**: EU
- **Data Shared**: Email, IP, user ID (auto-expires 15min-1hr)
- **File**: `lib/ratelimit.ts`

### Game Data: BoardGameGeek
- **Purpose**: Game metadata, images, descriptions
- **Data Shared**: None (only game IDs searched)
- **User-Agent**: `SecondTurnGames/1.0`

### Maps: MapLibre GL / Carto / Mapbox
- **Purpose**: Terminal location selection
- **Data Shared**: Location selections (no tracking)

---

## 4. Data Collection Points

### Authentication Flow
- Email address (required)
- Auth method selection (magic link or OAuth)
- OAuth providers: Google, GitHub, Facebook

### User Profile / Account Settings
- Full name (required)
- Email (required)
- Country (required)
- Phone number (optional)
- Profile picture (optional)
- Theme preference

### Seller Onboarding
- Country selection (auto-detected)
- Seller terms acceptance
- Business type selection
- Stripe Connect OAuth flow
- Identity verification (via Stripe)

### Tax Information (DAC7)
- Full legal name
- Date of birth
- Address (street, city, postal code, country)
- Tax residency country
- Tax ID (country-specific validation)

### Listing Creation
- Game selection (from BGG)
- Condition/grading
- Listing type (Instant Buy, Auction, Contact Seller)
- Price
- Description
- Photos (EXIF metadata stripped)
- Shipping method
- Language version

### Checkout / Purchase
- Buyer name and email
- Shipping address
- Delivery terminal selection
- Payment details (via Stripe)

### Messaging System
- Message content
- Conversation metadata
- Read status

### Security / Logging
- IP address
- Device/browser info
- Geolocation (from IP)
- Login timestamps
- Retention: 30 days

---

## 5. Cookie Usage

### Cookie Consent Implementation
- **Component**: `components/CookieConsent.tsx`
- **Library**: `lib/cookie-consent.ts`
- **Storage**: localStorage (not HTTP cookies)
- **States**: pending, accepted, rejected

### Essential Cookies (No Consent)
| Cookie | Purpose | Duration |
|--------|---------|----------|
| `sb-*-auth-token` | Supabase authentication | Session / 60 days |

### Analytics Cookies (Consent Required)
- Vercel Analytics (conditional load)
- Vercel Speed Insights (conditional load)

### Preference Cookies
| Cookie | Purpose | Duration |
|--------|---------|----------|
| `NEXT_PUBLIC_LOCALE` | Language preference | 1 year |

### Local Storage Keys
- `cookie-consent` - Consent status
- `cookie-preferences` - Detailed preferences JSON
- Saved searches (device-only)
- Listing drafts (device-only)
- UI preferences

---

## 6. Database Schema (Key Tables)

### user_profiles
- id, email, full_name, country, phone, avatar_url
- auth_providers, created_at, updated_at
- theme_preference, is_admin

### seller_profiles
- user_id, seller_status (not_started/onboarding/active/suspended)
- seller_terms_accepted_at, seller_terms_version
- Stripe Connect fields (account_id, charges_enabled, payouts_enabled, etc.)
- DAC7 fields (transaction_count, sales_total, tax_id, compliance_status)
- Trust metrics (total_reviews, average_rating, completed_sales)

### listings
- id, seller_id, game_id, status, listing_type
- price, condition, description, photos
- shipping_options, created_at, expires_at

### orders
- id, order_number, buyer_id, seller_id, listing_id
- status (pending_seller → confirmed → shipped → delivered → completed → paid_out)
- paid_at, seller_deadline, confirmed_at, shipped_at, delivered_at, completed_at
- tracking_number, tracking_url
- dispute_reason, dispute_resolved_at, dispute_outcome

### seller_reviews
- id, order_id, buyer_id, seller_id
- rating (1-5), review_text
- seller_response, created_at

### conversations / messages
- Encrypted messaging between users
- Related listing, participants, timestamps

### blocked_users
- blocker_id, blocked_id, reason, created_at

---

## 7. Environment Variables

### Public (Client-Accessible)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_COMING_SOON (feature flag)
```

### Secret (Server-Only)
```
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
TURNSTILE_SECRET_KEY
UNISEND_API_URL
UNISEND_USERNAME
UNISEND_PASSWORD
BGG_API_TOKEN (optional)
CRON_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 8. Existing Copy / Microcopy

### Company Information (Consistent Across Docs)
```
Company: Second Turn Games SIA
Registration: 50203665371
Address: Evalda Valtera 5-35, Riga, LV-1021, Latvia
```

### Contact Emails
| Purpose | Email |
|---------|-------|
| General | info@secondturn.games |
| Privacy | privacy@secondturn.games |
| Safety/Fraud | safety@secondturn.games |
| DSA Contact | dsa@secondturn.games |
| Appeals | appeals@secondturn.games |
| Seller Support | sellers@secondturn.games |

### Key Legal Statements

**C2C Consumer Warning** (Terms Section 3):
> "All sellers on this platform are private individuals. EU consumer protection laws do not apply to purchases from private sellers."
> - No 14-day withdrawal right
> - No 2-year legal guarantee
> - Buyer beware

**Platform Role** (Terms Section 2.1):
> "We Are a Facilitator, Not a Party to Your Transactions"

**Chargeback Liability** (Seller Terms Section 9.2):
> "As the seller, you bear the financial risk of chargebacks."

**Data Never Sold** (Privacy Section 3):
> "We never sell your personal data to third parties."

### Governing Law
- Republic of Latvia (without conflict of law principles)
- Jurisdiction: Courts of Riga, Latvia

### Compliance References
- GDPR (EU 2016/679)
- DAC7 (EU Council Directive 2021/514)
- DSA (Digital Services Act)
- EU Directive 2019/2161 (Omnibus Directive)
- PSD2 (via Stripe)
- KYC/AML (via Stripe)

---

## 9. Recommended Legal Hub Structure

Based on this audit, the unified legal hub should include:

### Primary Documents
1. **Terms of Service** - General platform rules
2. **Privacy Policy** - GDPR-compliant data practices
3. **Seller Agreement** - Seller-specific terms, DAC7 compliance
4. **Buyer Guide** - C2C disclaimers, protection tips
5. **Cookie Policy** - Detailed cookie information (currently embedded)

### Secondary Documents
6. **Pricing & Fees** - Clear fee breakdown
7. **Acceptable Use Policy** - Prohibited conduct (currently embedded)
8. **Content Policy** - Listing requirements
9. **DSA Transparency Report** - Annual moderation stats

### Missing Elements to Add
- Explicit cookie policy page
- Buyer protection/escrow explanation
- Dispute resolution process details
- Accessibility statement
- Security practices summary

---

## Files Referenced

### Legal Content
- `packages/marketplace/content/legal/privacy.md`
- `packages/marketplace/content/legal/terms.md`
- `packages/marketplace/content/legal/seller-terms.md`
- `packages/marketplace/content/legal/pricing.md`

### Business Logic
- `packages/marketplace/lib/pricing/constants.ts`
- `packages/marketplace/lib/types/seller.ts`
- `packages/marketplace/lib/ratelimit.ts`
- `packages/marketplace/lib/country-utils.ts`

### Data Collection
- `packages/marketplace/app/[locale]/auth/page.tsx`
- `packages/marketplace/app/[locale]/seller/onboard/page.tsx`
- `packages/marketplace/app/[locale]/seller/tax-info/page.tsx`
- `packages/marketplace/app/[locale]/sell/page.tsx`

### Cookies & Consent
- `packages/marketplace/lib/cookie-consent.ts`
- `packages/marketplace/components/CookieConsent.tsx`
- `packages/marketplace/components/ConditionalAnalytics.tsx`

### Security
- `packages/marketplace/lib/security/login-detector.ts`
- `packages/marketplace/lib/security/audit-logger.ts`
