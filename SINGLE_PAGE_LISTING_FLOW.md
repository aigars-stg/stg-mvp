# Single-Page Listing Flow - Vinted-Style Redesign

## Overview

Redesigned the listing creation flow from a multi-step wizard to a single-page collapsible section layout, inspired by Vinted's UX while maintaining our game-specific features.

## Motivation

After reviewing Vinted's listing creation flow, we identified several UX improvements:
- ✅ **Single-page scroll** is more natural than multi-step navigation
- ✅ **Progressive disclosure** without forced navigation
- ✅ **Photos prioritized** earlier in the flow
- ✅ **All sections visible** at once (users can see what's needed)
- ✅ **Better mobile UX** (natural scrolling vs step navigation)
- ✅ **Faster completion** (no waiting for page transitions)

## What Changed

### Before (Multi-Step Wizard)
```
Step 1: Game Selection
  ↓ [Continue button]
Step 2: Details & Photos
  ↓ [Continue button]
Step 3: Review
  ↓ [Publish button]
```

**Issues:**
- Hidden sections - users don't know what's coming
- Multiple navigation clicks required
- Step counter takes screen space
- Back/Continue buttons can be confusing
- Review step felt redundant

### After (Single-Page Collapsible)
```
🎲 Find Your Game ✓
📸 Upload Photos ✓
⭐ Condition & Details ✓
💶 Pricing & Shipping ✓
💬 Additional Information (optional)
━━━━━━━━━━━━━━━━━
☑️ Accept Terms
[Publish Listing]
```

**Benefits:**
- All sections visible from the start
- Natural scroll flow
- Sections auto-expand when previous is complete
- One action button (Publish)
- Cleaner, more modern UI

## New Section Order

Reordered sections based on Vinted's priority and user flow:

1. **🎲 Find Your Game** (Required)
   - BGG search
   - Language/version selection
   - Preview card with game details

2. **📸 Upload Photos** (Required) - **MOVED UP**
   - Was in Step 2, now immediately after game selection
   - More engaging, visual-first approach
   - 3-8 photos required

3. **⭐ Condition & Details** (Required)
   - Condition selector with templates
   - Component completeness
   - Extras (sleeved, promos, etc.)

4. **💶 Pricing & Shipping** (Required)
   - Price and offers
   - Shipping options
   - Pickup location

5. **💬 Additional Information** (Optional) - **NEW SECTION**
   - Shipping notes
   - Why I'm selling
   - Always expanded (optional fields)

## New Components

### CollapsibleSection.tsx
Reusable component for each section with:
- **Visual states**: Complete (✓), Incomplete, Expanded/Collapsed
- **Auto-expansion**: Next incomplete section auto-expands
- **Icons & subtitles**: Clear visual hierarchy
- **Smooth animations**: Professional transitions

```tsx
<CollapsibleSection
  title="Upload Photos"
  icon="📸"
  isComplete={isPhotosSectionComplete}
  isExpanded={expandedSections.photos}
  onToggle={() => toggleSection('photos')}
  required
  subtitle="Add at least 3 quality photos"
>
  {/* Content */}
</CollapsibleSection>
```

**Features:**
- Green checkmark when complete
- Click header to expand/collapse
- Chevron icon indicates state
- Smooth height transitions
- Responsive padding

### PricingShippingSimple.tsx
Streamlined version of PricingShipping without optional text fields:
- Removed `shippingNotes` and `whySelling`
- These moved to "Additional Information" section
- Cleaner, focused on core pricing/shipping

## Progressive Disclosure Logic

Sections auto-expand based on completion state:

```typescript
useEffect(() => {
  const gameComplete = !!formData.selectedGame && !!formData.selectedVersion;
  const photosComplete = formData.photos.length >= 3;
  const conditionComplete = !!formData.condition;
  const pricingComplete = !!formData.price && /* ... */;

  setExpandedSections((prev) => ({
    ...prev,
    photos: gameComplete || prev.photos,
    condition: (gameComplete && photosComplete) || prev.condition,
    pricing: (gameComplete && photosComplete && conditionComplete) || prev.pricing,
    additional: true, // Always expanded (optional)
  }));
}, [/* dependencies */]);
```

**Behavior:**
1. Game section starts open
2. When game selected → Photos section auto-expands
3. When 3+ photos uploaded → Condition section auto-expands
4. When condition selected → Pricing section auto-expands
5. Additional Info always expanded (optional)

Users can also manually expand/collapse any section by clicking the header.

## Validation Changes

### Before: Step-Based Validation
```typescript
validateStep1() // On Continue click
validateStep2() // On Continue click
canContinue() // For button state
```

### After: Global Validation
```typescript
// Section completion checks (no side effects)
isGameSectionComplete()
isPhotosSectionComplete()
isConditionSectionComplete()
isPricingSectionComplete()

// Single validation on Publish
validateForPublish() // Shows specific alerts
canPublish() // For button state
```

**Benefits:**
- Single validation point (simpler logic)
- No premature alerts
- Better user feedback (knows exactly what's missing)

## Visual Improvements

### Vinted-Inspired Changes

**1. Cleaner Placeholders**
```typescript
// Before
"e.g., Moving abroad and downsizing collection, gaming preferences evolved, completed campaign..."

// After (Vinted-style)
"e.g. Downsizing my collection, prefer lighter games now"
```

**2. Card-Based Layout**
- Each section is a distinct card
- Complete sections have frost-ice border and background tint
- Consistent padding and spacing

**3. Clear Visual Hierarchy**
- Section icons (emoji) for quick scanning
- Completion checkmarks
- Required (*) indicators
- Subtitles explain purpose

**4. Mobile-First Design**
- Responsive padding (sm:px-6 px-4)
- Sticky publish button on mobile
- Touch-friendly click targets
- Smooth scrolling

## Files Created

### New Files
1. **`components/sell/CollapsibleSection.tsx`**
   - 106 lines
   - Reusable collapsible section component
   - Handles expansion state, completion state, animations

2. **`components/sell/PricingShippingSimple.tsx`**
   - 193 lines
   - Simplified pricing/shipping (no optional text fields)
   - Focused on core price and shipping options

### Modified Files
3. **`app/sell/page.tsx`** (completely rewritten)
   - Removed multi-step wizard (currentStep state)
   - Added section expansion states
   - Implemented progressive disclosure
   - Single Publish button with unified validation
   - New section order

### Backup Files
4. **`app/sell/page-old.tsx`** - Backup of original multi-step version
5. **`app/sell/page-v2.tsx`** - Development version (same as new page.tsx)

## Breaking Changes

**None** - All changes are UI/UX improvements:
- ✅ Form data structure unchanged
- ✅ All components still work
- ✅ Draft loading/saving works
- ✅ Validation logic maintained
- ✅ No API changes

## User Impact

### Positive Changes
1. ✅ **Faster listing creation** - No waiting for page transitions
2. ✅ **Better visibility** - See all requirements upfront
3. ✅ **More control** - Expand/collapse sections at will
4. ✅ **Clearer progress** - Visual checkmarks show completion
5. ✅ **Mobile-friendly** - Natural scroll vs navigation buttons
6. ✅ **Less cognitive load** - No "which step am I on?" confusion

### What Users Will Notice
- No more step counter (1 → 2 → 3)
- No more "Continue" buttons between sections
- Sections expand automatically as they complete
- All sections visible from start (can jump ahead if they want)
- Single "Publish Listing" button

## Technical Details

### State Management
```typescript
// Before: Step-based
const [currentStep, setCurrentStep] = useState(1);

// After: Section expansion
const [expandedSections, setExpandedSections] = useState({
  game: true,
  photos: false,
  condition: false,
  pricing: false,
  additional: false,
});
```

### Draft Saving
No changes to draft saving logic:
- Still saves to localStorage
- Still merges with INITIAL_FORM_DATA
- Still warns before leaving page
- ~~Removed `currentStep` from saved data~~ (not needed anymore)

### Performance
- **No performance impact** - Same number of components rendered
- **Slightly better** - No step navigation re-renders
- **Smooth animations** - CSS transitions (hardware accelerated)

## Comparison with Vinted

### What We Adopted ✅
1. ✅ Single-page scroll layout
2. ✅ Photos early in flow
3. ✅ Clean card-based sections
4. ✅ Simple, helpful placeholders
5. ✅ One publish button
6. ✅ Optional section for additional info

### What We Kept Unique 🎯
1. 🎯 BGG search (our key differentiator)
2. 🎯 Version/language selection (game-specific)
3. 🎯 Auto-select single versions
4. 🎯 Game preview card
5. 🎯 Condition templates (board game-specific)
6. 🎯 Component completeness checks

### Why This Works
Vinted's approach works for generic items (clothes, accessories) where users write titles and descriptions. Our approach works for board games where:
- Games have standardized data (BGG)
- Versions and editions matter
- Condition details are game-specific
- Users benefit from structured guidance

We get Vinted's UX simplicity while maintaining our game marketplace specialization.

## Migration Notes

### For Developers
Old multi-step page backed up at `app/sell/page-old.tsx` if needed for reference.

**To revert:**
```bash
cd packages/marketplace/app/sell
cp page-old.tsx page.tsx
```

### For Users
No migration needed - drafts from old version will load correctly (same data structure).

## Future Enhancements

Potential improvements based on this new structure:

1. **Section completion progress bar**
   - Show "3/4 sections complete" at top
   - Visual progress indicator

2. **Auto-save indicators**
   - "Saving..." indicator when draft updates
   - "Saved ✓" confirmation

3. **Keyboard navigation**
   - Tab to next section
   - Enter to expand/collapse

4. **Smart expansion**
   - Remember user's expansion preferences
   - Don't auto-collapse sections user opened manually

5. **Section anchors**
   - Deep links to specific sections
   - #photos, #pricing, etc.

## Testing Checklist

- [x] Game selection works
- [x] Version auto-select works
- [x] Photos upload (3-8 photos)
- [x] Condition selector with templates
- [x] Pricing and shipping
- [x] Optional fields (shipping notes, why selling)
- [x] Terms acceptance required
- [x] Validation shows correct errors
- [x] Draft saving/loading works
- [x] Progressive disclosure expands sections
- [x] Manual expand/collapse works
- [x] Mobile responsive
- [x] TypeScript compilation
- [x] No runtime errors

## Summary

Successfully redesigned the listing flow from a 3-step wizard to a single-page collapsible section layout inspired by Vinted. The new design is:
- **Simpler** - One page, natural scroll
- **Faster** - No navigation between steps
- **Clearer** - All requirements visible upfront
- **Smarter** - Auto-expands next section
- **Modern** - Follows current marketplace UX patterns

While maintaining:
- **Game-specific features** - BGG integration, versions, editions
- **Data structure** - No breaking changes
- **Validation** - All checks still in place
- **Draft system** - Save and resume works
- **Mobile UX** - Responsive design

Result: Vinted's simplicity + our board game specialization = Best of both worlds! 🎉
