# Game Selection Preview Component

## Overview

Added a visual preview card that appears after the user selects a game version in Step 1. This shows users exactly how their listing will look, providing confirmation they selected the correct game and building anticipation for the complete listing.

## User Experience Flow

### Before (No Preview)
```
1. Search game → Select version
2. Click Continue
3. See empty Step 2 form
```
**Problem:** No visual confirmation, user unsure if they selected correctly

### After (With Preview)
```
1. Search game → Select version
2. See listing card preview ✨
   - Game cover
   - Title, language, publisher, year
   - "Preview" badge
3. Click Continue with confidence
```
**Benefit:** Visual confirmation + see what buyers will see

## Component Design

### File: `GameSelectionPreview.tsx`

**Location:** [packages/marketplace/components/sell/GameSelectionPreview.tsx](packages/marketplace/components/sell/GameSelectionPreview.tsx)

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ ───── Your listing preview ─────                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  Wingspan                            │
│  │   GAME   │  Languages: 🇬🇧 English / 🇩🇪 German │
│  │   COVER  │  Edition: English/German edition     │
│  │ [Preview]│  Publisher: Stonemaier Games         │
│  └──────────┘  Year: 2019                          │
│                Product Code: STM900                 │
│                                                     │
│                ℹ️ Next, you'll add photos, describe │
│                   condition, and set your price...  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key Features

**1. Game Cover Display**
- Uses version image if available
- Falls back to game image/thumbnail
- Placeholder icon if no image
- "Preview" badge overlay

**2. Complete Version Information**
- **Languages:** Shows all languages with flags (e.g., 🇬🇧 English / 🇩🇪 German)
- **Edition:** Version name if different from game name
- **Publisher:** From version data
- **Year:** Version year or game year
- **Product Code:** Helps users confirm correct version

**3. Visual Hierarchy**
```
[Decorative divider line]
"Your listing preview"
[Decorative divider line]

[Card with frost-ice border]
  [Game Cover]  [Details]

[Next steps hint]
```

**4. Progressive Enhancement**
- Only appears when version is selected
- Smooth fade-in animation
- Responsive layout (vertical on mobile, horizontal on desktop)

## Data Flow

### Props
```typescript
interface GameSelectionPreviewProps {
  game: BGGGame;      // Main game data (title, year, image)
  version: BGGVersion; // Version-specific data (language, publisher, etc.)
}
```

### Data Priority
```typescript
// Image selection
const imageUrl =
  version.image ||      // 1. Version image (best)
  version.thumbnail ||  // 2. Version thumbnail
  game.image ||         // 3. Game image
  game.thumbnail;       // 4. Game thumbnail

// Year selection
version.yearPublished || game.yearPublished

// Languages
version.languages || version.language // Array or single
```

## Implementation

### Integration Point

**File:** [packages/marketplace/app/sell/page.tsx:323-329](packages/marketplace/app/sell/page.tsx#L323-L329)

```typescript
<LanguageVersionSelector ... />

{/* Preview - Appears when version is selected */}
{formData.selectedVersion && (
  <GameSelectionPreview
    game={formData.selectedGame}
    version={formData.selectedVersion}
  />
)}
```

### Conditional Rendering

**Appears when:**
- ✅ Game selected (`formData.selectedGame`)
- ✅ Version selected (`formData.selectedVersion`)

**Hidden when:**
- ❌ No game selected
- ❌ Game selected but no version yet

## Responsive Design

### Mobile (<640px)
```
┌──────────────────┐
│ Your listing     │
│ preview          │
├──────────────────┤
│                  │
│   [Game Cover]   │
│    [Preview]     │
│                  │
├──────────────────┤
│  Game Title      │
│  Language: 🇬🇧 EN│
│  Publisher: X    │
│  Year: 2020      │
│                  │
│  ℹ️ Next steps...│
└──────────────────┘
```
- Vertical layout
- Full-width cover image
- Stacked details below

### Desktop (≥640px)
```
┌──────────────────────────────────────┐
│ ──── Your listing preview ────       │
├──────────────────────────────────────┤
│ ┌────────┐  Game Title              │
│ │ COVER  │  Languages: 🇬🇧 EN / 🇩🇪 DE│
│ │[Preview]│  Publisher: X             │
│ └────────┘  Year: 2020                │
│              ℹ️ Next steps...         │
└──────────────────────────────────────┘
```
- Horizontal layout
- Cover on left (192px width)
- Details on right (flex-1)

## Styling Details

### Border & Accent
```typescript
className="border-2 border-frost-ice/20"
```
- 2px border with frost-ice color at 20% opacity
- Distinguishes preview from other content
- Matches design system accent color

### Preview Badge
```typescript
<div className="absolute top-2 right-2 px-2 py-1 bg-frost-ice text-snow-white text-xs font-semibold rounded">
  Preview
</div>
```
- Positioned on game cover
- Makes it clear this is not final
- Matches theme colors

### Decorative Divider
```typescript
<div className="h-1 flex-1 bg-gradient-to-r from-frost-ice to-transparent rounded" />
<span className="text-sm font-medium text-text-muted">Your listing preview</span>
<div className="h-1 flex-1 bg-gradient-to-l from-frost-ice to-transparent rounded" />
```
- Gradient lines fade out
- Centers text nicely
- Draws attention to preview

### Next Steps Hint
```typescript
<div className="mt-4 pt-4 border-t border-border-subtle">
  <p className="text-xs text-text-muted flex items-start gap-2">
    <svg>...</svg> {/* Info icon */}
    <span>Next, you'll add photos, describe condition...</span>
  </p>
</div>
```
- Helps user understand flow
- Info icon for visual interest
- Subtle styling (muted text)

## Benefits

### 1. Visual Confirmation ✅
Users see exactly what they selected:
- Correct game cover
- Right edition/language
- Publisher matches their box
- Year matches their version

### 2. Build Confidence 💪
- "Yes, this is my game!"
- Reduces selection errors
- Encourages completion

### 3. Set Expectations 🎯
- Shows what buyers will see
- Previews final listing appearance
- Makes abstract process concrete

### 4. Progressive Revelation 🌟
Step 1 creates the "skeleton":
```
[Game Cover] Game Title
             Languages
             Publisher
             Year
```

Step 2 adds condition & photos:
```
[Game Photos] Game Title
              Condition: Like New ✨
              Languages
              €45 + shipping
```

Step 3 is final review with everything.

## Accessibility

**Screen Readers:**
```html
<img src="..." alt={game.name} />
```
- Descriptive alt text for cover
- Semantic HTML structure

**Keyboard Navigation:**
- All information is visible (not interactive)
- User can tab past to Continue button

**Color Contrast:**
- Text colors meet WCAG AA standards
- Border visible but not overwhelming

## Edge Cases Handled

### 1. No Image Available
```typescript
{imageUrl ? (
  <img src={imageUrl} alt={game.name} />
) : (
  <div className="flex items-center justify-center">
    <svg>📷 Icon</svg>
  </div>
)}
```
Shows placeholder icon instead of broken image.

### 2. No Languages Data
```typescript
{version.languages && version.languages.length > 0 ? (
  // Show multiple languages
) : version.language ? (
  // Show single language
) : null}
```
Gracefully handles missing language data.

### 3. Version Name Same as Game
```typescript
{version.name && version.name !== game.name && (
  <div>Edition: {version.name}</div>
)}
```
Only shows edition if it's different from game name.

### 4. Missing Optional Fields
- Publisher: Only shown if exists
- Product Code: Only shown if exists
- Year: Falls back to game year

## Future Enhancements

### Option 1: Edit Button
Add button to change selection:
```typescript
<Button variant="ghost" onClick={() => setFormData(...)}>
  Change Version
</Button>
```

### Option 2: More Game Info
Show additional details:
- Player count (2-4 players)
- Playing time (30-60 min)
- BGG rating

### Option 3: Comparison
If multiple versions, show comparison:
```
Selected: English (2019)
Also available: German (2020), French (2019)
```

### Option 4: Save as Image
Allow user to download preview:
```typescript
<Button onClick={downloadAsImage}>
  Save Preview
</Button>
```

## Testing Checklist

- [ ] Preview appears after version selection
- [ ] Preview hidden before version selected
- [ ] Game cover displays correctly
- [ ] Fallback image works if no cover
- [ ] All version info displays (language, publisher, year)
- [ ] Multiple languages show with flags
- [ ] "Preview" badge visible on cover
- [ ] Responsive on mobile (vertical layout)
- [ ] Responsive on desktop (horizontal layout)
- [ ] Next steps hint visible
- [ ] Smooth fade-in animation
- [ ] Border styling correct (frost-ice)

## Related Components

- **GameSearch:** Step 1 - Select game
- **LanguageVersionSelector:** Step 1 - Select version
- **GameSelectionPreview:** Step 1 - Confirm selection ← NEW
- **ConditionSelector:** Step 2 - Describe condition
- **PhotoUpload:** Step 2 - Add photos
- **ListingReview:** Step 3 - Final preview

## Visual Progression

**Step 1 Preview:**
```
[Cover] Title
        Language, Publisher, Year
        [Basic info only]
```

**Step 3 Final Preview:**
```
[Photos] Title
         Condition: Like New
         Language, Publisher, Year
         €45 + €5 shipping
         [Complete listing]
```

Shows the journey from selection to completion!
