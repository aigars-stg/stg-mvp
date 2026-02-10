# Responsive Design Standards

## Tailwind Breakpoints

- `sm:` 640px - Small tablets and large phones (landscape)
- `md:` 768px - Tablets
- `lg:` 1024px - Small laptops/desktops
- `xl:` 1280px - Large desktops

## Standard Patterns

### Grid Layouts

**Detail Pages (2-column)**
```tsx
grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8
```

**Card Grids (progressive)**
```tsx
grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6
```

### Touch Targets

- **Minimum:** 44px × 44px (WCAG/Apple/Android guidelines)
- **Buttons:** Use `w-10 h-10` or larger on mobile
- **Clickable areas:** Use `p-3` for adequate spacing (48px)

### Text Sizing

**Headings**
- H1: `text-2xl sm:text-3xl lg:text-4xl`
- H2: `text-xl sm:text-2xl lg:text-3xl`
- H3: `text-lg sm:text-xl lg:text-2xl`

**Prices/Large Numbers**
- `text-3xl sm:text-4xl`

### Image Heights

**Hero/Main Images**
```tsx
min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]
```

**Card Thumbnails**
```tsx
h-40 sm:h-44 lg:h-48
```

### Spacing Scale

**Gaps**
- Small: `gap-2 sm:gap-3`
- Medium: `gap-3 sm:gap-4 md:gap-6`
- Large: `gap-4 sm:gap-6 md:gap-8`

**Padding**
- Container: `px-4 sm:px-6 py-6`
- Section: `py-6 sm:py-8`

### Mobile-Specific Patterns

**Sticky Bottom Bars**
```tsx
sticky bottom-0 sm:static bg-bg-elevated sm:bg-transparent
border-t sm:border-t-0 border-border-subtle
-mx-4 sm:mx-0 px-4 sm:px-0 py-4 sm:py-0
```

**Full-Width Mobile Elements**
```tsx
-mx-4 px-4 sm:mx-0 sm:px-0
```

**Stacking Layouts**
```tsx
flex flex-col sm:flex-row gap-3 sm:gap-4
```

### Safe Area (for notched devices)

Add to sticky bottom elements using CSS env() function:
```tsx
pb-[calc(1rem+env(safe-area-inset-bottom))]
```

**Navigation Arrows (Mobile vs Desktop)**
```tsx
// Larger touch targets on mobile, visible by default
// Smaller on desktop, shown on hover only
w-11 h-11 sm:w-10 sm:h-10
sm:opacity-0 sm:group-hover:opacity-100
```

## Recent Mobile-First Improvements

### Pages Updated
- ✅ **Listing Detail Page** - Added md: breakpoint, responsive image heights, larger touch targets, responsive text
- ✅ **Games Detail Page** - Added md: breakpoint for better tablet experience
- ✅ **Wanted Detail Page** - Added md: breakpoint, responsive image heights
- ✅ **My Listings Page** - Stacking header layout, full-width buttons on mobile, responsive tabs
- ✅ **Browse Page** - Safe-area support for mobile filter drawer

### Components Updated
- ✅ **ListingCard** - Responsive image heights (160px→176px→192px), larger touch targets on mobile

### Key Improvements
1. **Tablet Support** - Added missing `md:` breakpoints across all detail pages (768px)
2. **Touch Targets** - Increased to 44px minimum on mobile (from 32px)
3. **Image Heights** - Progressive scaling: 300px (mobile) → 400px (tablet) → 500px (desktop)
4. **Text Sizing** - Responsive headings and prices across all pages
5. **Mobile Navigation** - Arrows always visible on mobile, hidden until hover on desktop
6. **Safe Area** - Support for notched devices on sticky elements
7. **Stacking Layouts** - Headers and buttons stack properly on mobile

## Testing Checklist

- [ ] iPhone SE (375px width)
- [ ] iPhone Pro Max (428px width)
- [ ] iPad (768px width)
- [ ] iPad Pro (1024px width)
- [ ] Desktop (1440px+ width)
- [ ] Test landscape orientation
- [ ] Test with browser zoom (125%, 150%)
- [ ] Test touch target sizes (min 44px)
