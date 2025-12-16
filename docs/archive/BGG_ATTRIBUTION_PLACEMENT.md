# BGG Attribution Placement

## Visual Layout

### Desktop View (≥640px)

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Game Selection                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  What game are you selling?                             │
│  Search BoardGameGeek's database                        │
│  ┌────────────────────────────────┐                     │
│  │ [Search Input]                 │                     │
│  └────────────────────────────────┘                     │
│  [Search Results Grid]                                  │
│                                                          │
│  ─────────────────────────────────────                  │
│                                                          │
│  Which version do you have?                             │
│  Select the language first                              │
│  [Language Dropdown]                                    │
│  [Version Cards Grid]                                   │
│                                                          │
│  ─────────────────────────────────────                  │
│                                                          │
│                        ┌──────────────────────────────┐ │
│                        │  Powered by                  │ │
│                        │  BoardGameGeek            ↗ │ │
│                        └──────────────────────────────┘ │
│                              [Badge aligned right]      │
└──────────────────────────────────────────────────────────┘
```

### Mobile View (<640px)

```
┌────────────────────────┐
│  Step 1: Game Select   │
├────────────────────────┤
│                        │
│  What game?            │
│  ┌──────────────────┐  │
│  │ [Search Input]   │  │
│  └──────────────────┘  │
│                        │
│  [Search Results]      │
│                        │
│  ────────────────────  │
│                        │
│  Which version?        │
│  [Language Dropdown]   │
│  [Version Cards]       │
│                        │
│  ────────────────────  │
│                        │
│  ┌──────────────────┐  │
│  │  Powered by      │  │
│  │  BoardGameGeek↗ │  │
│  └──────────────────┘  │
│   [Badge centered]     │
└────────────────────────┘
```

## Placement Rationale

### Why Bottom of Step 1?

✅ **Visible but Non-Intrusive**
- Appears after user has interacted with BGG data
- Doesn't interfere with primary actions
- Clear visual separation with border

✅ **Contextually Relevant**
- Directly after using BGG search and version data
- User understands where the data comes from

✅ **Works with Progressive Disclosure**
- Always visible once Step 1 is active
- Doesn't require scrolling to see

✅ **Responsive**
- Mobile: Centered (easy to tap)
- Desktop: Right-aligned (out of main flow)

### Alternative Placements Considered

#### ❌ Top of Page
**Pros:** Most visible
**Cons:** Takes space before user needs info, feels like ad

#### ❌ Inside Search Results
**Pros:** Right next to BGG data
**Cons:** Clutters results, distracts from selection

#### ❌ Footer of Entire Page
**Pros:** Standard placement for attributions
**Cons:** User might not see it, less clear connection to BGG data

#### ✅ Bottom of Step 1 (Chosen)
**Pros:** Visible, contextual, non-intrusive, responsive
**Cons:** None significant

## Interaction Design

### Default State
```
┌──────────────────────┐
│  Powered by          │
│  BoardGameGeek    ↗ │
└──────────────────────┘
```
- Subtle gray text
- Light background
- Small external link icon

### Hover State
```
┌──────────────────────┐
│  Powered by          │  ← Darker text
│  BoardGameGeek    ↗ │  ← Blue highlight
└──────────────────────┘
    ↑ Elevated background
```
- Text becomes darker
- "BoardGameGeek" turns blue (frost-ice)
- Background elevates
- Cursor: pointer

### Click Behavior
- Opens BoardGameGeek.com in new tab
- Returns to your page (no navigation away)

## Accessibility

**Screen Readers:**
```html
<a
  href="https://boardgamegeek.com/"
  title="Game data provided by BoardGameGeek"
  ...
>
```
- Clear link purpose
- Descriptive title attribute
- Standard external link pattern

**Keyboard Navigation:**
- Focusable with Tab
- Activatable with Enter/Space
- Clear focus indicator

**Touch Targets:**
- Mobile: 44px × 36px (minimum)
- Desktop: 48px × 40px
- Good spacing from edges

## CSS Implementation

```typescript
className="
  mt-8              // Top margin from content
  pt-6              // Padding above border
  border-t          // Top separator line
  border-border-subtle
  flex              // Flexbox for alignment
  justify-center    // Center on mobile
  sm:justify-end    // Right align on desktop
"
```

**Badge Styles:**
```typescript
className="
  inline-flex items-center gap-2
  px-4 py-2
  rounded-lg
  bg-bg-secondary          // Light background
  hover:bg-bg-elevated     // Elevated on hover
  transition-all
  group                     // For grouped hover effects
"
```

## Future Enhancements

### Option 1: Tooltip
Add tooltip explaining BGG's role:
```
[Hover]
  ↓
┌─────────────────────────┐
│ Game information from   │
│ BoardGameGeek's         │
│ community database      │
└─────────────────────────┘
```

### Option 2: Animated Icon
Subtle animation on hover:
```typescript
<svg className="group-hover:scale-110 transition-transform">
  {/* External link icon */}
</svg>
```

### Option 3: Stats Badge
Show cache status (optional):
```
Powered by BoardGameGeek
[Cached 2h ago]
```

## Compliance Verification

✅ **Required Elements:**
- [x] Text: "Powered by BoardGameGeek"
- [x] Link to BoardGameGeek.com
- [x] Visible in public-facing use
- [x] Works on all screen sizes

✅ **Best Practices:**
- [x] Opens in new tab
- [x] Non-intrusive placement
- [x] Clear hover state
- [x] Accessible markup
- [x] Responsive design

## Testing Checklist

- [ ] Badge visible on mobile (320px width)
- [ ] Badge visible on tablet (768px width)
- [ ] Badge visible on desktop (1920px width)
- [ ] Link opens BoardGameGeek.com
- [ ] Link opens in new tab
- [ ] Hover effects work smoothly
- [ ] Touch target adequate on mobile
- [ ] Screen reader announces link correctly
- [ ] Keyboard navigation works
- [ ] Badge doesn't overlap content
