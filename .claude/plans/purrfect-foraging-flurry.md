# Plan: WCAG 2.1 AA Accessibility Improvements

## Context

The accessibility audit (`docs/ACCESSIBILITY-AUDIT.md`, Jan 2025) deferred 8 enhancement recommendations. The EU Accessibility Act enforcement date (June 28, 2025) has passed. This plan addresses the 4 highest-impact code changes from the audit. Testing-only items (High Contrast Mode, screen reader user testing, automated tooling) and feature-level changes (undo for destructive actions) are out of scope.

**Findings from codebase exploration:**
- **Zero** `prefers-reduced-motion` support anywhere in the codebase
- **6 overlay components** missing focus trapping (ActionSheet, Dropdown, ImageLightbox, MobileFilterDrawer, SellActionSheet, CookieConsent)
- **Product image alt text** uses only game name — no condition or context
- **Decorative icons** inconsistently marked with `aria-hidden="true"`

---

## Workstream 1: Reduced Motion Support

**Impact: High** — Affects users with vestibular disorders; zero current support.

### 1.1 Global CSS reduce-motion rule
**File:** [globals.css](packages/marketplace/app/globals.css)

Add at the top level:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
This is the standard CSS-reset approach. It blanket-disables CSS animations and transitions for users who set "Reduce motion" in their OS. Covers all Tailwind `animate-*` and `transition-*` classes automatically.

### 1.2 JS-driven animation hook
**New file:** [useReducedMotion.ts](packages/marketplace/hooks/useReducedMotion.ts)

```ts
export function useReducedMotion(): boolean {
  // matchMedia('(prefers-reduced-motion: reduce)')
  // Returns true when user prefers reduced motion
}
```

### 1.3 Apply hook to JS-driven animations (3 files)
- [useSwipeNavigation.ts](packages/marketplace/hooks/useSwipeNavigation.ts) — skip `transform` transition and `navigator.vibrate()` when reduced motion
- [SwipeToDelete.tsx](packages/marketplace/components/common/SwipeToDelete.tsx) — skip slide animation, show delete button immediately
- [GameSearch.tsx](packages/marketplace/components/sell/GameSearch.tsx) — disable `pulse-border` inline `@keyframes` animation

### 1.4 Disable infinite pulse on ReservationTimer
**File:** [ReservationTimer.tsx](packages/marketplace/components/checkout/ReservationTimer.tsx)

Replace `animate-pulse` with `motion-safe:animate-pulse` so Tailwind auto-skips it for reduced-motion users (this is more targeted than the global rule for a component that conveys urgency via color too).

---

## Workstream 2: Focus Trapping for Overlays

**Impact: High** — Keyboard-only users can Tab out of modals into hidden content.

### 2.1 Extract reusable `useFocusTrap` hook
**New file:** [packages/design-system/src/hooks/useFocusTrap.ts](packages/design-system/src/hooks/useFocusTrap.ts)

Extract the existing focus trap logic from [Modal.tsx](packages/design-system/src/components/Modal/Modal.tsx) (lines 94-163) into a reusable hook:
```ts
export function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement>): void
```
Handles: Tab/Shift+Tab boundary wrapping, focus-first-element on open, restore-previous-element on close, body scroll lock.

### 2.2 Refactor Modal and SlidePanel to use the hook
- [Modal.tsx](packages/design-system/src/components/Modal/Modal.tsx) — replace inline focus trap with `useFocusTrap`
- [SlidePanel.tsx](packages/design-system/src/components/SlidePanel/SlidePanel.tsx) — same refactor

Behavior must remain identical — this is a pure refactor.

### 2.3 Add focus trapping to ActionSheet
**File:** [ActionSheet.tsx](packages/design-system/src/components/ActionSheet/ActionSheet.tsx)

Add `useFocusTrap(isOpen, containerRef)`. Already has `role="dialog"` and `aria-modal="true"`.

### 2.4 Add focus trapping to ImageLightbox
**File:** [ImageLightbox.tsx](packages/marketplace/components/listing/ImageLightbox.tsx)

Add `useFocusTrap`. Already handles Escape and arrow keys. Needs: Tab boundary wrapping, focus restoration on close.

### 2.5 Refactor MobileFilterDrawer to use SlidePanel
**File:** [MobileFilterDrawer.tsx](packages/marketplace/components/browse/MobileFilterDrawer.tsx)

Currently a custom implementation missing Escape handling, scroll lock, and focus trapping. Refactor to wrap content in `<SlidePanel>` from the design system, which provides all three for free.

### 2.6 Refactor SellActionSheet to use ActionSheet
**File:** [SellActionSheet.tsx](packages/marketplace/components/layout/SellActionSheet.tsx)

Currently custom with partial Escape handling. Refactor to use `<ActionSheet>` from the design system (after 2.3 adds focus trapping).

### 2.7 Add keyboard support to Dropdown
**File:** [Dropdown.tsx](packages/design-system/src/components/Dropdown/Dropdown.tsx)

Menus need different behavior than modals — Tab should close the menu (not trap). Add:
- Arrow Up/Down to navigate between items
- Home/End to jump to first/last item
- Tab and Escape both close the menu
- Focus restoration to trigger on close

### 2.8 CookieConsent — no change needed
The cookie banner is a persistent, non-modal element with `aria-live="polite"`. WCAG does not require focus trapping for persistent banners. No action.

---

## Workstream 3: Image Alt Text Enhancement

**Impact: Medium** — Screen reader users get minimal context on product images.

### 3.1 Enhance product image alt text pattern
Update these files to include condition in alt text:

- [ListingCard.tsx](packages/marketplace/components/listing/ListingCard.tsx) — change `alt={listing.game_name}` to `alt={\`${listing.game_name} - ${conditionLabel}\`}`
- [OfferCard.tsx](packages/marketplace/components/game/OfferCard.tsx) — same pattern using the condition from the offer data
- [AggregatedGameCard.tsx](packages/marketplace/components/game/AggregatedGameCard.tsx) — stays as game name only (aggregated view has no single condition)

### 3.2 Improve message attachment alt text
**File:** [MessageBubble.tsx](packages/marketplace/components/messages/MessageBubble.tsx)

Change `"Attachment ${index + 1}"` to `"Photo ${index + 1}"` (all attachments are photos in the current system).

---

## Workstream 4: Decorative Icon Marking

**Impact: Low** — Screen readers may announce meaningless icon names.

### 4.1 Add `aria-hidden="true"` to metadata icons
In components where icons are used alongside text labels (player count, age, playtime), ensure all decorative icons have `aria-hidden="true"`:

- [ListingCard.tsx](packages/marketplace/components/listing/ListingCard.tsx) — Users, Clock, etc. icons in metadata row
- [OfferCard.tsx](packages/marketplace/components/game/OfferCard.tsx) — same pattern
- [AggregatedGameCard.tsx](packages/marketplace/components/game/AggregatedGameCard.tsx) — same pattern

Scan for other instances with: `grep -r "className=\"w-3" --include="*.tsx" | grep -v aria-hidden`

### 4.2 Update the audit document
**File:** [ACCESSIBILITY-AUDIT.md](docs/ACCESSIBILITY-AUDIT.md)

Update the "Recommendations" section to mark completed items and set the next review date.

---

## Verification

1. **Build:** `pnpm build:ds && pnpm build:marketplace && pnpm type-check && pnpm lint`
2. **Reduced motion:** In browser DevTools → Rendering → "Emulate prefers-reduced-motion: reduce" → verify no animations play
3. **Focus trapping:** Tab through each overlay (ActionSheet, ImageLightbox, MobileFilterDrawer, SellActionSheet, Dropdown) — focus must not escape behind the overlay
4. **Alt text:** Use browser DevTools to inspect `alt` attributes on listing cards — should include condition
5. **Decorative icons:** Run VoiceOver/screen reader on a listing card — icons should not be announced
6. **Tests:** `pnpm test` — all existing tests must still pass

---

## Execution Order

| Batch | Workstream | Estimated Files |
|-------|-----------|----------------|
| 1 | WS1: Reduced motion (1.1-1.4) | 5 files |
| 2 | WS2: Focus trap hook + Modal/SlidePanel refactor (2.1-2.2) | 3 files |
| 3 | WS2: Apply focus trap to overlays (2.3-2.7) | 5 files |
| 4 | WS3 + WS4: Alt text + icon marking (3.1-4.2) | ~7 files |
