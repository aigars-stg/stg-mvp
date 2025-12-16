# Language-First Version Selection Implementation

## Overview

Implemented a smart version selection flow that combines **simplified UX** with **rich BGG data** by letting users filter by language first.

## User Flow

1. **Search Game** (always visible)
2. **Select Language** (appears when game selected)
   - Dropdown populated with actual languages from BGG versions
   - Shows count of available languages
3. **Select Version** (appears when language selected)
   - Shows only versions in the selected language
   - Each card displays full BGG data: name, publisher, year, product code
   - Visual selection with checkmark
4. **Describe Condition** (appears when version selected)

## Benefits

✅ **Simplified UX**: Users start with what they know (language)
✅ **Rich Data**: All BGG version metadata preserved
✅ **Focused Selection**: Version list filtered down significantly
✅ **Progressive Disclosure**: Sections appear smoothly as user progresses
✅ **No Data Loss**: Full publisher, year, product code information maintained

## Implementation Details

### New Component: `LanguageVersionSelector.tsx`

**Key Features:**
- Fetches versions using `getGameVersions(game.id)` from BGG API
- Extracts unique languages from versions dynamically
- Filters versions by selected language
- Loading state while fetching from BGG
- Fallback for games without version data
- Language flags using `getLanguageFlag()` helper

**Props:**
```typescript
interface LanguageVersionSelectorProps {
  game: BGGGame;
  selectedVersion: BGGVersion | null;
  onSelect: (version: BGGVersion) => void;
}
```

### Updated Files:

1. **`/sell/page.tsx`**
   - Changed import from `SimplifiedVersionSelector` to `LanguageVersionSelector`
   - Reverted form data to use `selectedVersion: BGGVersion | null`
   - Updated progressive disclosure logic
   - Updated validation to require `selectedVersion`

2. **`ListingReview.tsx`**
   - Reverted to display `selectedVersion` data
   - Shows version name, publisher, language, year
   - Displays all BGG metadata in expandable sections

3. **`tailwind.config.ts`**
   - Added `fade-in` animation for progressive disclosure

## Progressive Disclosure Logic

```typescript
{/* Section 1: Game Search - Always visible */}
<GameSearch ... />

{/* Section 2: Version - Appears when game selected */}
{formData.selectedGame && (
  <LanguageVersionSelector ... />
)}

{/* Section 3: Condition - Appears when version selected */}
{formData.selectedGame && formData.selectedVersion && (
  <ConditionSelector ... />
)}
```

## Example: User Selecting Wingspan

1. User searches "Wingspan"
2. Language dropdown shows: English, German, Spanish, Polish, etc.
3. User selects "English"
4. 12 versions appear (filtered from 40+ total)
5. User clicks "Stonemaier Games - English - 2019"
6. Condition section appears below

## Edge Cases Handled

- **No versions available**: Shows friendly message with "Continue Without Version" button
- **Loading state**: Spinner with helpful text
- **Single language**: Dropdown still shown for consistency
- **No language data**: Version still appears if it has other useful info

## Technical Notes

- BGG API fetched via `getGameVersions(gameId)`
- Versions cached for 24 hours
- Language extraction done client-side via `useMemo`
- Version filtering reactive to language selection
- Full TypeScript type safety maintained

## Validation

**Step 1 Continue Button Enabled When:**
- ✅ Game selected
- ✅ Version selected
- ✅ Condition selected

## Future Enhancements

- [ ] Add "Skip version selection" button for users who don't care
- [ ] Pre-select language based on user's location
- [ ] Show version thumbnails if available
- [ ] Add search/filter within version list for games with 50+ versions
