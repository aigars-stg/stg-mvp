# Navbar Logo Implementation

## Overview

Updated the navbar to use custom SVG logos instead of text, with separate optimized versions for mobile and desktop.

## Logo Files

### Mobile Logo
**File:** `public/images/logo_nav_mobile.svg`
**Size:** 3.1KB
**Usage:** Mobile devices (<768px)
**Display Height:** 32px (`h-8`)

### Desktop Logo
**File:** `public/images/logo_nav.svg`
**Size:** 36KB
**Usage:** Desktop devices (≥768px)
**Display Height:** 40px (`h-10`)

## Implementation

### Code Location
**File:** [packages/marketplace/app/layout.tsx:25-38](packages/marketplace/app/layout.tsx#L25-L38)

```typescript
<Link href="/" className="flex items-center">
  {/* Mobile Logo */}
  <img
    src="/images/logo_nav_mobile.svg"
    alt="Second Turn Games"
    className="h-8 w-auto md:hidden"
  />
  {/* Desktop Logo */}
  <img
    src="/images/logo_nav.svg"
    alt="Second Turn Games"
    className="h-10 w-auto hidden md:block"
  />
</Link>
```

## Responsive Behavior

### Mobile (<768px)
```
┌─────────────────────────┐
│ [Mobile Logo] ☰         │
├─────────────────────────┤
```
- Shows `logo_nav_mobile.svg`
- Height: 32px
- Width: Auto (maintains aspect ratio)
- Smaller file size for faster loading

### Desktop (≥768px)
```
┌──────────────────────────────────────┐
│ [Desktop Logo]  Browse  Sell  Sign In│
└──────────────────────────────────────┘
```
- Shows `logo_nav.svg`
- Height: 40px
- Width: Auto (maintains aspect ratio)
- Full-featured logo design

## Design Rationale

### Why Two Logos?

**Mobile Logo (3.1KB):**
- ✅ Lightweight for mobile networks
- ✅ Optimized for small screens
- ✅ Simplified design (likely icon + abbreviated text)
- ✅ Fast loading

**Desktop Logo (36KB):**
- ✅ Full-featured design
- ✅ More detail visible at larger size
- ✅ Professional appearance
- ✅ Desktop bandwidth can handle larger file

### Breakpoint Choice

**Medium (md: 768px)** chosen as breakpoint because:
- Tablet devices have room for full logo
- Matches navigation menu breakpoint
- Standard responsive design pattern

## Accessibility

**Alt Text:** "Second Turn Games"
- Descriptive for screen readers
- Identifies the brand clearly
- No emoji or special characters

**Keyboard Navigation:**
- Logo is focusable (it's a link)
- Tab to logo, Enter to navigate home
- Clear focus indicator from browser default

**Touch Targets:**
- Mobile: 32px height (adequate for touch)
- Desktop: 40px height
- Width automatically sized for good target

## Visual Hierarchy

```
Before (Text):
┌─────────────────────────────┐
│ Second Turn Games  Browse...│
└─────────────────────────────┘
Text competing with navigation

After (Logo):
┌─────────────────────────────┐
│ [Logo]  Browse  Sell  Sign In│
└─────────────────────────────┘
Clear brand identity
```

## Benefits

✅ **Professional Branding**
- Custom logo instead of generic text
- Consistent brand identity
- Visual recognition

✅ **Performance Optimized**
- Mobile: 3.1KB (small file)
- Desktop: 36KB (richer detail)
- SVG format scales perfectly

✅ **Responsive Design**
- Right logo for right screen size
- Optimized for each device
- Maintains aspect ratio

✅ **Accessible**
- Proper alt text
- Keyboard navigable
- Screen reader friendly

## File Structure

```
packages/marketplace/
├── public/
│   └── images/
│       ├── logo_nav.svg          # Desktop (36KB)
│       ├── logo_nav_mobile.svg   # Mobile (3.1KB)
│       └── powered-by-bgg-rgb.svg
└── app/
    └── layout.tsx                 # Updated navbar
```

## Comparison: Text vs Logo

| Aspect | Text | Logo (SVG) |
|--------|------|-----------|
| File Size | ~0KB | 3-36KB |
| Branding | Generic | Custom |
| Scalability | Font-based | Perfect (vector) |
| Design | Limited | Full control |
| Recognition | Lower | Higher |
| Professional | Basic | High |

## CSS Classes Used

```typescript
// Mobile logo
className="h-8 w-auto md:hidden"
// h-8: 32px height
// w-auto: Maintains aspect ratio
// md:hidden: Hide on desktop

// Desktop logo
className="h-10 w-auto hidden md:block"
// h-10: 40px height
// w-auto: Maintains aspect ratio
// hidden: Hide by default
// md:block: Show on desktop
```

## Browser Compatibility

✅ **SVG Support:** All modern browsers
✅ **Responsive Images:** Universal support
✅ **Tailwind Classes:** All modern browsers

## Testing Checklist

- [ ] Mobile logo visible on phone (320-767px)
- [ ] Desktop logo visible on tablet (768px+)
- [ ] Desktop logo visible on desktop (1024px+)
- [ ] Only one logo visible at a time
- [ ] Logo maintains aspect ratio at all sizes
- [ ] Logo is clickable and navigates to home
- [ ] Alt text announced by screen readers
- [ ] Logo has adequate touch target on mobile
- [ ] Logo doesn't overflow navbar
- [ ] Logo loads quickly on slow connections

## Future Enhancements

### Option 1: Favicon
Create matching favicon from logo:
```html
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
```

### Option 2: Loading State
Show skeleton while logo loads:
```typescript
{!loaded && <div className="h-8 w-32 bg-border animate-pulse" />}
```

### Option 3: Dark Mode
Add dark mode logo variants:
```typescript
<img
  src="/images/logo_nav_dark.svg"
  className="dark:block hidden"
/>
```

### Option 4: Animated Logo
Subtle hover animation:
```typescript
className="transition-transform hover:scale-105"
```

## Logo Design Guidelines

For future logo updates, maintain:
- **Height Ratio:** Mobile 80% of desktop (32px vs 40px)
- **Format:** SVG (vector, scalable)
- **Colors:** Match design system (frost-ice, polar-night)
- **Simplicity:** Mobile version should be simplified
- **File Size:** Keep mobile <5KB, desktop <50KB

## Analytics Consideration

Track logo clicks to measure:
- Homepage navigation from other pages
- Logo recognition effectiveness
- Mobile vs desktop usage patterns

```typescript
onClick={() => analytics.track('logo_clicked', { source: 'navbar' })}
```
