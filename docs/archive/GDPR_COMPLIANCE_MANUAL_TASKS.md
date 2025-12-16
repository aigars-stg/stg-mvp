# GDPR Compliance - Manual Tasks Checklist

**Last Updated:** January 13, 2025
**Status:** CRITICAL - Must complete before public launch

---

## Overview

This document outlines the **manual tasks** required to achieve full GDPR compliance for Second Turn Games. These tasks cannot be automated and require human action.

**⚠️ LAUNCH BLOCKER:** Do not launch the platform publicly until ALL items in this checklist are completed.

---

## Task 1: Verify Data Residency (EU Region) 🌍

### Why This Matters

GDPR requires that personal data of EU users is stored within the European Union, or adequate safeguards must be in place for international transfers. For a Latvia-based company, storing data in the EU is the simplest and safest approach.

### What You Need to Do

#### 1.1 Verify Supabase Database Region

**Steps:**

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Second Turn Games**
3. Go to **Project Settings** → **General**
4. Find **"Database Region"** or **"Infrastructure"**
5. **Verify the region is one of:**
   - `eu-west-1` (Ireland) ✅ Recommended
   - `eu-central-1` (Frankfurt) ✅ Also acceptable
   - `eu-west-2` (London) ✅ Also acceptable

**If the region is NOT in the EU:**

- ⚠️ **CRITICAL:** You must migrate your database to an EU region
- Follow Supabase documentation: [Database Migration Guide](https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects)
- **Note:** Migration may cause downtime. Plan accordingly.

**How to Document:**

- [x] Screenshot the "Database Region" setting
- [x] Save screenshot to: `docs/compliance/supabase-eu-region-verification.png`
- [ ] Update Privacy Policy with confirmed region (currently says "EU (Ireland or Frankfurt)")

---

#### 1.2 Verify Upstash Redis Region

**Steps:**

1. Log in to [Upstash Console](https://console.upstash.com/)
2. Go to **Redis** → Select your database
3. Check **"Region"** under database details
4. **Verify the region is in the EU:**
   - `eu-west-1-tcp.upstash.io` (Ireland) ✅
   - `eu-central-1-tcp.upstash.io` (Frankfurt) ✅
   - Any other `eu-` prefix ✅

**If the region is NOT in the EU:**

- Create a new Redis database in an EU region
- Update environment variable `UPSTASH_REDIS_REST_URL` in `.env`
- Migrate rate-limiting configuration
- Delete old non-EU database

**How to Document:**

- [ ] Screenshot the Redis database region
- [ ] Save screenshot to: `docs/compliance/upstash-eu-region-verification.png`

---

#### 1.3 Verify Vercel Deployment Region (Optional but Recommended)

**Steps:**

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to your project: **second-turn-games-marketplace**
3. Settings → **General** → **Deployment Region**
4. **Recommended:** Set to `fra1` (Frankfurt) for EU data residency

**Note:** Vercel's global CDN may serve requests from multiple regions, but setting a primary EU region helps with data processing locality.

---

## Task 2: Sign Data Processing Agreements (DPAs) 📝

### Why This Matters

GDPR Article 28 requires a written contract (Data Processing Agreement) with any third party that processes personal data on your behalf. These agreements ensure processors comply with GDPR.

---

### 2.1 Supabase DPA

**Priority:** 🔴 **CRITICAL** (Supabase stores all user data)

**Steps:**

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → **Project Settings** → **Legal** (or similar)
3. Look for **"Data Processing Agreement"** or **"DPA"**
4. **If available:** Click to review and sign electronically
5. **If not available:** Contact Supabase support to request a DPA
   - Email: support@supabase.com
   - Subject: "Request DPA for GDPR Compliance - Project: [your-project-id]"

**Supabase DPA Resources:**

- [Supabase Security & Compliance](https://supabase.com/security)
- [Supabase Terms of Service](https://supabase.com/terms)

**How to Document:**

- [ ] Download signed DPA PDF
- [ ] Save to: `docs/compliance/dpa-supabase-signed.pdf`
- [ ] Record signing date in this checklist: `_______________`

---

### 2.2 Vercel DPA

**Priority:** 🟡 **HIGH** (Vercel hosts the application and processes logs)

**Steps:**

1. **Check your Vercel plan:**

   - Free/Hobby plan: DPA may not be available (upgrade recommended for compliance)
   - Pro plan: DPA available upon request
   - Enterprise plan: DPA included

2. **Request DPA:**

   - Log in to [Vercel Dashboard](https://vercel.com/dashboard)
   - Go to **Settings** → **General** → **Support**
   - Submit a support ticket: "Request Data Processing Agreement for GDPR Compliance"
   - Or email: support@vercel.com

3. **Alternatively:** Use Vercel's legal contact form
   - Visit: [Vercel Legal](https://vercel.com/legal)

**Vercel Compliance Resources:**

- [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)
- [Vercel Security](https://vercel.com/security)

**How to Document:**

- [ ] Download signed DPA PDF (or confirmation email)
- [ ] Save to: `docs/compliance/dpa-vercel-signed.pdf`
- [ ] Record signing date: `_______________`

---

### 2.3 Cloudflare Turnstile DPA

**Priority:** 🟡 **HIGH** (Cloudflare processes IP addresses for CAPTCHA)

**Steps:**

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to your account → **Support** → **Legal**
3. Look for **"Data Processing Addendum"** (DPA)
4. **Cloudflare DPA is usually available as:**
   - Self-service online acceptance
   - Or downloadable template to sign

**Cloudflare Resources:**

- [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Cloudflare GDPR](https://www.cloudflare.com/trust-hub/gdpr/)

**How to Document:**

- [ ] Download signed DPA or acceptance confirmation
- [ ] Save to: `docs/compliance/dpa-cloudflare-signed.pdf`
- [ ] Record signing date: `_______________`

---

### 2.4 Upstash DPA

**Priority:** 🟡 **HIGH** (Upstash processes user IDs, emails, IPs for rate limiting)

**Steps:**

1. Log in to [Upstash Console](https://console.upstash.com/)
2. Go to **Account** → **Settings** or **Legal**
3. Look for **"Data Processing Agreement"**
4. If not found, contact Upstash support:
   - Email: support@upstash.com
   - Subject: "Request DPA for GDPR Compliance"

**Upstash Resources:**

- [Upstash Privacy Policy](https://upstash.com/privacy)
- [Upstash Security](https://upstash.com/docs/common/help/security)

**How to Document:**

- [ ] Download signed DPA
- [ ] Save to: `docs/compliance/dpa-upstash-signed.pdf`
- [ ] Record signing date: `_______________`

---

## Task 3: Legal Review of Privacy Policy & Terms 👨‍⚖️

**Priority:** 🔴 **CRITICAL BEFORE LAUNCH**

### Why This Matters

While the Privacy Policy and Terms of Service have been drafted to comply with GDPR, they should be reviewed by a lawyer familiar with:

- Latvian law
- GDPR regulations
- E-commerce/marketplace regulations

### What You Need to Do

1. **Hire a lawyer or legal firm specializing in:**

   - Data protection (GDPR)
   - E-commerce law
   - Consumer protection in Latvia/EU

2. **Provide them with:**

   - Current Privacy Policy (`/app/privacy/page.tsx`)
   - Current Terms of Service (`/app/terms/page.tsx`)
   - This audit document
   - Description of your business model (peer-to-peer marketplace)

3. **Ask them to review and advise on:**

   - Accuracy of legal bases cited (Contract, Legitimate Interest, etc.)
   - Completeness of disclosures
   - Compliance with Latvian consumer protection laws
   - Liability disclaimers (are they enforceable in Latvia?)
   - Dispute resolution procedures
   - Any additional disclosures required for marketplace platforms

4. **Update documents based on legal advice**

**How to Document:**

- [ ] Legal review completed by: `_______________ (lawyer/firm name)`
- [ ] Review date: `_______________`
- [ ] Save legal opinion/review notes to: `docs/compliance/legal-review-privacy-terms.pdf`
- [ ] Implement recommended changes
- [ ] Update "Last updated" date in Privacy Policy and Terms

---

## Task 4: Update Privacy Policy with Company Details 🏢

**Priority:** 🔴 **CRITICAL**

### What You Need to Do

The Privacy Policy currently has placeholders for company information. You must fill in:

1. **Company Registration Number**

   - File: `app/privacy/page.tsx`
   - Search for: `[Registration number to be added]`
   - Replace with: Your actual SIA registration number from Companies Register

2. **Company Address**

   - File: `app/privacy/page.tsx`
   - Search for: `[Company address in Latvia]`
   - Replace with: Your registered legal address

3. **Same updates in Terms of Service**
   - File: `app/terms/page.tsx`
   - Update registration number and address there too

**How to Document:**

- [ ] Privacy Policy updated with company registration number
- [ ] Privacy Policy updated with company address
- [ ] Terms of Service updated with company registration number
- [ ] Terms of Service updated with company address
- [ ] Verified information matches official registration documents

---

## Task 5: Set Up Privacy Email & Contact System 📧

**Priority:** 🔴 **CRITICAL**

### What You Need to Do

1. **Create dedicated email addresses:**

   - `privacy@secondturngames.lv` - For GDPR requests, privacy questions
   - `support@secondturngames.lv` - For general support
   - `legal@secondturngames.lv` - For legal notices (optional but recommended)

2. **Set up email forwarding or inbox monitoring:**

   - Ensure someone checks these emails **daily**
   - GDPR requires responses within **30 days** (sooner is better)

3. **Create a process for handling GDPR requests:**
   - Data access requests (Right to Access)
   - Data deletion requests (Right to Erasure) - already automated
   - Data portability requests (Right to Portability) - already automated
   - Objection to processing
   - Correction of inaccurate data

**How to Document:**

- [ ] Email addresses created and tested
- [ ] Forwarding/monitoring set up
- [ ] Assigned responsible person: `_______________`
- [ ] GDPR request handling process documented

---

## Task 6: Create Internal Records of Processing Activities (ROPA) 📋

**Priority:** 🟡 **REQUIRED** (GDPR Article 30)

### Why This Matters

GDPR Article 30 requires organizations to maintain records of all data processing activities. This is your internal documentation of what data you process, why, and how.

### What You Need to Do

1. **Create a ROPA document** that lists:

   - Name and contact details of the data controller (Second Turn Games SIA)
   - Purposes of processing (account management, marketplace listings, messaging, etc.)
   - Categories of data subjects (users, buyers, sellers)
   - Categories of personal data (names, emails, messages, IP addresses, etc.)
   - Categories of recipients (Supabase, Vercel, Cloudflare, Upstash)
   - Transfers to third countries (if any)
   - Retention periods (30 days for logs, 90 days after account deletion, etc.)
   - Security measures (encryption, RLS, rate limiting, etc.)

2. **Use the audit report as a starting point:**

   - Section 3 (Personal Data Collection) has most of the information you need
   - Section 4 (Third-Party Services) lists all recipients
   - Section 6 (Data Retention) has retention periods

3. **Keep ROPA updated:**
   - Review and update every 6-12 months
   - Update whenever you add new features that process personal data

**Template:** You can find ROPA templates from:

- [ICO (UK) ROPA Template](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/documentation/documentation-templates/)
- [European Commission ROPA Guide](https://commission.europa.eu/law/law-topic/data-protection_en)

**How to Document:**

- [ ] ROPA document created
- [ ] Save to: `docs/compliance/ropa-records-of-processing-activities.pdf`
- [ ] Set calendar reminder to review in 6 months

---

## Task 7: Prepare Data Breach Response Plan 🚨

**Priority:** 🟡 **RECOMMENDED** (GDPR Articles 33-34)

### Why This Matters

If a data breach occurs, GDPR requires you to:

- Notify the Latvian DVI (Data State Inspectorate) within **72 hours**
- Notify affected users if the breach is high risk

### What You Need to Do

1. **Create a data breach response plan** covering:

   - How to detect a breach (monitoring, alerts)
   - Who to notify internally (developer, management)
   - How to assess the severity
   - When to notify DVI (within 72 hours)
   - When to notify users (high-risk breaches)
   - How to contain and remediate the breach

2. **Prepare contact information:**

   - **Latvian DVI (Data State Inspectorate)**
   - Website: [dvi.gov.lv](https://www.dvi.gov.lv/)
   - Email: pasts@dvi.gov.lv
   - Phone: +371 67 22 31 31

3. **Document common breach scenarios:**
   - Database breach (unauthorized access to Supabase)
   - Account compromise (user password stolen)
   - Accidental data exposure (misconfigured permissions)

**How to Document:**

- [ ] Data breach response plan created
- [ ] Save to: `docs/compliance/data-breach-response-plan.pdf`
- [ ] Team trained on breach response procedures

---

## Task 8: Final Pre-Launch Checklist ✅

Before going live, verify ALL of the following:

### Technical Implementation (Already Complete ✅)

- [x] Cookie consent banner functional
- [x] Privacy Policy published at `/privacy`
- [x] Terms of Service published at `/terms`
- [x] EXIF metadata stripping implemented
- [x] Data export API functional
- [x] Vercel Analytics consent-gated
- [x] IP logging privacy notices added

### Manual Tasks (Complete Before Launch ⚠️)

- [ ] Supabase database region verified as EU
- [ ] Upstash Redis region verified as EU
- [ ] Supabase DPA signed
- [ ] Vercel DPA signed or requested
- [ ] Cloudflare DPA signed
- [ ] Upstash DPA signed
- [ ] Privacy Policy company details filled in
- [ ] Terms of Service company details filled in
- [ ] Privacy email addresses created and monitored
- [ ] Legal review of Privacy Policy completed
- [ ] Legal review of Terms of Service completed
- [ ] ROPA (Records of Processing Activities) created

### Recommended (Not Blockers but Important)

- [ ] Data breach response plan documented
- [ ] Team trained on GDPR compliance
- [ ] Calendar reminders set for:
  - ROPA review (6 months)
  - Privacy Policy review (12 months)
  - DPA renewal check (as needed)

---

## Task 9: Register with Latvian Data Protection Authority (If Required) 📝

**Priority:** 🟡 **CHECK IF REQUIRED**

### Why This Matters

Some businesses must notify or register with their local data protection authority (in Latvia: DVI - Data State Inspectorate).

### What You Need to Do

1. **Check if registration is required:**

   - Visit [DVI website](https://www.dvi.gov.lv/)
   - Look for guidance on "controller registration" or "data processing notification"
   - **Note:** Most businesses are **not** required to register, but there are exceptions for:
     - Large-scale processing of sensitive data
     - Systematic monitoring
     - High-risk processing

2. **For Second Turn Games:**

   - You are processing personal data (emails, names, messages)
   - NOT processing special categories of sensitive data (health, religion, etc.)
   - NOT doing large-scale systematic monitoring
   - **Likely:** Registration NOT required, but verify with DVI or your lawyer

3. **If required:**
   - Follow DVI's registration process
   - Provide required information (company details, processing activities)
   - Keep confirmation of registration

**How to Document:**

- [ ] Checked DVI website for registration requirements
- [ ] Confirmed with lawyer if registration needed: `YES / NO`
- [ ] If YES: Registration completed on `_______________`
- [ ] If YES: Save confirmation to `docs/compliance/dvi-registration.pdf`

---

## Contact Information for Compliance Questions

- **Latvian Data State Inspectorate (DVI)**

  - Website: [dvi.gov.lv](https://www.dvi.gov.lv/)
  - Email: pasts@dvi.gov.lv
  - Phone: +371 67 22 31 31
  - Address: Blaumaņa iela 11/13-15, Rīga, LV-1011

- **European Data Protection Board (EDPB)**
  - Website: [edpb.europa.eu](https://edpb.europa.eu/)
  - Resources: Guidelines, case law, FAQs

---

## Completion Sign-Off

**I confirm that all critical tasks have been completed:**

- Signature: `___________________________`
- Name: `___________________________`
- Title: `___________________________`
- Date: `___________________________`

---

## Appendix: Quick Reference

### Data Residency Status

- Supabase: EU Region `_______________` (Verified: ☐ YES ☐ NO)
- Upstash: EU Region `_______________` (Verified: ☐ YES ☐ NO)
- Vercel: Region `_______________` (Optional)

### DPA Status

- Supabase DPA: ☐ Signed ☐ Pending ☐ Not Started
- Vercel DPA: ☐ Signed ☐ Pending ☐ Not Started
- Cloudflare DPA: ☐ Signed ☐ Pending ☐ Not Started
- Upstash DPA: ☐ Signed ☐ Pending ☐ Not Started

### Legal Review Status

- Privacy Policy: ☐ Reviewed ☐ Pending ☐ Not Started
- Terms of Service: ☐ Reviewed ☐ Pending ☐ Not Started
- Lawyer/Firm: `___________________________`

---

**End of Manual Tasks Checklist**

For questions or assistance with GDPR compliance, consult:

1. Latvian DVI (dvi.gov.lv)
2. A lawyer specializing in GDPR/data protection
3. GDPR.eu resources (gdpr.eu)
