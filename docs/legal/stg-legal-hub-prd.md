# PRD: Second Turn Games Legal Hub

**Version**: 1.0
**Date**: January 2026
**Author**: Aigars (via Claude)
**Status**: Ready for Implementation

---

## 1. Overview

### 1.1 Summary

Create a unified legal information hub at `/legal` that consolidates all legal documents into a single, navigable page with section switching via URL query parameters.

### 1.2 Goals

1. Replace fragmented legal pages with a single, user-friendly legal hub
2. Make legal information accessible with plain-language explanations
3. Support all four languages (EN, LV, LT, ET)
4. Improve SEO with proper structured data
5. Align all legal content with current business rules and branding

### 1.3 Success Metrics

- Single page load for all legal content
- Proper deep-linking to specific sections
- Mobile-responsive navigation
- Accessible plain-language callouts

---

## 2. Technical Specification

### 2.1 URL Structure

**Base URL**: `/legal`

**Section Navigation via Query Parameters**:

| URL | Section |
|-----|---------|
| `/legal` | Overview (default) |
| `/legal?section=terms` | Terms of Service |
| `/legal?section=privacy` | Privacy Policy |
| `/legal?section=seller` | Seller Agreement |
| `/legal?section=buyer` | Buyer Guide |
| `/legal?section=cookies` | Cookie Policy |
| `/legal?section=fees` | Fees |

### 2.2 File Structure

```
packages/marketplace/
├── app/
│   └── [locale]/
│       └── legal/
│           └── page.tsx          # Main legal hub page
├── components/
│   └── legal/
│       ├── LegalHub.tsx          # Main container component
│       ├── LegalNav.tsx          # Section navigation sidebar/tabs
│       ├── LegalSection.tsx      # Section content renderer
│       └── PlainTermsBox.tsx     # Plain-language callout component
└── content/
    └── legal/
        ├── en/
        │   ├── overview.mdx
        │   ├── terms.mdx
        │   ├── privacy.mdx
        │   ├── seller.mdx
        │   ├── buyer.mdx
        │   ├── cookies.mdx
        │   └── fees.mdx
        ├── lv/
        │   └── [same structure]
        ├── lt/
        │   └── [same structure]
        └── et/
            └── [same structure]
```

### 2.3 Component Specifications

#### LegalHub.tsx

Main container that:
- Reads `section` query parameter (default: none = overview)
- Renders navigation and active section
- Handles section switching without full page reload
- Updates URL when section changes

```tsx
interface LegalHubProps {
  locale: string;
  initialSection?: string;
}
```

#### LegalNav.tsx

Navigation component:
- Desktop: Sticky sidebar on left
- Mobile: Horizontal tabs or dropdown at top
- Highlights active section
- Links update query parameter, not full URL

```tsx
const sections = [
  { id: 'overview', label: 'Overview', href: '/legal' },
  { id: 'terms', label: 'Terms of Service', href: '/legal?section=terms' },
  { id: 'privacy', label: 'Privacy Policy', href: '/legal?section=privacy' },
  { id: 'seller', label: 'Seller Agreement', href: '/legal?section=seller' },
  { id: 'buyer', label: 'Buyer Guide', href: '/legal?section=buyer' },
  { id: 'cookies', label: 'Cookie Policy', href: '/legal?section=cookies' },
  { id: 'fees', label: 'Fees', href: '/legal?section=fees' },
];
```

#### PlainTermsBox.tsx

Reusable callout component for plain-language explanations:

```tsx
interface PlainTermsBoxProps {
  children: React.ReactNode;
}

// Styling: Rounded border, light background, 📋 icon
// Match existing STG design system colors (Frost palette)
```

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 **In plain terms**                                           │
│                                                                 │
│ [Plain language explanation text here]                          │
└─────────────────────────────────────────────────────────────────┘
```

- Background: `frost-50` or similar light shade
- Border: `frost-200` with rounded corners
- Icon: 📋 or custom clipboard icon
- Typography: Slightly smaller than body, same font

### 2.4 Content Format

Content files use MDX with custom components:

```mdx
---
title: "Terms of Service"
lastUpdated: "2026-01-27"
---

## 1. Agreement to Terms

Welcome to Second Turn Games! These Terms...

<PlainTermsBox>
Think of us as the venue, not the seller. We provide the space
for you to meet and trade, but the actual sale is between you
and the other person.
</PlainTermsBox>

### 1.1 Service Provider

| | |
|---|---|
| **Company** | Second Turn Games SIA |
| **Registration** | 50203665371 |
```

### 2.5 Responsive Behavior

**Desktop (>1024px)**:
- Two-column layout
- Sticky navigation sidebar (left, ~250px)
- Content area (right, remaining width)
- Max content width: 800px

**Tablet (768px - 1024px)**:
- Navigation as horizontal tabs above content
- Full-width content

**Mobile (<768px)**:
- Navigation as dropdown or collapsible menu
- Full-width content
- Larger touch targets for navigation

---

## 3. Content Documents

### 3.1 Document List

| Section | Source File | Description |
|---------|-------------|-------------|
| Overview | `legal-hub-overview-v2.md` | Company info, quick answers, section navigation |
| Terms | `legal-hub-terms-v3.md` | Platform usage rules, transactions, disputes |
| Privacy | `legal-hub-privacy-v2.md` | Data collection, GDPR, third parties |
| Seller | `legal-hub-seller-v3.md` | Seller requirements, listing types, payouts |
| Buyer | `legal-hub-buyer-v1.md` | Buyer protections, C2C disclaimer, disputes |
| Cookies | `legal-hub-cookies-v1.md` | Cookie usage and consent |
| Fees | `legal-hub-fees-v1.md` | Fee structure and examples |

### 3.2 Key Business Values (Hardcoded)

These values appear throughout the documents and should be consistent:

| Value | Usage |
|-------|-------|
| **6% + €0.50** | Buyer service fee |
| **€2.00** | Flat shipping rate |
| **€0.30** | Stripe payout fee (Latvia) |
| **€5.00** | Minimum payout |
| **24 hours** | Seller order confirmation window |
| **2 business days** | Shipping deadline after confirmation |
| **2 days** | Dispute window after delivery |
| **30 sales / €2,000** | DAC7 reporting thresholds |
| **24 sales / €1,600** | DAC7 warning thresholds (~80%) |
| **14 days** | Account recovery period |
| **90 days** | Permanent data deletion |
| **7 years** | Transaction record retention |
| **180 days** | Payout hold on account termination |

### 3.3 Contact Information

Only two contact emails should appear:

| Purpose | Email |
|---------|-------|
| General inquiries | info@secondturn.games |
| Privacy & data requests | privacy@secondturn.games |

### 3.4 Company Information

| Field | Value |
|-------|-------|
| Company name | Second Turn Games SIA |
| Registration number | 50203665371 |
| VAT number | LV50203665371 |
| Address | Evalda Valtera 5-35, Riga, LV-1021, Latvia |

---

## 4. Implementation Tasks

### Phase 1: Infrastructure (Priority: High)

1. **Create page route**: `/app/[locale]/legal/page.tsx`
2. **Create LegalHub component**: Main container with query param handling
3. **Create LegalNav component**: Section navigation
4. **Create PlainTermsBox component**: Styled callout boxes
5. **Set up MDX processing**: For legal content files

### Phase 2: Content Migration (Priority: High)

1. **Convert markdown to MDX**: Add frontmatter and PlainTermsBox components
2. **Create English content files**: All 7 sections
3. **Add cross-references**: Ensure all `/legal?section=X` links work
4. **Remove old legal pages**: `/terms`, `/privacy`, etc.
5. **Set up redirects**: Old URLs → new legal hub sections

### Phase 3: Localization (Priority: Medium)

1. **Translate legal text**: Professional translation for LV, LT, ET
2. **Transcreate plain-language boxes**: Adapt tone, not literal translation
3. **Verify locale routing**: `/lv/legal?section=terms` etc.
4. **Test all language versions**: Ensure nothing is missing

### Phase 4: Polish (Priority: Low)

1. **SEO metadata**: Title, description per section
2. **Structured data**: Organization, legal document schemas
3. **Print styles**: Clean formatting for printing
4. **Analytics**: Track section views

---

## 5. Acceptance Criteria

### 5.1 Functionality

- [ ] `/legal` loads Overview section by default
- [ ] Query parameter `?section=X` loads correct section
- [ ] Navigation updates URL without full page reload
- [ ] Back/forward browser buttons work correctly
- [ ] Deep links (e.g., `/legal?section=fees`) work when shared
- [ ] All internal cross-references work
- [ ] Mobile navigation is usable

### 5.2 Content

- [ ] All 7 sections render correctly
- [ ] PlainTermsBox components display styled callouts
- [ ] Tables render correctly (fees, company info)
- [ ] Links to external sites work (Stripe, BGG, etc.)
- [ ] No references to old values (3.5% fee, local pickup, passwords, etc.)

### 5.3 Localization

- [ ] Language switcher works on legal hub
- [ ] All sections available in EN (required for launch)
- [ ] LV, LT, ET content displays when available
- [ ] Fallback to EN if translation missing

### 5.4 Performance

- [ ] Initial page load < 2s
- [ ] Section switching < 500ms
- [ ] No layout shift on section change

---

## 6. Redirects Required

Set up redirects from old URLs:

| Old URL | New URL |
|---------|---------|
| `/terms` | `/legal?section=terms` |
| `/privacy` | `/legal?section=privacy` |
| `/seller-terms` | `/legal?section=seller` |
| `/pricing` | `/legal?section=fees` |

---

## 7. SEO Metadata

### 7.1 Page Titles (per section)

| Section | Title |
|---------|-------|
| Overview | Legal Information | Second Turn Games |
| Terms | Terms of Service | Second Turn Games |
| Privacy | Privacy Policy | Second Turn Games |
| Seller | Seller Agreement | Second Turn Games |
| Buyer | Buyer Guide | Second Turn Games |
| Cookies | Cookie Policy | Second Turn Games |
| Fees | Fees & Pricing | Second Turn Games |

### 7.2 Meta Descriptions

| Section | Description |
|---------|-------------|
| Overview | Legal information, company details, and quick answers about Second Turn Games marketplace. |
| Terms | Terms of Service for using Second Turn Games, the Baltic board game marketplace. |
| Privacy | How Second Turn Games collects, uses, and protects your personal data. GDPR compliant. |
| Seller | Seller agreement, listing rules, and payout information for Second Turn Games sellers. |
| Buyer | Buyer protections, dispute process, and what to know when buying on Second Turn Games. |
| Cookies | Cookie usage and consent options on Second Turn Games. |
| Fees | Complete fee breakdown for buyers and sellers on Second Turn Games marketplace. |

---

## 8. Content Source Files

The following files contain the final content to be implemented. They are located in `/mnt/user-data/outputs/`:

1. `legal-hub-overview-v2.md` → Overview section
2. `legal-hub-terms-v3.md` → Terms of Service
3. `legal-hub-privacy-v2.md` → Privacy Policy
4. `legal-hub-seller-v3.md` → Seller Agreement
5. `legal-hub-buyer-v1.md` → Buyer Guide
6. `legal-hub-cookies-v1.md` → Cookie Policy
7. `legal-hub-fees-v1.md` → Fees

Each file includes:
- Full content with proper markdown formatting
- Implementation notes section at the bottom
- Plain terms box locations marked
- Cross-reference links using `/legal?section=X` format
- Change log documenting updates from original versions

---

## 9. Design Notes

### 9.1 PlainTermsBox Styling

Match STG brand voice guide - friendly, straightforward, not corporate:

```css
.plain-terms-box {
  background: var(--frost-50);
  border: 1px solid var(--frost-200);
  border-radius: 8px;
  padding: 16px 20px;
  margin: 24px 0;
}

.plain-terms-box-header {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plain-terms-box-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--frost-700);
}
```

### 9.2 Table Styling

Legal documents contain many tables. Ensure:
- Proper responsive behavior (horizontal scroll on mobile)
- Clear header styling
- Adequate cell padding
- Alternating row colors for readability

### 9.3 Navigation Styling

- Active section clearly highlighted
- Hover states for desktop
- Touch-friendly sizing for mobile (min 44px tap targets)
- Smooth transitions between sections

---

## 10. Testing Checklist

### 10.1 Desktop Testing

- [ ] Chrome, Firefox, Safari, Edge
- [ ] Navigation sidebar sticky behavior
- [ ] All sections load correctly
- [ ] Cross-reference links work
- [ ] Print preview looks acceptable

### 10.2 Mobile Testing

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Navigation dropdown/tabs work
- [ ] Tables scroll horizontally
- [ ] Touch targets adequate size

### 10.3 Accessibility Testing

- [ ] Screen reader navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation functional

---

## Appendix A: Plain Terms Box Inventory

Total: **27 plain-language callout boxes** across all documents

| Document | Count | Topics |
|----------|-------|--------|
| Overview | 3 | Stripe age requirement, buyer fees, payment protection |
| Terms | 7 | Platform role, C2C protection, account responsibility, payment flow, dispute window, content licensing, liability |
| Privacy | 6 | Why we need data, seller verification, messaging warning, DAC7, retention, deletion limits |
| Seller | 7 | Private sellers, Stripe verification, Instant Buy vs Contact Seller, DAC7, no seller fees, order flow, chargebacks |
| Buyer | 5 | Flea market comparison, Instant Buy safety, Contact Seller limits, payment timing, 2-day rule |
| Cookies | 1 | Cookie summary |
| Fees | 2 | Buyer-pays model, €2 shipping value |

---

## Appendix B: Cross-Reference Map

All internal links use the `/legal?section=X` format:

| From | To | Link Text |
|------|-----|-----------|
| Overview | Terms | "Terms of Service" |
| Overview | Privacy | "Privacy Policy" |
| Overview | Seller | "Seller Agreement" |
| Overview | Buyer | "Buyer Guide" |
| Overview | Cookies | "Cookie Policy" |
| Overview | Fees | "Fees" |
| Terms | Privacy | "Privacy Policy" |
| Terms | Seller | "Seller Agreement" |
| Terms | Buyer | "Buyer Guide" |
| Terms | Fees | "Fees page" |
| Privacy | Cookies | "Cookie Policy" |
| Privacy | Seller | "Seller Agreement" |
| Seller | Terms | "Terms of Service" |
| Seller | Privacy | "Privacy Policy" |
| Seller | Fees | "Fee breakdown" |
| Buyer | Terms | "Terms of Service" |
| Buyer | Fees | "Fee breakdown" |
| Cookies | Privacy | "Privacy Policy" |
| Fees | Terms | "Terms of Service" |
| Fees | Seller | "Seller Agreement" |
| Fees | Buyer | "Buyer Guide" |

Also links to external pages:
- `/help/grading-guide` — Condition guide (from Seller, Buyer)
- `/help/dac7` — DAC7 tax reporting guide (from Overview, Privacy, Seller)
- Stripe, BGG, Cloudflare privacy policies (from Privacy)

---

## Appendix C: DAC7 Help Page

### Overview

A dedicated help page at `/help/dac7` explains EU tax reporting requirements in a reassuring, seller-friendly way. This is a **help page**, not a legal document — the goal is to calm concerns, not add legal weight.

### Source File

`help-dac7-v1.md`

### Key Features

1. **Inverted framing**: Leads with "most sellers won't be affected" rather than compliance language
2. **Clear threshold logic**: Emphasizes "either/or" reporting triggers with concrete examples
3. **Separation of concepts**: Distinguishes "being reported" from "owing taxes"
4. **Practical guidance**: Explains what TIN is and where to find it
5. **FAQ section**: Addresses common concerns
6. **VID quote**: Uses official reassurance from Latvia's tax authority

### Recommended Interactive Elements

1. **Threshold Calculator Widget**: Sellers enter their sales count and total, get instant "reported/not reported" result
2. **Visual Flowchart**: Simple decision tree showing the either/or logic
3. **Progress Bar in Seller Dashboard**: Shows sellers their current progress toward thresholds

### Cross-References

**Link TO `/help/dac7` from:**
- Legal Hub Overview (DAC7 section)
- Privacy Policy (Section 5)
- Seller Agreement (Section 5)
- Seller Dashboard (when approaching thresholds)
- Seller onboarding flow

### DAC7 Threshold Values

| Threshold | Reporting Trigger | Warning at 80% |
|-----------|-------------------|----------------|
| Sales count | 30 or more | 24 sales |
| Total proceeds | €2,000 or more | €1,600 |

**Logic**: Report if seller exceeds **either** threshold. Exempt only if below **both**.

---

## Appendix D: Condition Grading Guide

### Overview

A comprehensive help page at `/help/grading-guide` explains how to accurately grade board game condition. This replaces/enhances the existing grading guide with the same accessible format as other help pages.

### Source File

`help-grading-guide-v1.md`

### Key Features

1. **Four clear grades**: Like New, Very Good, Good, Acceptable — with value percentages
2. **Comparison tables**: "✓ means / ✗ not if" format for each grade
3. **Special considerations**: Punched tokens, sleeved cards, painted minis, promos, editions
4. **Description examples**: Ready-to-use listing text for each grade
5. **Photo guide**: What to photograph and how
6. **Common mistakes**: Table of errors to avoid
7. **FAQ section**: Answers to edge cases

### Recommended Interactive Elements

1. **Visual Grade Cards**: Four-card display showing grades at a glance
2. **"What Grade Is My Game?" Wizard**: Step-by-step questionnaire that suggests appropriate grade
3. **Photo Examples Gallery**: Real photos showing condition indicators

### The Golden Rule

> If you're debating between two grades, pick the lower one. Under-promise, over-deliver.

### Cross-References

**Link TO `/help/grading-guide` from:**
- Listing creation flow (prominent placement)
- Seller Agreement (Section 6.4)
- Buyer Guide (Section 4.1)
- Seller Dashboard
