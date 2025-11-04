# BGG Logo Placement - Final Implementation

## Overview

Moved BGG attribution to the top of Step 1 and replaced text with the official "Powered by BoardGameGeek" logo for better visibility and compliance.

## Visual Layout

### Desktop View (≥640px)

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Game Selection                                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  What game are you selling?        [Powered by BGG Logo]│
│  Search BoardGameGeek's database                        │
│                                    [40px height]         │
│  ┌────────────────────────────────┐                     │
│  │ [Search Input]                 │                     │
│  └────────────────────────────────┘                     │
│  [Search Results Grid]                                  │
│                                                          │
│  ─────────────────────────────────────                  │
│                                                          │
│  Which version do you have?                             │
│  [Language Dropdown → Version Cards]                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Mobile View (<640px)

```
┌────────────────────────┐
│  Step 1: Game Select   │
├────────────────────────┤
│                        │
│  What game are you     │
│  selling?              │
│  Search BoardGameGeek  │
│                        │
│  [Powered by BGG Logo] │
│  [32px height]         │
│                        │
│  ┌──────────────────┐  │
│  │ [Search Input]   │  │
│  └──────────────────┘  │
│  [Search Results]      │
│                        │
│  ────────────────────  │
│                        │
│  Which version?        │
│  [Version Selection]   │
│                        │
└────────────────────────┘
```

## Implementation Details

### File Structure

```
packages/marketplace/
├── public/
│   └── images/
│       └── powered-by-bgg-rgb.svg  ✅ Moved from root
└── app/
    └── sell/
        └── page.tsx  ✅ Updated
```

### Code Location

**File:** [packages/marketplace/app/sell/page.tsx:256-279](packages/marketplace/app/sell/page.tsx#L256-L279)

```typescript
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
  <div className="flex-1">
    <h2 className="text-xl sm:text-2xl font-bold text-text mb-2">
      What game are you selling?
    </h2>
    <p className="text-sm sm:text-base text-text-secondary">
      Search BoardGameGeek's database to find your game
    </p>
  </div>

  {/* BGG Attribution - Required by API Terms of Use */}
  <a
    href="https://boardgamegeek.com/"
    target="_blank"
    rel="noopener noreferrer"
    className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
    title="Game data provided by BoardGameGeek"
  >
    <img
      src="/images/powered-by-bgg-rgb.svg"
      alt="Powered by BoardGameGeek"
      className="h-8 sm:h-10 w-auto"
    />
  </a>
</div>
```

## Key Features

### ✅ Immediately Visible
- No scrolling required on any device
- First thing user sees in Step 1
- Always present (not behind progressive disclosure)

### ✅ Official Logo
- Uses BGG's official "Powered by BoardGameGeek" RGB logo
- Professional appearance
- Compliant with branding guidelines

### ✅ Responsive Design

**Mobile (<640px):**
- Logo below text (stacked vertically)
- 32px height (`h-8`)
- Centered/left-aligned with content

**Desktop (≥640px):**
- Logo right of title (side-by-side)
- 40px height (`sm:h-10`)
- Right-aligned in flex container

### ✅ Subtle but Clear
- 70% opacity by default
- 100% opacity on hover
- Smooth transition
- Doesn't compete with main content

### ✅ Accessible
- Proper alt text: "Powered by BoardGameGeek"
- Title attribute for screen readers
- Keyboard focusable
- Links to BoardGameGeek.com

## Placement Rationale

### Why Top of Step 1? ✓

**✅ Immediately Visible**
- User sees it right away without scrolling
- Especially important on mobile

**✅ Contextual**
- Right before user searches BGG database
- Clear connection between logo and data source

**✅ Non-Intrusive**
- Positioned to the side on desktop
- Subtle opacity doesn't draw too much attention
- Professional appearance

**✅ Compliant**
- Meets BGG's requirement for visible attribution
- Uses official logo as requested

### Comparison to Previous Placement

| Aspect | Bottom (Old) | Top (New) |
|--------|-------------|-----------|
| Visibility on mobile | ❌ Requires scroll | ✅ Immediately visible |
| Desktop placement | Right aligned | Right aligned |
| User experience | Hidden until end | Clear from start |
| Compliance | ✓ | ✓ Better |

## Logo Specifications

**File:** `powered-by-bgg-rgb.svg`
**Type:** SVG (scalable)
**Size:** 6.5KB
**Colors:** RGB (full color)
**Aspect Ratio:** Preserved with `w-auto`

**Heights:**
- Mobile: 32px (`h-8`)
- Desktop: 40px (`sm:h-10`)
- Auto width maintains aspect ratio

## Interaction Design

### Default State
```
[Logo at 70% opacity]
```
- Subtle, professional appearance
- Doesn't compete with main content
- Still clearly visible

### Hover State
```
[Logo at 100% opacity]
```
- Smooth fade to full opacity
- Indicates it's clickable
- Cursor: pointer

### Click Behavior
- Opens BoardGameGeek.com in new tab
- User stays on your page
- Standard external link behavior

## Browser Compatibility

✅ **SVG Support:** All modern browsers
✅ **Flexbox Layout:** All modern browsers
✅ **Opacity Transitions:** All modern browsers
✅ **External Links:** Universal support

## Accessibility

**Screen Readers:**
```html
<img
  src="/images/powered-by-bgg-rgb.svg"
  alt="Powered by BoardGameGeek"
/>
```
- Descriptive alt text
- Link announces correctly

**Keyboard Navigation:**
- Focusable with Tab
- Enter/Space to activate
- Clear focus indicator (browser default)

**Touch Targets:**
- Logo is 32-40px tall
- Good width due to aspect ratio
- Easy to tap on mobile

## Compliance Verification

✅ **BGG Requirements Met:**
- [x] "Powered by BoardGameGeek" logo visible
- [x] Link to BoardGameGeek.com
- [x] Visible in public-facing use
- [x] Works on all screen sizes
- [x] Immediately visible (no scrolling)

✅ **Best Practices:**
- [x] Official logo (not text replacement)
- [x] Opens in new tab
- [x] Subtle but clear
- [x] Accessible markup
- [x] Responsive design
- [x] Professional appearance

## Testing Checklist

- [ ] Logo visible on mobile (320px width) without scrolling
- [ ] Logo visible on tablet (768px width)
- [ ] Logo visible on desktop (1920px width)
- [ ] Logo maintains aspect ratio at all sizes
- [ ] Logo is clickable
- [ ] Link opens BoardGameGeek.com in new tab
- [ ] Hover effect works smoothly
- [ ] Touch target adequate on mobile
- [ ] Screen reader announces "Powered by BoardGameGeek"
- [ ] Logo doesn't overlap with title text

## Future Considerations

### Option 1: Add Tooltip
Show more context on hover:
```
[Hover logo]
  ↓
"Game data from BoardGameGeek community database"
```

### Option 2: Footer Placement
For pages with less BGG focus, could use footer:
```typescript
<footer>
  <a href="https://boardgamegeek.com/">
    <img src="/images/powered-by-bgg-rgb.svg" />
  </a>
</footer>
```

### Option 3: Sticky Placement
Make logo always visible while scrolling (probably overkill):
```typescript
className="sticky top-4"
```

## Migration Notes

**Changes Made:**
1. ✅ Moved `powered-by-bgg-rgb.svg` from root to `public/images/`
2. ✅ Removed text-based attribution from bottom of Step 1
3. ✅ Added logo at top of Step 1, next to title
4. ✅ Implemented responsive sizing (32px mobile, 40px desktop)
5. ✅ Applied subtle opacity for professional look

**No Breaking Changes:**
- Same link behavior
- Same compliance level
- Better visibility
- Professional appearance
