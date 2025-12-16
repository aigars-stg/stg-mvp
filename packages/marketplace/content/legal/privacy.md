---
title: "Privacy Policy"
lastUpdated: "November 25, 2025"
description: "Privacy Policy for Second Turn Games - How we collect, use, and protect your personal data in compliance with GDPR."
---

## 1. Introduction

Second Turn Games SIA ("we", "our", or "us") operates the Second Turn Games marketplace platform. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our services.

We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and other applicable data protection laws in Latvia and the European Union.

### Data Controller

| | |
|---|---|
| **Company** | Second Turn Games SIA |
| **Registration** | 50203665371 |
| **Address** | Evalda Valtera 5-35, Riga, LV-1021, Latvia |
| **Privacy Contact** | privacy@secondturn.games |

---

## 2. What Personal Data We Collect

### 2.1 Account Registration Data

When you create an account, we collect:

- **Email address** (required) - for account identification and communication
- **Password** (required) - stored as an encrypted hash, never in plain text
- **Full name** (required) - displayed on your profile
- **Country** (required) - for marketplace localization and regulatory compliance
- **Phone number** (optional) - if you choose to add it to your profile
- **Profile picture** (optional) - if you upload an avatar

**Legal Basis:** Contract performance (GDPR Article 6(1)(b)) - necessary to provide marketplace services

### 2.2 Seller Verification Data

When you register as a seller and complete Stripe Connect onboarding, additional information is collected:

- **Seller status declaration** - confirmation that you are selling as a private individual
- **Date of birth** (required) - for identity verification and DAC7 reporting
- **Primary address** (required) - for identity verification and DAC7 reporting
- **Tax Identification Number (TIN)** - collected when you approach or exceed DAC7 reporting thresholds
- **Bank account details (IBAN)** - collected by Stripe Connect for payouts
- **Identity verification documents** - collected by Stripe Connect for KYC compliance

**Legal Basis:** Legal obligation (GDPR Article 6(1)(c)) - compliance with EU DAC7 tax reporting requirements and payment services regulations

### 2.3 Listing Data

When you create a listing to sell a board game, we collect:

- **Game information** - name, version, publisher, language, condition
- **Photos** - images of the game (we strip EXIF metadata including GPS location)
- **Price and shipping options**
- **Condition notes and descriptions** - free-text fields you provide

**Legal Basis:** Contract performance (GDPR Article 6(1)(b)) - necessary to facilitate sales

### 2.4 Transaction Data

When transactions occur through our platform, we collect:

- **Transaction records** - details of purchases and sales
- **Payment information** - processed by Stripe Connect (we do not store full card details)
- **Shipping information** - parcel terminal selections processed by Unisend
- **Sale amounts** - for platform records and regulatory reporting

**Legal Basis:** Contract performance (GDPR Article 6(1)(b)) and legal obligation (GDPR Article 6(1)(c))

### 2.5 Messaging Data

When you communicate with other users through our messaging system:

- **Message content** - all messages you send and receive
- **Conversation metadata** - participants, related listing, timestamps
- **Read status** - whether messages have been read

> **Important Privacy Notice:** Do not share sensitive personal information in messages until you're ready to complete a transaction. We cannot control what happens to information you voluntarily share with other users.

**Legal Basis:** Contract performance (GDPR Article 6(1)(b)) - necessary to facilitate buyer-seller communication

### 2.6 Security & Login Activity Data

For security and fraud prevention, we automatically collect:

- **IP address** - your internet connection's IP address
- **Device information** - browser type, operating system, device type
- **Geolocation** - country and city derived from your IP address
- **Login timestamps** - when you sign in to your account

This data is retained for 30 days and then automatically deleted.

**Legal Basis:** Legitimate interest (GDPR Article 6(1)(f)) - protecting our users and platform from fraud and security threats

### 2.7 Technical Data

We may collect:

- **Cookies** - see Section 6 below for detailed cookie information
- **Local storage data** - saved searches, listing drafts (stored only on your device)
- **Analytics data** - only with your consent (page views, session duration, device type)

---

## 3. How We Use Your Personal Data

We use your personal data to:

- Create and manage your account
- Display your listings to potential buyers
- Facilitate communication between buyers and sellers
- Facilitate payments through Stripe Connect
- Facilitate shipping through Unisend SIA
- Process and display your wanted game requests (ISO listings)
- Send transactional emails (verification, password reset, order notifications)
- Detect and prevent fraud, abuse, and security threats
- Comply with legal obligations, including DAC7 tax reporting requirements
- Improve our platform (with your consent for analytics)

**We never sell your personal data to third parties. We never use your data for marketing without your explicit consent.**

---

## 4. Third-Party Services (Data Processors)

We use trusted third-party services to operate our platform. These services process your data on our behalf under Data Processing Agreements (DPAs) that ensure GDPR compliance.

### Stripe Connect (Payment Processing)

| | |
|---|---|
| **Purpose** | Payment processing, seller payouts, identity verification (KYC) |
| **Data Location** | EU and US (with appropriate safeguards) |
| **Data Shared** | Name, email, address, date of birth, bank account details, identity documents, transaction data |
| **Privacy Policy** | [stripe.com/privacy](https://stripe.com/privacy) |

*Note: Stripe is a licensed payment services provider under EU PSD2 regulations. They process payments and verify seller identities independently. They are a separate data controller for their own compliance purposes.*

### Unisend SIA (Shipping & Logistics)

| | |
|---|---|
| **Purpose** | Parcel delivery between Baltic parcel terminals |
| **Data Location** | EU (Latvia, Lithuania, Estonia) |
| **Data Shared** | Sender name, recipient name, phone numbers, selected parcel terminals, package dimensions |
| **Privacy Policy** | [unisend.com/privacy](https://unisend.com/privacy) |

### Supabase (Database, Authentication, Storage)

| | |
|---|---|
| **Purpose** | Backend infrastructure - stores your account data, listings, messages, and photos |
| **Data Location** | EU (Stockholm, Sweden) |
| **Data Shared** | All data you provide (account info, listings, messages, photos) |
| **Privacy Policy** | [supabase.com/privacy](https://supabase.com/privacy) |

### Vercel (Hosting & Analytics)

| | |
|---|---|
| **Purpose** | Website hosting, performance monitoring, analytics (with your consent) |
| **Data Shared** | Server logs (IP addresses, page URLs), performance metrics, analytics (if consented) |
| **Privacy Policy** | [vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy) |

### Cloudflare Turnstile (Bot Protection)

| | |
|---|---|
| **Purpose** | Prevent bots and automated abuse during account creation |
| **Data Shared** | IP address, browser fingerprint, challenge responses |
| **Privacy Policy** | [cloudflare.com/privacypolicy](https://cloudflare.com/privacypolicy) |

### Upstash Redis (Rate Limiting)

| | |
|---|---|
| **Purpose** | Prevent abuse by limiting request rates (anti-spam, DDoS protection) |
| **Data Location** | EU |
| **Data Shared** | Email addresses, IP addresses, user IDs (auto-expires in 15 minutes to 1 hour) |
| **Privacy Policy** | [upstash.com/privacy](https://upstash.com/privacy) |

### BoardGameGeek (Game Data)

| | |
|---|---|
| **Purpose** | Fetch board game information (names, images, versions) |
| **Data Shared** | No personal data - only game IDs you search for |
| **Privacy Policy** | [boardgamegeek.com/privacy](https://boardgamegeek.com/privacy) |

---

## 5. Tax Authority Data Sharing (DAC7)

Under EU Council Directive 2021/514 (DAC7), we are legally required to report certain seller information to tax authorities.

### 5.1 Reporting Thresholds

This applies to sellers who exceed either threshold in a calendar year:

- **30 or more** completed sales, OR
- **€2,000 or more** in total sales proceeds

### 5.2 Data Reported

If thresholds are exceeded, we report to the Latvia State Revenue Service (VID):

- Full legal name
- Primary address
- Date of birth
- Tax Identification Number (TIN)
- Bank account identifier (IBAN)
- Total sales proceeds per quarter
- Number of transactions per quarter

This information is automatically exchanged with tax authorities in your country of residence via EU information sharing mechanisms.

### 5.3 Legal Basis

Legal obligation (GDPR Article 6(1)(c)) - compliance with EU tax transparency requirements. We cannot refuse to report this data or delete it upon request.

---

## 6. Cookies & Tracking

### 6.1 Essential Cookies (No Consent Required)

| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| `sb-*-auth-token` | Authentication - keeps you signed in | Session / 60 days |

These cookies are strictly necessary for the platform to function. They cannot be disabled.

### 6.2 Analytics Cookies (Requires Consent)

With your consent, we use Vercel Analytics to understand:

- Which pages are most visited
- How users navigate the site
- Performance metrics (page load times)
- Device and browser statistics

Vercel's analytics are privacy-friendly - they don't track you across websites or create detailed profiles.

You can manage cookie preferences via the consent banner or in account settings.

### 6.3 Local Storage

We use browser local storage for:

- **Saved searches** - your search history (stored only on your device)
- **Listing drafts** - auto-saves forms as you type (stored only on your device)
- **Cookie preferences** - remembers your choices
- **UI preferences** - remembers dismissed hints/tutorials

Local storage data never leaves your device.

---

## 7. How Long We Keep Your Data

| Data Type | Retention Period |
|-----------|------------------|
| Account Data | Until you delete your account, plus 90 days |
| Listings | Until you delete them or delete your account |
| Messages | Until either party deletes the conversation or account |
| Transaction Records | **7 years** (legal requirement for tax/accounting records) |
| DAC7 Reported Data | **7 years** from reporting date |
| Login Activity (IP, device) | 30 days |
| Rate Limiting Data | 15 minutes to 1 hour |

---

## 8. Your Rights Under GDPR

### ✓ Right to Access (Article 15)
View your profile data, listings, and login activity in account settings.

### ✓ Right to Data Portability (Article 20)
Download all your data in JSON format (machine-readable).

### ✓ Right to Rectification (Article 16)
Edit your profile information and listings at any time.

### ✓ Right to Erasure (Article 17)
Delete your account with a 14-day recovery period, then permanent deletion after 90 days.

> **Note:** The right to erasure does not apply to data we are legally required to retain, such as transaction records for tax purposes or DAC7 reported data.

### ✓ Right to Object (Article 21)
Object to processing based on legitimate interest (e.g., analytics). Use cookie settings to opt out.

### ✓ Right to Lodge a Complaint
File a complaint with the Latvian Data State Inspectorate (DVI) at [dvi.gov.lv](https://www.dvi.gov.lv).

**To exercise your rights, contact privacy@secondturn.games. We will respond within 30 days.**

---

## 9. Data Security

We protect your data with:

- **Encryption in transit:** All connections use HTTPS/TLS encryption
- **Encryption at rest:** Database and file storage are encrypted (AES-256)
- **Password hashing:** Passwords are hashed with bcrypt (never stored in plain text)
- **Access control:** Row-Level Security ensures users can only access their own data
- **HTTP-Only cookies:** Authentication cookies cannot be accessed by JavaScript
- **Rate limiting:** Prevents brute-force attacks and abuse
- **Security monitoring:** Login activity tracking detects suspicious behavior

While we implement industry-standard security measures, no system is 100% secure. Please use a strong, unique password.

---

## 10. International Data Transfers

Your data is primarily stored in the European Union (Stockholm, Sweden). Some service providers (Vercel, Cloudflare, Stripe) are US-based companies but have certified compliance with EU-US data transfer frameworks.

We ensure any data transferred outside the EU is protected by appropriate safeguards (Standard Contractual Clauses, adequacy decisions, or DPAs).

---

## 11. Children's Privacy

Our platform is not intended for children under 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact privacy@secondturn.games and we will delete it.

---

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Significant changes will be notified via email or platform notice. The "Last updated" date shows when this policy was last revised.

---

## 13. Contact Us

| | |
|---|---|
| **Privacy inquiries** | privacy@secondturn.games |
| **General support** | info@secondturn.games |
| **Address** | Second Turn Games SIA, Evalda Valtera 5-35, Riga, LV-1021, Latvia |
