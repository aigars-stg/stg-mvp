# Step Reorganization: Logical Flow Separation

## Overview

Reorganized the listing creation flow to have clear logical separation between **selecting the game** and **providing details about it**.

## Changes

### Before:
```
Step 1: Game Selection
  ├─ Search game
  ├─ Select version
  └─ Describe condition ← This didn't belong here!

Step 2: Details & Photos
  ├─ Upload photos
  └─ Set pricing

Step 3: Review
```

### After:
```
Step 1: Game Selection
  ├─ Search game
  └─ Select version ✓ Just about WHICH game

Step 2: Details
  ├─ Describe condition
  ├─ Upload photos
  └─ Set pricing ✓ All details about the game

Step 3: Review
```

## Rationale

**Step 1** should answer the question: **"WHICH game are you selling?"**
- Game title
- Version/edition

**Step 2** should answer the question: **"WHAT is its condition and price?"**
- Condition (Like New, Good, etc.)
- Photos showing condition
- Price and shipping

**Step 3**: Final review before publishing

## User Experience Impact

### Flow Before:
1. Select game → Continue
2. Select version → Continue
3. Describe condition → Continue ← Extra step!
4. Upload photos + pricing → Continue
5. Review → Publish

### Flow After:
1. Select game + version → Continue
2. Condition + photos + pricing → Continue
3. Review → Publish

**Result:** Cleaner mental model - "select game" vs "describe game"

## Technical Changes

### 1. Step Validation ([sell/page.tsx:193-230](packages/marketplace/app/sell/page.tsx#L193-L230))

**Step 1 Validation:**
```typescript
if (currentStep === 1) {
  // Only need game and version selected
  return !!formData.selectedGame && !!formData.selectedVersion;
}
```

**Step 2 Validation:**
```typescript
if (currentStep === 2) {
  // Must have condition selected
  if (!formData.condition) {
    alert('Please select the condition of your game');
    return false;
  }
  // Must have at least 3 photos
  if (formData.photos.length < 3) {
    alert('Please upload at least 3 photos...');
    return false;
  }
  // Must have valid price
  // Must have shipping option
  // etc.
}
```

### 2. Moved Condition Section ([sell/page.tsx:292-345](packages/marketplace/app/sell/page.tsx#L292-L345))

**From:** Step 1 (after version selection)
**To:** Step 2 (first section)

Now Step 2 has three subsections:
1. **Condition** - What's the quality?
2. **Photos** - Show the condition
3. **Pricing & Shipping** - How much and how to ship?

Each subsection is separated by a border for visual clarity.

### 3. Updated Progress Labels ([sell/page.tsx:217-219](packages/marketplace/app/sell/page.tsx#L217-L219))

```typescript
{ id: 1, name: 'Game Selection' },  // Just about WHICH game
{ id: 2, name: 'Details' },         // All details about the game
{ id: 3, name: 'Review' },
```

## Progressive Disclosure Within Steps

### Step 1 (Game Selection):
```
Always: Game Search

When game selected: ↓
  Version Selection (language → version)

When version selected: ✓
  Continue button enabled
```

### Step 2 (Details):
All sections visible at once (no progressive disclosure):
- Condition section
- Photos section
- Pricing & Shipping section

User can fill in any order, but all must be completed to continue.

## Benefits

✅ **Clearer mental model** - Select game vs describe game
✅ **Logical grouping** - All "details" together
✅ **Better validation** - Step 1 doesn't care about condition
✅ **Fewer perceived steps** - Condition feels like part of details, not a separate action
✅ **Consistent with expectations** - "Game Selection" means selecting the game, not describing it

## Visual Hierarchy

### Step 2 Layout:
```
┌─────────────────────────────────────┐
│ Describe the condition              │
│ [Condition selector cards]          │
└─────────────────────────────────────┘
        ── Border Separator ──
┌─────────────────────────────────────┐
│ Upload photos                       │
│ [Photo upload grid]                 │
└─────────────────────────────────────┘
        ── Border Separator ──
┌─────────────────────────────────────┐
│ Pricing & Shipping                  │
│ [Price inputs, shipping options]    │
└─────────────────────────────────────┘
```

Each section has:
- Clear heading (h2)
- Descriptive subtitle
- Visual separation with border-t

## No Breaking Changes

- All form data structure remains the same
- All components unchanged
- Only reorganization of where things appear
- Validation updated to match new structure

## Future Considerations

Could add progressive disclosure to Step 2:
- Show Photos section only when condition selected
- Show Pricing only when 3+ photos uploaded

But for now, showing all sections at once is clearer and gives users flexibility to fill in any order.
