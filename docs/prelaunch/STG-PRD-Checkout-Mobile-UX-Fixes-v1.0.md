# STG-PRD-Checkout-Mobile-UX-Fixes-v1.0

**Document:** Checkout page mobile UX fixes  
**Version:** 1.0  
**Date:** March 2026  
**Status:** Ready for implementation  
**Priority:** P0 (pre-launch blocker)  
**Estimated effort:** 1–2 sessions

---

## 1. Context

The checkout page ("Apmaksas lapa") has several mobile-specific layout issues identified during device testing. The most critical: the primary CTA button ("Apstiprināt un maksāt") is hidden behind the bottom navigation bar, directly impacting conversion. Additional issues include content overflow, redundant UI elements consuming vertical space, a data display bug in the contact info section, and insufficient space for legal text.

These fixes are scoped to the checkout page only. No backend/API changes required — this is purely frontend layout and component work.

### Reference screenshot

The issues were identified from a mobile screenshot (iPhone, 5G, viewport ~375px width) showing the full checkout page with two completed accordion sections (parcel terminal selection, contact info), a seller/order section with reservation timer, price breakdown, terms checkbox, and the CTA button obscured by the bottom nav.

---

## 2. Issues and fixes

### 2.1 [P0] CTA button hidden behind bottom navigation bar

**Problem:** The "Apstiprināt un maksāt" button sits at the natural end of the page scroll, but the fixed bottom navigation bar (56px + safe area) overlaps it. Users cannot tap the payment button without scrolling precisely past the nav — many won't discover it at all.

**Fix:** Hide the bottom navigation bar on the checkout page entirely. Checkout is a focused, linear flow — the user doesn't need Sākums/Pārlūkot/Pārdot/Grozs/Profils tabs competing for attention.

**Implementation:**

1. The bottom nav component should accept a visibility prop or be conditionally rendered based on the current route.
2. On the checkout route (`/[locale]/checkout` or equivalent), do not render the bottom nav.
3. Add `pb-safe` (padding-bottom for iOS safe area) to the checkout page container so the CTA has breathing room on devices with home indicators.
4. The CTA button itself should remain in the normal document flow (not sticky) since the page is short enough that users will naturally scroll to it.

**Acceptance criteria:**
- Bottom navigation bar is not visible on the checkout page on any viewport
- CTA button is fully visible and tappable after scrolling to the bottom of the page
- iOS safe area inset is respected — no content hidden behind the home indicator
- Bottom nav still renders normally on all other pages (home, browse, profile, etc.)
- Desktop layout is unaffected (bottom nav is already hidden on desktop)

**Grep verification:**
```bash
# Verify bottom nav is conditionally hidden on checkout
grep -r "checkout" src/components/**/BottomNav* src/components/**/MobileNav* src/components/**/Navigation*
# Verify safe area padding exists on checkout
grep -r "pb-safe\|padding-bottom.*safe\|env(safe-area" src/app/**/checkout/**
```

### 2.2 [P0] Contact info section displaying staff data instead of buyer data

**Problem:** The contact info accordion shows "Second Turn Staff · info@secondturn.games · +37120012345" — this is STG's internal contact info, not the buyer's submitted contact details. This is either a data mapping bug (pulling from a wrong source) or hardcoded test/fallback data.

**Fix:** The contact info summary (collapsed accordion state) must display the buyer's own submitted data: their name, email, and phone number.

**Implementation:**

1. Locate the contact info accordion component in the checkout flow.
2. The collapsed/completed state should render the buyer's submitted values from the checkout form state, not any default or fallback values.
3. If the buyer hasn't completed this step yet, show nothing or a prompt — never show STG staff contact info.
4. Check if there's a hardcoded fallback or default value being used as a placeholder and remove it.

**Acceptance criteria:**
- Completed contact info section shows buyer's name, email, and phone
- No STG internal contact info (info@secondturn.games, +37120012345) appears anywhere on the checkout page
- If contact info step is incomplete, the section shows the appropriate incomplete state (not "Pabeigts")

**Grep verification:**
```bash
# Find hardcoded staff contact info
grep -r "info@secondturn.games\|Second Turn Staff\|37120012345" src/
# Check contact info component data source
grep -r "contactInfo\|contact_info\|ContactInfo" src/app/**/checkout/** src/components/**/checkout/**
```

### 2.3 [P1] Section card overflow / padding inconsistency

**Problem:** The accordion section cards (parcel terminal, contact info) appear to overflow the page margins on mobile. The design system specifies 16px (`spacing-4`) page margins on mobile, but the cards may not be respecting this constraint.

**Fix:** Ensure all checkout section cards sit within the page margin and don't touch or overflow the viewport edge.

**Implementation:**

1. Check the checkout page container — it should have `px-4` (16px horizontal padding) on mobile.
2. Check whether the accordion cards have their own negative margins or `mx` values that push them outward.
3. The cards should have `overflow-hidden` to prevent internal content from breaking the card boundary.
4. Inner content (address text, form fields) should have consistent card padding — `p-3` (12px) or `p-4` (16px) per the design system's card internal spacing spec.

**Acceptance criteria:**
- All section cards have visible margins (16px minimum) from viewport edges on mobile
- No horizontal scroll triggered by card overflow
- Card content does not visually touch the card border — consistent internal padding throughout
- Tested at 320px, 375px, and 414px viewport widths

**Grep verification:**
```bash
# Check checkout page container padding
grep -r "className.*checkout\|class.*checkout" src/app/**/checkout/**/page.tsx src/app/**/checkout/**/layout.tsx
# Check for negative margins on cards
grep -r "\-mx\-\|margin.*-\|overflow" src/components/**/checkout/**
```

### 2.4 [P1] Redundant breadcrumb and heading consuming vertical space

**Problem:** The page shows a breadcrumb ("Grozs / Apmaksas lapa") immediately followed by the page heading "Apmaksas lapa". On mobile, this wastes ~60px of vertical space on redundant information.

**Fix:** On mobile, replace the breadcrumb with a simple back navigation element: a back arrow icon + "Grozs" as a tappable link. Keep the page heading.

**Implementation:**

1. On screens `< sm` (below 640px), render a back link instead of the full breadcrumb trail:
   ```
   ← Grozs
   Apmaksas lapa
   ```
2. The back link should navigate to `/[locale]/cart` (the cart page).
3. Use Phosphor `ArrowLeft` icon (size 20px) + text link styled as `text-sm text-text-secondary`.
4. On desktop (`≥ sm`), keep the existing breadcrumb as-is.

**Translation keys needed:**

```json
{
  "Checkout": {
    "backToCart": "Back to cart"
  }
}
```

| Locale | Key | Value |
|--------|-----|-------|
| `en` | `Checkout.backToCart` | `Back to cart` |
| `lv` | `Checkout.backToCart` | `Atpakaļ uz grozu` |
| `lt` | `Checkout.backToCart` | `Grįžti į krepšelį` |
| `et` | `Checkout.backToCart` | `Tagasi ostukorvi` |

**Acceptance criteria:**
- Mobile: breadcrumb replaced with back arrow + "Atpakaļ uz grozu" (or locale equivalent)
- Mobile: back link navigates to cart page
- Desktop: existing breadcrumb is unchanged
- Page heading "Apmaksas lapa" remains visible on both mobile and desktop

### 2.5 [P1] Redundant "Pabeigts" badge doubling the completed-step signal

**Problem:** Each completed accordion section shows both a green checkmark icon AND a "Pabeigts" text badge. Two signals for the same state wastes horizontal and cognitive space.

**Fix:** Remove the "Pabeigts" text badge. The green checkmark is sufficient and universally understood.

**Implementation:**

1. In the checkout step/accordion component, remove the "Pabeigts" (completed) text badge from the completed state rendering.
2. Keep the green checkmark icon — this is the primary completion indicator.
3. The step title should still be visible alongside the checkmark.
4. Check whether "Pabeigts" is a translated string and remove from all four locale files if so.

**Translation keys to remove (if they exist):**

| Locale | Key to remove |
|--------|---------------|
| `en` | `Checkout.completed` or `Checkout.stepCompleted` (value: "Completed") |
| `lv` | Same key (value: "Pabeigts") |
| `lt` | Same key (value: "Užbaigta") |
| `et` | Same key (value: "Lõpetatud") |

Note: only remove the key if it's exclusively used in this checkout step context. If reused elsewhere, leave the translation but remove the rendering in the checkout accordion.

**Acceptance criteria:**
- Completed checkout steps show only the green checkmark, no "Pabeigts" text
- Step title and summary info remain visible
- Incomplete steps are unaffected
- No orphaned translation keys

### 2.6 [P2] Terms and conditions text clipped

**Problem:** The legal agreement text ("Ieliekot atzīmi, es apstiprinu, ka piekrītu Lietošanas noteikumiem, Piegādes un Atgriešanas noteikumiem") is cut off at the bottom — the user can't read the full text before tapping the checkbox.

**Fix:** Ensure the terms text has adequate space to render fully, and add sufficient bottom margin before the CTA button.

**Implementation:**

1. The terms checkbox container should not have a fixed height or `overflow-hidden`.
2. Add `mb-4` (16px) or `mb-6` (24px) spacing between the terms section and the CTA button.
3. Ensure the text wraps naturally — it's a long sentence in Latvian and will be similarly long in Lithuanian/Estonian.
4. Links within the text ("Lietošanas noteikumiem", "Piegādes", "Atgriešanas noteikumiem") should be tappable with adequate touch targets (underlined, with enough line-height for finger tapping — minimum `leading-relaxed`).

**Acceptance criteria:**
- Full terms text is visible without scrolling within the section
- All three legal links are tappable and underlined
- Sufficient spacing between terms checkbox and CTA button (minimum 16px)
- Terms text renders fully in all four locales (test LV, LT, ET — these tend to be longer than EN)

### 2.7 [P2] Item thumbnails too small for recognition

**Problem:** The game cover thumbnails in the order items list are approximately 48×48px — too small to make out the cover art for game identification.

**Fix:** Increase item thumbnails to 56–64px.

**Implementation:**

1. In the order items list component, increase the image container from the current size to `w-16 h-16` (64px) or at minimum `w-14 h-14` (56px).
2. Maintain `rounded-md` and `object-cover` on the images.
3. Ensure the item row layout still fits at 320px viewport — title and price should not wrap excessively.

**Acceptance criteria:**
- Item thumbnails are 56–64px
- Cover art is recognizable at the displayed size
- Layout doesn't break at 320px viewport width
- Image aspect ratio maintained (no stretching)

### 2.8 [P2] Reservation timer visibility

**Problem:** The "Rezervēts: 29:07" timer badge in the seller section is subtle and could be missed. If the timer creates urgency, it should be more prominent.

**Fix:** Apply a muted yellow background to the reservation timer to draw attention without being alarming.

**Implementation:**

1. Style the reservation timer badge with Aurora Yellow at 15% opacity background: `bg-aurora-yellow/15 text-amber-700` (or the equivalent semantic token).
2. Keep the clock icon alongside the timer text.
3. Font weight can stay as-is (medium/500) — the background treatment provides enough emphasis.

**Acceptance criteria:**
- Reservation timer has a visible yellow-tinted background
- Timer is noticeably more prominent than the current treatment
- Timer does not look like an error or warning — it should feel informational/urgent, not alarming
- Dark mode: background adapts appropriately (if dark mode is active)

---

## 3. File discovery

Claude Code should start by identifying the exact file paths for the affected components. Run these searches at the beginning of implementation:

```bash
# Find checkout page and layout files
find src -path "*checkout*" -name "*.tsx" -o -path "*checkout*" -name "*.ts" | head -20

# Find bottom navigation component
find src -path "*BottomNav*" -o -path "*MobileNav*" -o -path "*bottom-nav*" -o -path "*mobile-nav*" | head -10

# Find breadcrumb component
find src -path "*Breadcrumb*" -o -path "*breadcrumb*" | head -10

# Find checkout accordion/step components
find src -path "*checkout*" | grep -i "step\|accordion\|section" | head -10

# Find translation files
find src -path "*messages*" -name "*.json" | head -10
ls src/messages/ 2>/dev/null || ls messages/ 2>/dev/null
```

---

## 4. Implementation order

Implement in this order — each fix is independently testable:

1. **2.1** — Hide bottom nav on checkout (P0, unblocks CTA)
2. **2.2** — Fix contact info data bug (P0, trust/correctness)
3. **2.3** — Fix section overflow/padding (P1, layout)
4. **2.4** — Replace breadcrumb with back link on mobile (P1, space recovery)
5. **2.5** — Remove "Pabeigts" badge (P1, space recovery)
6. **2.6** — Fix terms text clipping (P2, legal compliance)
7. **2.7** — Increase item thumbnails (P2, polish)
8. **2.8** — Style reservation timer (P2, polish)

---

## 5. Testing checklist

### Mobile viewports
- [ ] 320px (iPhone SE / small Android)
- [ ] 375px (iPhone 12/13/14)
- [ ] 414px (iPhone 12/13/14 Pro Max)
- [ ] 390px (iPhone 14 Pro)

### Functional
- [ ] CTA button is visible and tappable without precise scrolling
- [ ] Bottom nav is hidden on checkout, visible everywhere else
- [ ] Contact info shows buyer data, not STG staff data
- [ ] Back link navigates to cart
- [ ] All three legal links in terms text are tappable
- [ ] Reservation timer is visible with yellow background
- [ ] Item thumbnails are 56–64px

### Cross-locale
- [ ] EN checkout renders correctly
- [ ] LV checkout renders correctly (primary test locale)
- [ ] LT checkout renders correctly
- [ ] ET checkout renders correctly

### Regression
- [ ] Desktop checkout layout is unaffected
- [ ] Bottom nav works correctly on: home, browse, listing detail, cart, profile, dashboard
- [ ] Other accordion components across the site are unaffected by checkout-specific changes

---

## 6. Do not implement

- Do not make the CTA button sticky/fixed — the page is short enough for natural scroll
- Do not convert the checkout to a bottom sheet pattern
- Do not add a sticky order summary bar (reserved for future consideration)
- Do not change the order or logic of the checkout steps
- Do not modify EveryPay payment integration
- Do not change shipping pricing logic (the €1.90 shown is correct route-based pricing)
- Do not touch any backend/API routes or database schema
- Do not restructure the checkout into a multi-page wizard
- Do not remove the reservation timer — only restyle it

---

*every game deserves a second turn*
