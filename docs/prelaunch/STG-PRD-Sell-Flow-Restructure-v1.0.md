# PRD: Sell Flow Restructure — Responsive Layout with Phase System

**Second Turn Games**

**Version:** 1.0
**Date:** March 2026
**Status:** Ready for Implementation
**Target:** Pre-launch

---

## 1. Overview

### 1.1 What This Is

A restructure of the listing creation flow ("sell a game") that introduces responsive layout differentiation: a single scrollable form with collapsible sections on desktop, and a multi-step gamified phase wizard on mobile. This replaces the current 4-phase wizard that renders identically on all viewports.

Additionally, this PRD addresses six confirmed bugs, incorporates 22 edge cases, and removes the post-publish celebration screen in favor of a redirect with toast notification.

### 1.2 Why We're Doing This

The gamified phase system was introduced to reduce perceived friction and create a brand-differentiating experience. However, the 4-phase wizard adds unnecessary clicks on desktop where screen real estate allows a full form. Meanwhile, mobile benefits from the focused, one-thing-at-a-time approach.

The restructure also responds to a business context change: Contact Seller listings have been removed, leaving only one transaction method (`claim`) with two pricing formats (`fixed_price` | `auction`). This simplifies the flow significantly.

### 1.3 Guiding Principles

- **Desktop:** Show everything, let users work in any order. Progressive disclosure via collapsible sections.
- **Mobile:** Guide users step-by-step. The board game phase metaphor adds value on small screens.
- **Both:** Same form state, same validation rules, same API. Only the layout and navigation differ.

### 1.4 Scope

**In scope:**
- Responsive sell flow (desktop scroll + mobile phases)
- Phase content redistribution (condition+photos together, pricing standalone)
- Condition default change (null instead of "good")
- Photo requirement revert (optional unless "acceptable" condition)
- Celebration screen removal (redirect + toast)
- Edit mode pricing format bug fix
- Draft system improvements (v3 format)
- 22 edge cases documented and addressed
- PhaseTracker navigation fix (Score Phase trap)

**Out of scope:**
- Edit mode layout changes (stays as-is — single scroll on all viewports)
- Relist mode changes (stays as-is — uses create mode layout)
- Onboarding flow
- Translation of new keys into LT/ET (only EN and LV in scope)
- Bulk listing tools

---

## 2. Architecture

### 2.1 Rendering Modes

The sell page has three rendering modes, determined by URL parameters and viewport:

| Mode | Trigger | Layout | Progress indicator |
|------|---------|--------|--------------------|
| **Desktop Create** | No `?edit=` param, viewport ≥ 1024px | Single scroll, collapsible sections, live preview sidebar | Section completion badges (checkmark + "Complete") |
| **Mobile Create** | No `?edit=` param, viewport < 1024px | 4-phase wizard with PhaseTracker | Phase tracker with gamified names |
| **Edit** | `?edit={id}` param, any viewport | Single scroll, collapsible sections (current behavior) | Section completion badges |

Relist mode (`?relist={id}`) uses create mode layout (desktop or mobile depending on viewport) with pre-filled data from the source listing.

### 2.2 Viewport Detection

Use a CSS-driven approach for MVP: render both layouts, use Tailwind `hidden lg:block` / `lg:hidden` to show/hide. Both layouts share the same `useListingForm` state via a single hook instance.

This means:
- No flash of wrong layout on SSR
- Both component trees mount but only one is visible
- Form state stays perfectly synchronized
- Resizing or rotating a tablet switches layouts seamlessly

If performance becomes a concern post-launch, refactor to a `useMediaQuery` hook that conditionally renders only one layout.

### 2.3 State Management

**Desktop create** uses `useListingForm` directly (same as edit mode). No phase navigation, no sparkles, no toasts. Section completion is computed from form data.

**Mobile create** uses `usePhaseFlow` (which wraps `useListingForm`). Phase navigation, completion tracking, sparkle animations, and milestone toasts remain.

**Both viewports share** the same `formData` state object. The `SellPageContent` component instantiates one hook and passes it to both layout components.

### 2.4 Component Reuse Strategy

| Existing component | Desktop create | Mobile create | Edit |
|-------------------|---------------|--------------|------|
| `CollapsibleSection` | Yes (sections) | No | Yes |
| `PhaseTracker` | No | Yes | No |
| `ResearchPhase` | No (inline sections) | Yes (restructured) | No |
| `MarketPhase` | No (inline sections) | Yes (restructured) | No |
| `ActionPhase` | No (inline sections) | Yes (restructured) | No |
| `ScorePhase` | No | Yes (mobile review) | No |
| `ListingPreviewSidebar` | Yes (right column) | No (modal only) | Yes |
| `CelebrationScreen` | **Remove** | **Remove** | N/A |
| `MilestoneToast` | Keep (achievements) | Keep (phase + achievements) | No |

---

## 3. Content Grouping

### 3.1 Phase/Section Definitions

Both desktop and mobile use the same four content groups, presented differently:

| # | Phase name (mobile) | Desktop section header | Contents |
|---|--------------------|-----------------------|----------|
| 1 | **Research Phase** — "Find your game" | **Game** | BGG search, version/edition selection, display name selector, expansions toggle (collapsed) |
| 2 | **Market Phase** — "Condition & photos" | **Condition & Photos** | Condition selector (null default, active choice required), completeness checkboxes, condition notes textarea, photo upload (optional; required for "acceptable"), phone prompt (if phone missing) |
| 3 | **Action Phase** — "Name your price" | **Pricing** | Pricing format selector (fixed/auction), PricingAssistant, price input, auction settings (duration, end strategy, cooldown — if auction), commission info |
| 4 | **Score Phase** — "Review & list" | *(no section — bottom bar)* | **Mobile only:** Summary cards with edit links, terms checkbox, publish button, save draft. **Desktop:** Terms checkbox and publish button in a bottom bar (not a collapsible section). |

### 3.2 Phase Name Changes

The Action Phase subtitle changes from "Show off your game" to "Name your price" because the phase now contains pricing, not photos. The board game metaphor still works: "Action Phase" is where you make your decisive move — naming your price *is* the action.

The Market Phase subtitle changes from "Set your price & condition" to "Condition & photos" because pricing moved out. The Market Phase is now about assessing what you've got — condition, completeness, visual evidence.

### 3.3 Auction Commission Copy

**Fixed price listings:** Show specific commission calculation — "Platform fee: -€X.XX" and "You receive: €XX.XX" computed from the entered price.

**Auction listings:** Replace the specific calculation with: "A 10% platform fee will be deducted from the final sale price. The starting bid is the minimum — your earnings depend on how high bidding goes." Optionally show: "If sold at starting bid: you receive €X.XX" as a clearly labeled reference point, but not as a definitive calculation.

---

## 4. Desktop Create Layout

### 4.1 Overall Structure

```
┌─────────────────────────────────────────────────────┐
│ Header: "Sell a game"              [Powered by BGG] │
├─────────────────────────────────────────────────────┤
│ [Email Verification Banner — if needed]             │
│ [Wanted Listing Context Banner — if applicable]     │
│ [Draft Resume Banner — if draft exists]             │
├──────────────────────────────┬──────────────────────┤
│ Section 1: Game              │ Live Preview         │
│ [expanded on load]           │ (sticky sidebar)     │
│                              │                      │
│ Section 2: Condition & Photos│                      │
│ [collapsed, disabled until   │                      │
│  game+version selected]      │                      │
│                              │                      │
│ Section 3: Pricing           │                      │
│ [collapsed, disabled until   │                      │
│  condition selected]         │                      │
│                              │                      │
│ ─── Bottom Bar ────────────  │                      │
│ □ Terms checkbox             │                      │
│ [Publish] [Save draft]       │                      │
└──────────────────────────────┴──────────────────────┘
```

### 4.2 Section Progressive Disclosure

Sections follow these rules:

| Section | Initial state | Enables when | Completes when |
|---------|--------------|-------------|----------------|
| Game | Expanded | Always enabled | Game + version selected (+ display name if non-English with alternates) |
| Condition & Photos | Collapsed, disabled | Game section complete | Condition selected (any of the four options) |
| Pricing | Collapsed, disabled | Condition section complete | Price > €0 for fixed; price ≥ €1 + duration set for auction |
| Bottom bar | Visible but publish disabled | — | All three sections complete + terms accepted |

"Disabled" means the section header is grayed out and non-clickable. The `CollapsibleSection` component needs a new `disabled?: boolean` prop.

### 4.3 Section Completion Indicators

Use the existing `CollapsibleSection` `isComplete` prop. When a section is complete and collapsed, it shows a blue "✓ Complete" badge in the header. When incomplete and collapsed, it shows its subtitle text. When disabled, it shows the subtitle in a muted/grayed style.

No asterisks (*), no "(optional)" labels, no "(required)" labels. The completion badges and the disabled-until-prerequisite pattern communicate requirements implicitly.

### 4.4 Photo Handling Within Condition & Photos Section

The photo upload area within the Condition & Photos section uses contextual copy based on condition:

- **Condition is null (not yet selected):** Photo area does not render. Section cannot be opened until condition is set on a higher level — but within the section, show condition first, then photos appear below once condition is chosen.
- **Condition is "acceptable":** Photo area header says "Photos (at least one required for this condition)". Section completion requires ≥ 1 photo.
- **Any other condition:** Photo area header says "Photos help your listing sell faster". Section completes without photos.

### 4.5 Publish Button Validation

The publish button is disabled until all requirements are met. If a user somehow clicks it while incomplete (e.g., via browser dev tools), the handler validates and shows a modal explaining what's missing. Validation order:

1. Email verification check (blocks with specific message)
2. Game + version selected
3. Condition selected
4. Photos present (if condition = "acceptable")
5. Price entered and valid
6. Terms accepted

---

## 5. Mobile Create Layout

### 5.1 Overall Structure

```
┌─────────────────────────────────────────┐
│ Header: "Sell a game"    [Powered by BGG]│
├─────────────────────────────────────────┤
│ [Email Verification Banner — if needed] │
│ [Wanted Listing Context Banner]         │
│ [Draft Resume Banner]                   │
├─────────────────────────────────────────┤
│ PhaseTracker                            │
│ [Research] → [Market] → [Action] → [Score] │
├─────────────────────────────────────────┤
│                                         │
│ Phase Content (one phase at a time)     │
│                                         │
│ [Continue →]  or  [Publish]             │
│                                         │
├─────────────────────────────────────────┤
│ [Mobile Preview] button (floating)      │
└─────────────────────────────────────────┘
```

### 5.2 Phase Content

**Phase 1 — Research Phase** ("Find your game")

Contents (unchanged from current `ResearchPhase`):
- BGG search → version/edition selection → display name selector
- Expansions toggle (collapsed by default, "Include expansions?" link, expand on click)
- Continue button (disabled until game + version selected)

**Phase 2 — Market Phase** ("Condition & photos")

Contents (restructured — condition + photos now together):
- Phone prompt (if seller has no phone on file — renders at top, only when needed)
- Condition selector (null default — no pre-selection, user must actively choose)
- Completeness checkboxes (all components present toggle, missing components textarea)
- Condition notes textarea
- Photo upload section:
  - For "acceptable" condition: "At least one photo is required for this condition"
  - For other conditions: "Photos help your listing sell faster"
  - For null condition (shouldn't happen since condition is above, but defensively): "Select a condition first"
- Continue button (disabled until condition selected; also requires ≥ 1 photo if condition = "acceptable")

**Phase 3 — Action Phase** ("Name your price")

Contents (restructured — pricing is now standalone):
- Pricing format selector (fixed price / auction tabs)
- PricingAssistant (condition-aware suggestions; shows "Set a condition for tailored suggestions" if condition is somehow null)
- Price input field with "EUR" prefix
  - Fixed price: min €0.01, placeholder "e.g. 25"
  - Auction: min €1.00, placeholder "e.g. 5", helper text "The minimum amount you'll accept"
- Auction settings (only if auction selected): duration, end strategy, cooldown hours
- Commission info:
  - Fixed price: specific calculation with "You receive: €XX.XX"
  - Auction: "A 10% platform fee will be deducted from the final sale price" + optional "If sold at starting bid" reference
- Continue button (disabled until price is valid; for auctions, also requires duration set)

**Phase 4 — Score Phase** ("Review & list")

Contents (mobile-only review screen):
- Game summary card with edit link → navigates to Phase 1
- Condition & Photos summary card with edit link → navigates to Phase 2
- Pricing summary card with edit link → navigates to Phase 3
- Terms checkbox
- Publish button (disabled until terms accepted)
- Save draft link

### 5.3 Phase Completion Criteria

| Phase | Required to complete | What's optional |
|-------|---------------------|-----------------|
| Research | Game selected + version selected + display name (if non-English edition with alternates) | Expansions |
| Market | Condition actively selected (not null) + photos if condition = "acceptable" | Photos (for non-acceptable), condition notes, completeness details |
| Action | Price > €0 for fixed price; price ≥ €1.00 + auction duration for auction | PricingAssistant usage |
| Score | Terms accepted | — |

### 5.4 Phase Navigation Rules

**Forward navigation (Continue button):** Validates current phase. If incomplete, button is disabled. On click, triggers sparkle animation on completed phase, shows milestone toast, advances after 500ms delay.

**Backward navigation (PhaseTracker clicks):** Always allowed to any phase at or before the current index. No re-validation required for backward navigation.

**Forward jumps (PhaseTracker clicks):** Allowed to any *previously visited* phase (tracked via `highestVisitedPhaseIndex`), or to the next phase if the current phase is complete. This fixes the Score Phase navigation trap — once a user reaches Score and goes back to Research, they can click any phase in the tracker to return directly.

Implementation: Add `highestVisitedPhaseIndex` to `usePhaseFlow`. Update it whenever `currentPhaseIndex` increases. The `goToPhase` function allows navigation to any index ≤ `highestVisitedPhaseIndex`.

```typescript
// Updated goToPhase logic:
const goToPhase = (index: number) => {
  if (index < 0 || index >= LISTING_PHASES.length) return;
  
  // Always allow backward navigation
  if (index <= currentPhaseIndex) {
    setCurrentPhaseIndex(index);
    return;
  }
  
  // Allow forward to any previously visited phase
  if (index <= highestVisitedPhaseIndex) {
    setCurrentPhaseIndex(index);
    return;
  }
  
  // Allow forward to next phase if current is complete
  if (index === currentPhaseIndex + 1 && isCurrentPhaseComplete) {
    setCurrentPhaseIndex(index);
    return;
  }
  
  // Otherwise: silently ignore (phase not yet reachable)
};
```

---

## 6. Condition Default Change

### 6.1 Change

`INITIAL_FORM_DATA.condition` changes from `'good'` to `null`.

**File:** `lib/hooks/useListingForm.ts`

```typescript
// Before:
condition: 'good',

// After:
condition: null,
```

### 6.2 Rationale

With condition pre-selected as "good," the Condition & Photos section on desktop would show "✓ Complete" from the moment the form loads — before the user has even seen it. This is misleading and defeats progressive disclosure. On mobile, the Continue button would be enabled without the user making a conscious choice.

Requiring active selection ensures sellers consciously assess their game's condition. Most will still pick "good," but the act of choosing makes the listing more intentional.

### 6.3 Impact on Validation

The `isMarketComplete` function already checks `!!formData.condition`, which returns `false` for `null`. No validation logic changes needed.

The `ConditionSelector` component accepts `null` and renders with no tab active. No changes needed.

The `PricingAssistant` condition multiplier falls back to `0.7` when condition is null (line 144: `const multiplier = condition ? conditionMultipliers[condition] || 0.7 : 0.7`). The suggested price label won't show ("Suggested price for [condition]" requires `condition` to be truthy). This is acceptable — on desktop, pricing section is disabled until condition is set. On mobile, pricing phase comes after condition is selected.

### 6.4 Impact on Drafts

Old drafts (v1 and v2) that have `condition: 'good'` will load with condition pre-selected. This is correct — the user actively chose "good" when they created the draft. Only new forms start with `null`.

---

## 7. Photo Requirements Revert

### 7.1 Change

Photos revert to optional for all conditions except "acceptable."

**File:** `lib/hooks/usePhaseFlow.ts`

```typescript
// Before:
function isActionComplete(formData, existingPhotoUrls) {
  return formData.photos.length >= 1 || existingPhotoUrls.length >= 1;
}

// After (for mobile — photos are now in Market Phase):
function isMarketComplete(formData, existingPhotoUrls) {
  if (!formData.condition) return false;
  if (!formData.price || parseFloat(formData.price) <= 0) return false; // ← remove this, price is now in Action
  // Photos required only for acceptable condition
  if (formData.condition === 'acceptable') {
    if (formData.photos.length < 1 && existingPhotoUrls.length < 1) return false;
  }
  return true;
}
```

Note: Since photos move to Market Phase (with condition), the validation function for Market Phase must be updated. The Action Phase (now pricing) validation becomes:

```typescript
function isActionComplete(formData) {
  if (formData.pricingFormat === 'auction') {
    return !!formData.price && parseFloat(formData.price) >= 1.00 && !!formData.auctionDurationDays;
  }
  return !!formData.price && parseFloat(formData.price) > 0;
}
```

### 7.2 Desktop Equivalent

On desktop, the Condition & Photos section completion logic:

```typescript
const isConditionPhotosComplete = 
  !!formData.condition && 
  (formData.condition !== 'acceptable' || 
   formData.photos.length >= 1 || existingPhotoUrls.length >= 1);
```

### 7.3 Photo Upload Contextual Copy

The `PhotoUpload` component already has condition-aware text (line 184: `condition === 'acceptable' ? tGuidelines('requiredTitle') : tGuidelines('optionalTitle')`). No changes needed to the component itself.

---

## 8. Celebration Screen Removal

### 8.1 Change

Remove the `CelebrationScreen` from the publish success flow. Replace with:

1. On successful publish, `handlePublish` clears the draft and redirects to the listing page: `router.push(\`/game/${formData.selectedGame?.id}\`)` — matching edit mode's existing behavior.
2. Show a success toast after redirect using `addToast('success', ...)`. Message: "Your game is now in play" (reuse `Phases.celebrations.listingPublished`).
3. Achievement toasts (`first_turn`, `speed_round`) fire as separate toasts after a short delay. Store earned achievements in sessionStorage so the destination page can display them.

### 8.2 Files Affected

- `sell/page.tsx` — Remove `celebrationData` state, `CelebrationScreen` render, and `showSpeedRoundToast` logic. Replace with redirect + sessionStorage.
- `components/phases/CelebrationScreen.tsx` — Can be deleted entirely, or kept for potential future use.
- `components/phases/DieToken.tsx` — Only used by CelebrationScreen. Delete if CelebrationScreen is deleted.

### 8.3 Achievement Handling Post-Redirect

After publish, store achievements in sessionStorage:

```typescript
if (responseData.achievements?.length > 0) {
  sessionStorage.setItem('listing-achievements', JSON.stringify(responseData.achievements));
}
```

On the game detail page (or wherever the user lands), check for achievements on mount, display toasts, and clear sessionStorage. This requires a small addition to the game detail page component.

---

## 9. Draft System (v3)

### 9.1 Draft Data Structure

```typescript
interface DraftV3 {
  version: 3;
  formData: Partial<ListingFormData>; // photos stripped (File objects can't serialize)
  currentPhaseIndex: number;          // for mobile resume
  highestVisitedPhaseIndex: number;   // for mobile navigation
  completedPhaseIds: string[];
  flowStartTime: number;
  savedAt: number;                    // timestamp for display
  hadPhotos: boolean;                 // flag to show warning on restore
  termsAccepted: false;              // ALWAYS false — force re-acceptance on restore
}
```

### 9.2 Auto-Save Strategy

Debounce-save to localStorage every 3 seconds after any field change. No explicit "Save Draft" button in the main flow — just an auto-save indicator ("Draft saved" small text near the header, fades in/out). The Score Phase (mobile) and bottom bar (desktop) have a "Save & exit" link for explicit leave.

### 9.3 Save Implementation

```typescript
function prepareDraftForSave(
  formData: ListingFormData,
  currentPhaseIndex: number,
  highestVisitedPhaseIndex: number,
  completedPhaseIds: string[],
  flowStartTime: number,
): DraftV3 {
  // Strip File objects from photos — they can't be serialized
  const { photos, termsAccepted, ...serializableData } = formData;
  
  return {
    version: 3,
    formData: serializableData,
    currentPhaseIndex,
    highestVisitedPhaseIndex,
    completedPhaseIds,
    flowStartTime,
    savedAt: Date.now(),
    hadPhotos: photos.length > 0,
    termsAccepted: false, // Always force re-acceptance
  };
}
```

### 9.4 Load/Resume Behavior

When user navigates to `/sell` and a draft exists in localStorage:

1. Show banner: "You have an unfinished listing from [relative time]. Resume or start fresh?"
2. If draft had photos (`hadPhotos: true`), show additional note: "Photos will need to be re-added."
3. "Resume" loads form data, sets `termsAccepted: false`, and:
   - **Desktop:** Opens all sections with data, scrolls to the first incomplete section.
   - **Mobile:** Sets `currentPhaseIndex` from draft. Recalculates which phases are complete from the loaded form data (don't trust `completedPhaseIds` blindly — form data may have changed if draft is old). Sets `highestVisitedPhaseIndex` from draft.
4. "Start fresh" clears localStorage, resets form, starts from scratch.

### 9.5 Draft Conflict Resolution

If URL parameters `?relist=` or `?wantedListingId=` are present, ignore any existing draft entirely. Do not show the draft banner. Do not clear the draft silently (user might want it later). Just don't offer to load it.

### 9.6 Cross-Viewport Resume

A draft saved on mobile (with `currentPhaseIndex: 2`) loaded on desktop: the form data fills all sections, and the first incomplete section is scrolled into view. Phase index is ignored on desktop.

A draft saved on desktop loaded on mobile: recalculate which phases are complete from form data. Start at the first incomplete phase.

---

## 10. Edit Mode Fixes

### 10.1 Pricing Format Change (Bug Fix)

**Problem:** Edit mode's `handlePublish` only sends `condition`, `condition_notes`, `all_components_present`, `missing_components`, `price`, and `photo_urls`. It does not send `pricing_format` or any auction fields. The PATCH API endpoint doesn't accept them either.

**Frontend fix (`sell/page.tsx`, `EditModeSellContent.handlePublish`):**

Add pricing fields to the `updates` object:

```typescript
const updates = {
  photo_urls: allPhotoUrls,
  condition: formData.condition,
  condition_notes: formData.conditionNotes || null,
  all_components_present: formData.allComponentsPresent,
  missing_components: formData.missingComponents || null,
  price: parseFloat(formData.price),
  // NEW: pricing format and auction fields
  pricing_format: formData.pricingFormat,
  listing_type: formData.pricingFormat === 'auction' ? 'auction' : 'claim',
  ...(formData.pricingFormat === 'auction' ? {
    auction_duration_days: formData.auctionDurationDays,
    auction_end_strategy: formData.auctionEndStrategy,
    ...(formData.auctionEndStrategy === 'cooldown' ? {
      auction_cooldown_hours: formData.auctionCooldownHours,
    } : {}),
  } : {}),
};
```

**Backend fix (`app/api/listings/[id]/route.ts`, PATCH handler):**

Add pricing format handling with bid-count guard:

```typescript
// Pricing format change
if (body.pricing_format !== undefined) {
  const validFormats = ['fixed_price', 'auction'];
  if (!validFormats.includes(body.pricing_format)) {
    return NextResponse.json(
      { error: 'Invalid pricing format' },
      { status: 400 }
    );
  }

  // Fetch current listing to check bid count
  const { data: currentListing } = await supabase
    .from('listings')
    .select('auction_bid_count, pricing_format')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single();

  if (currentListing?.auction_bid_count > 0 && 
      body.pricing_format !== currentListing.pricing_format) {
    return NextResponse.json(
      { error: 'Cannot change pricing format after bids have been placed' },
      { status: 400 }
    );
  }

  updates.pricing_format = body.pricing_format;
  updates.listing_type = body.pricing_format === 'auction' ? 'auction' : 'claim';

  if (body.pricing_format === 'auction') {
    updates.auction_start_price = updates.price || parseFloat(body.price);
    updates.auction_duration_days = body.auction_duration_days;
    updates.auction_ends_at = new Date(
      Date.now() + (body.auction_duration_days || 3) * 24 * 60 * 60 * 1000
    ).toISOString();
    updates.auction_bid_count = 0;
    updates.auction_end_strategy = body.auction_end_strategy || 'fixed';
    if (body.auction_end_strategy === 'cooldown') {
      updates.auction_cooldown_hours = body.auction_cooldown_hours || 24;
    }
  } else {
    // Switching from auction to fixed — clear auction fields
    updates.auction_start_price = null;
    updates.auction_duration_days = null;
    updates.auction_ends_at = null;
    updates.auction_bid_count = null;
    updates.auction_end_strategy = null;
    updates.auction_cooldown_hours = null;
  }
}
```

Also add `pricing_format`, `listing_type`, and all `auction_*` fields to the `ListingUpdateFields` interface in the same file.

### 10.2 Bid Count Awareness in Edit UI

**Problem:** `mapListingToFormData` doesn't extract `auction_bid_count`, so the edit UI can't lock the pricing format selector for auctions with active bids.

**Fix:** Add `auction_bid_count` to the return value of `mapListingToFormData`:

```typescript
// In mapListingToFormData, add to the return object:
return {
  formData: { ... },
  photoUrls: (listing.photo_urls as string[]) || [],
  auctionBidCount: (listing.auction_bid_count as number) || 0, // NEW
};
```

In `EditModeSellContent`, pass `auctionBidCount` to the `PricingFormatSelector` which needs a new `disabled?: boolean` prop:

```tsx
<PricingFormatSelector
  value={formData.pricingFormat}
  onChange={(format) => setFormData((prev) => ({ ...prev, pricingFormat: format }))}
  disabled={auctionBidCount > 0}
  // ... other props
/>
```

When `disabled` is true, show a note below the selector: "Pricing format cannot be changed after bids have been placed."

---

## 11. Relist Mode

### 11.1 What It Is

Relist creates a new listing pre-filled from an existing (usually expired/removed auction) listing's data. It uses create mode layout (desktop scroll or mobile phases, depending on viewport).

### 11.2 When It's Available

- **UI:** `ListingActionsMenu` shows "Relist" only for removed auction listings (`status === 'removed' && isAuction`).
- **Email links:** Cron jobs for expired zero-bid auctions and expired auction payments send relist links to sellers.

### 11.3 Behavior

Relist loads the source listing's data via `mapListingToFormData` with `termsAccepted: false`. The user reviews and adjusts everything (game selection is editable, unlike edit mode). Expansions, condition, photos (existing URLs loaded), and pricing are all pre-filled.

On mobile, the form data pre-fill means multiple phases may already be complete. The flow should start at Phase 1 (Research) to let the user review everything, but all phases show as navigable in the PhaseTracker.

### 11.4 No Changes Needed

Relist works correctly as-is. The only consideration: when a relist URL is present, ignore any existing draft (see Section 9.5).

---

## 12. Edge Cases (All 22)

### Critical — Must handle before launch

**EC-1: Condition change to "acceptable" after passing photos on mobile.**

User completes Market Phase (condition = "good", no photos) → advances to Action Phase → advances to Score Phase. Goes back to Market Phase and changes condition to "acceptable." Photos are now required but Market Phase was already marked complete.

**Solution:** When condition changes, re-evaluate Market Phase completion. Remove `'market'` from `completedPhaseIds` if the phase is no longer complete (condition = "acceptable" and no photos). The PhaseTracker will show Market as incomplete, and the user must add a photo before the Score Phase becomes reachable again. Implement this as a `useEffect` in `usePhaseFlow` that watches `formData.condition` and `formData.photos.length`.

**EC-2: Draft photo serialization silently fails.**

`File` objects in `formData.photos` become `{}` in localStorage JSON. Draft loads with empty photos but `completedPhaseIds` still includes phases validated with photos.

**Solution:** Implemented in draft v3 spec (Section 9). Strip photos from draft, save `hadPhotos` flag, show restore warning. On restore, recalculate `completedPhaseIds` from actual form data rather than trusting the stored array.

**EC-3: Edit mode doesn't send pricing format changes to API.**

**Solution:** Implemented in Section 10.1. Both frontend and backend fixes described.

**EC-4: Edit mode has no bid-count awareness.**

**Solution:** Implemented in Section 10.2. Extract `auction_bid_count`, pass to UI, disable selector when bids > 0.

### High — Will confuse users

**EC-5: PricingAssistant shows generic suggestion when condition is null.**

On desktop, if pricing section somehow opens before condition is set (should be prevented by progressive disclosure, but defensively):

**Solution:** PricingAssistant already falls back gracefully (0.7 multiplier, no condition label). Additionally, on desktop the Pricing section is disabled until condition is set, so this can't happen in normal flow. On mobile, pricing phase comes after condition. No code change needed — the progressive disclosure/phase ordering handles it.

**EC-6: No price ceiling validation.**

Neither frontend nor API enforce a maximum price. €500 was the agreed MVP ceiling.

**Solution:** 
- Frontend: Add `max="500"` to price input in both MarketPhase/ActionPhase and edit mode. Show validation message if exceeded.
- API: Add server-side validation in POST and PATCH: `if (price > 500) return error`.
- For auctions: the ceiling applies to the starting bid. Final auction price has no ceiling (bidding can exceed €500).

**EC-7: Price not cleared when switching pricing format.**

Switching from fixed price (€0.50) to auction keeps the value, which fails auction's €1.00 minimum.

**Solution:** When pricing format changes, check if the current price meets the new format's minimum. If not, clear the price field. Show a brief inline note: "Starting bid must be at least €1.00."

```typescript
const handlePricingFormatChange = (format: PricingFormat) => {
  setFormData((prev) => {
    const newData = { ...prev, pricingFormat: format };
    // Clear price if it doesn't meet new format's minimum
    if (format === 'auction' && prev.price && parseFloat(prev.price) < 1.00) {
      newData.price = '';
    }
    return newData;
  });
};
```

**EC-8: Terms persistence in drafts.**

Terms of service may change between draft save and draft load. Prior acceptance shouldn't carry over.

**Solution:** Implemented in draft v3 spec (Section 9.1). `termsAccepted` is always stored as `false` and forced to `false` on restore.

**EC-9: Score Phase navigation trap.**

User reaches Score Phase, goes back, can't click Score in tracker because it's not in `completedPhaseIds`.

**Solution:** Implemented in Section 5.4. `highestVisitedPhaseIndex` allows navigation to any previously visited phase.

**EC-10: Desktop — no section gating.**

All sections expandable from start, user could jump to Pricing without selecting a game.

**Solution:** Implemented in Section 4.2. Sections start collapsed and disabled (new `disabled` prop on `CollapsibleSection`). Sections enable only when prerequisites are met.

**EC-11: Relist URL works for any listing ID.**

User could manually construct `/sell?relist={activeListingId}` and create a duplicate.

**Solution:** Accept this as low risk. The existing active listings warning fires (checks for same-game active listings). No blocking needed — duplicates are valid (different condition, different price). The `ListingActionsMenu` correctly restricts the UI entry point.

### Medium — Worth addressing

**EC-12: Email verification only checked at publish time.**

User fills entire form, blocked at end by unverified email.

**Solution:** Check email verification on sell page entry, before rendering the form. If `!user?.email_confirmed_at`, show a dedicated screen: "Verify your email to start listing" with a resend link. Don't render the form at all. This is a small addition to the `isCheckingOnboarding` logic.

**EC-13: Auth session expiry mid-flow.**

Long form session, session expires, publish returns 401.

**Solution:** In the publish error handler, detect 401 specifically. Auto-save draft, then redirect to login with a return URL: `/login?returnTo=/sell`. On return, the draft banner picks up where they left off.

**EC-14: Browser back button on mobile phases.**

Pressing browser back exits the sell page entirely on mobile.

**Solution (post-launch):** Use `history.pushState` to add phase entries to browser history. Intercept `popstate` to navigate to previous phase. For MVP, the auto-draft mitigates data loss. Flag as post-launch improvement.

**EC-15: Rate limit with no pre-flight check.**

Power seller hits 50/day limit after filling entire form.

**Solution (post-launch):** Fetch remaining rate limit on sell page load. Show warning banner when approaching limit. For MVP, the 429 error message is sufficient.

**EC-16: Expansion data loading after phase advance on mobile.**

User advances past Research Phase while expansions are still loading.

**Solution:** Expansions are optional and collapsed by default. The expansion toggle should show a loading indicator if the user opened it but data hasn't arrived. If the user advances without opening expansions, no issue. If they opened the toggle and data is loading, the Continue button should remain enabled (expansions don't affect Research Phase completion). Data continues loading in background and is available if user navigates back.

**EC-17: Wanted listing context doesn't auto-advance on mobile.**

Game is pre-selected from wanted listing but version isn't. User starts at Research Phase.

**Solution:** This is correct behavior. If only one version exists, `LanguageVersionSelector` already auto-selects it. If multiple versions exist, the user must choose. The Research Phase Continue button enables once version is selected. No change needed.

**EC-18: Photo upload makes mobile Market Phase long.**

Condition + completeness + notes + photos on one screen could require significant scrolling to reach Continue.

**Solution:** Make the Continue button sticky at the bottom of the viewport on mobile phases. Apply to all phases, not just Market. Use `sticky bottom-0` with a subtle top border and background blur.

### Informational — Noted for completeness

**EC-19: Expansion games listed standalone.**

Users can search for and list expansion games directly (as standalone listings, not as add-ons). The `isExpansion` badge shows in search results. This is intentional — some expansions are standalone-playable. No change needed.

**EC-20: `initialSearchQuery` param (`?q=`).**

Pre-fills BGG search field. Works with both layouts. No issues.

**EC-21: Locale in drafts.**

Drafts don't store locale. User-entered text (condition notes) stays in the language it was written in. This is expected behavior. No change needed.

**EC-22: `beforeunload` handler scope.**

Currently fires if `selectedGame`, `photos`, or `price` has data. With condition changing to `null`, the handler won't fire if user only selected a game. Add `selectedVersion` to the check:

```typescript
if (formData.selectedGame || formData.selectedVersion || formData.photos.length > 0 || formData.price) {
  e.preventDefault();
  e.returnValue = '';
}
```

---

## 13. Translation Keys

### 13.1 Phase Name Changes

Update the `Phases.listing` namespace:

```json
{
  "Phases": {
    "listing": {
      "market": {
        "name": "Market Phase",
        "subtitle": "Condition & photos",
        "completionMsg": "Details set! Name your price.",
        "shortName": "Market",
        "continueButton": "Continue →"
      },
      "action": {
        "name": "Action Phase",
        "subtitle": "Name your price",
        "completionMsg": "Price set! Final review.",
        "shortName": "Action",
        "continueButton": "Continue →"
      }
    }
  }
}
```

Research and Score phase names remain unchanged.

### 13.2 New Translation Keys

```json
{
  "Sell": {
    "sections": {
      "conditionPhotos": {
        "title": "Condition & Photos",
        "subtitle": "Grade your game and add photos"
      },
      "pricing": {
        "disabledHint": "Set a condition to unlock pricing"
      },
      "photos": {
        "skipButton": "Skip photos",
        "requiredForCondition": "At least one photo is required for this condition",
        "encouraged": "Photos help your listing sell faster"
      }
    },
    "price": {
      "commission": {
        "auctionFinalNote": "A 10% platform fee will be deducted from the final sale price. The starting bid is the minimum — your earnings depend on how high bidding goes.",
        "ifSoldAtStarting": "If sold at starting bid: you receive {amount}"
      },
      "validation": {
        "maxPrice": "Maximum price is €500",
        "auctionMinimum": "Starting bid must be at least €1.00"
      }
    },
    "draft": {
      "autoSaved": "Draft saved",
      "saveAndExit": "Save & exit",
      "photosWarning": "Photos will need to be re-added"
    },
    "edit": {
      "pricingFormatLocked": "Pricing format cannot be changed after bids have been placed"
    },
    "validation": {
      "emailRequired": "Please verify your email before listing a game",
      "conditionRequired": "Please select a condition to continue"
    }
  }
}
```

Latvian translations should follow for all new keys. Lithuanian and Estonian are out of scope for this PRD.

---

## 14. Implementation Phases

### 14.1 Suggested Order

**Phase A: Foundation changes (no layout work)**
1. Change `INITIAL_FORM_DATA.condition` to `null`
2. Add `disabled` prop to `CollapsibleSection`
3. Add `highestVisitedPhaseIndex` to `usePhaseFlow`
4. Fix `goToPhase` navigation logic
5. Update phase validation functions (photos move to market, pricing standalone)
6. Update `beforeunload` handler to include `selectedVersion`

**Phase B: Edit mode bug fixes**
1. Add pricing format fields to edit `handlePublish`
2. Add pricing format handling to PATCH API endpoint (with bid-count guard)
3. Add `auction_bid_count` extraction to `mapListingToFormData`
4. Add `disabled` prop to `PricingFormatSelector`
5. Add price ceiling validation (frontend + API)

**Phase C: Mobile phase restructure**
1. Restructure `MarketPhase` → condition + photos + phone
2. Restructure `ActionPhase` → pricing format + price + auction settings + commission
3. Update phase completion toast messages
4. Add sticky Continue button on mobile phases
5. Add condition-change watcher that re-evaluates completedPhaseIds (EC-1)
6. Add price format switch handler that clears invalid prices (EC-7)

**Phase D: Desktop create layout**
1. Create `DesktopCreateLayout` component using `CollapsibleSection` pattern
2. Wire progressive disclosure (section enable/disable based on prerequisites)
3. Add bottom bar with terms + publish + save draft
4. Wire to `useListingForm` (no phase flow needed)
5. Add viewport switching in `SellPageContent` (`hidden lg:block` / `lg:hidden`)

**Phase E: Draft system v3**
1. Update draft save/load functions to v3 format
2. Strip photos, add `hadPhotos` flag
3. Force `termsAccepted: false` on restore
4. Add auto-save debounce (3 seconds)
5. Add "Draft saved" indicator
6. Handle draft conflicts with relist/wanted URLs

**Phase F: Celebration removal & polish**
1. Remove `CelebrationScreen` from publish flow
2. Add redirect + success toast on publish
3. Add achievement sessionStorage handoff
4. Add email verification check on sell page entry (EC-12)
5. Add 401 detection in publish error handler (EC-13)
6. Update auction commission copy
7. Add all new translation keys (EN + LV)

### 14.2 Testing Checklist

**Desktop create flow:**
- [ ] Sell page loads with Game section expanded, others collapsed and disabled
- [ ] Searching and selecting a game + version enables Condition & Photos section
- [ ] Selecting a condition enables Pricing section
- [ ] Section headers show "✓ Complete" badge when complete
- [ ] Clicking a disabled section does nothing
- [ ] Publish button disabled until all requirements met
- [ ] Publish button shows validation modal if requirements incomplete
- [ ] Live preview sidebar updates as fields are filled
- [ ] Expansions toggle shows collapsed "Include expansions?" link

**Mobile create flow:**
- [ ] PhaseTracker renders with 4 phases
- [ ] Research Phase: Continue disabled until game + version selected
- [ ] Market Phase: Condition selector has no pre-selection, user must choose
- [ ] Market Phase: Photos section says "required" for acceptable, "encouraged" for others
- [ ] Market Phase: Continue requires photo for acceptable condition
- [ ] Action Phase: Pricing format selector works, auction settings show/hide
- [ ] Action Phase: Commission copy is contextual (fixed vs auction)
- [ ] Score Phase: Summary cards show all data with edit links
- [ ] Score Phase: Edit links navigate to correct phase
- [ ] Score Phase: Can navigate back and return via PhaseTracker (no trap)
- [ ] Continue button is sticky at viewport bottom on all phases

**Condition change edge case (EC-1):**
- [ ] Mobile: Select good → advance to Action → go back to Market → change to acceptable → Continue is disabled until photo added
- [ ] Desktop: Change condition from good to acceptable → Condition & Photos section shows incomplete

**Edit mode:**
- [ ] PricingFormatSelector renders and allows changes
- [ ] Changing from auction to fixed and saving persists the change
- [ ] Changing format is blocked if auction has bids > 0
- [ ] All editable fields save correctly on PATCH

**Draft system:**
- [ ] Auto-saves every 3 seconds after field change
- [ ] "Draft saved" indicator shows
- [ ] Closing and reopening sell page shows draft banner with relative time
- [ ] Resuming draft restores form data but not photos
- [ ] Photos warning shows if draft had photos
- [ ] Terms checkbox is unchecked on draft restore
- [ ] Relist URL ignores existing draft
- [ ] Wanted listing URL ignores existing draft
- [ ] Draft saved on mobile, loaded on desktop: sections fill correctly
- [ ] Draft saved on desktop, loaded on mobile: starts at first incomplete phase

**Celebration removal:**
- [ ] Successful publish redirects to game page
- [ ] Success toast shows on game page after redirect
- [ ] First listing achievement toast shows (if applicable)
- [ ] Speed round achievement toast shows (if applicable)

**Price validation:**
- [ ] Price > €500 shows error on both frontend and API
- [ ] Auction starting bid < €1 shows error
- [ ] Switching from fixed (€0.50) to auction clears price
- [ ] Auction commission shows contextual copy (not specific calculation)

---

## 15. Success Metrics

| Metric | How to measure | Target |
|--------|---------------|--------|
| Listing completion rate | Phase/section entry vs. publish | Improve from current baseline |
| Time to first listing | Account creation → first publish | Decrease (fewer required clicks on desktop) |
| Desktop vs mobile completion | Segment by viewport | Both should improve; mobile may lag due to more steps |
| Draft resume rate | Draft load → publish | >50% of resumed drafts complete |
| Edit mode pricing format changes | Count of PATCH requests with pricing_format | Verify the feature is used |

---

## 16. Files Affected Summary

### New files:
- None expected — restructure uses existing components

### Modified files:
| File | Changes |
|------|---------|
| `app/[locale]/sell/page.tsx` | Add viewport branching, desktop create layout, remove celebration, redirect on publish |
| `lib/hooks/usePhaseFlow.ts` | Add `highestVisitedPhaseIndex`, fix `goToPhase`, update phase validations, draft v3 |
| `lib/hooks/useListingForm.ts` | Change `condition` default to `null` |
| `components/sell/phases/MarketPhase.tsx` | Add photo upload, remove pricing, add phone prompt |
| `components/sell/phases/ActionPhase.tsx` | Replace photo upload with pricing components |
| `components/sell/phases/ScorePhase.tsx` | Update summary cards to reflect new phase contents |
| `components/sell/CollapsibleSection.tsx` | Add `disabled` prop |
| `components/sell/PricingFormatSelector.tsx` | Add `disabled` prop for bid-locked state |
| `app/api/listings/[id]/route.ts` | Add pricing_format handling to PATCH with bid-count guard |
| `app/api/listings/route.ts` | Add price ceiling validation |
| `messages/en.json` | New translation keys (Section 13) |
| `messages/lv.json` | Latvian translations for new keys |

### Files to delete (optional):
| File | Reason |
|------|--------|
| `components/phases/CelebrationScreen.tsx` | No longer used |
| `components/phases/DieToken.tsx` | Only used by CelebrationScreen |

---

*Every game deserves a second turn. Every seller deserves a flow that respects their time.*
