# Responsive Design Guide
**Second Turn Marketplace Design System**
**Last Updated:** January 25, 2025

---

## Table of Contents
1. [Philosophy](#philosophy)
2. [Breakpoints](#breakpoints)
3. [Layout Patterns](#layout-patterns)
4. [Typography Scaling](#typography-scaling)
5. [Spacing & Sizing](#spacing--sizing)
6. [Navigation Patterns](#navigation-patterns)
7. [Component Patterns](#component-patterns)
8. [Mobile Optimization](#mobile-optimization)
9. [Touch Targets](#touch-targets)
10. [Testing Guidelines](#testing-guidelines)

---

## Philosophy

### Mobile-First Approach
Second Turn follows a **mobile-first responsive design** strategy:
- Base styles target mobile devices (< 640px)
- Progressive enhancement for larger screens
- Touch-friendly interfaces on all devices
- Performance-optimized for slower mobile connections

### Nordic Minimalism
- Clean, compact marketplace layouts
- Minimal use of decorative elements
- Focus on content density and usability
- Balanced breathing room — tighter than editorial, roomier than spreadsheets

---

## Breakpoints

Second Turn uses Tailwind CSS default breakpoints, which are battle-tested and cover 99% of devices:

```typescript
// Tailwind Default Breakpoints
sm:  640px   // Small tablets, large phones (landscape)
md:  768px   // Tablets, small laptops
lg:  1024px  // Desktops, large tablets (landscape)
xl:  1280px  // Large desktops, wide screens
2xl: 1536px  // Extra-wide monitors (optional use)
```

### Device Mapping
| Breakpoint | Devices | Common Resolutions | Usage |
|-----------|---------|-------------------|--------|
| **Base** (< 640px) | Mobile phones (portrait) | 320px - 639px | Primary mobile experience |
| **sm:** (640px+) | Large phones, small tablets | 640px - 767px | Landscape phones, tablet adjustments |
| **md:** (768px+) | Tablets, small laptops | 768px - 1023px | Desktop header nav appears |
| **lg:** (1024px+) | Desktops, laptops | 1024px+ | **Primary desktop split** |
| **xl:** (1280px+) | Large desktops | 1280px+ | Wide-screen optimizations |
| **2xl:** (1536px+) | Ultra-wide monitors | 1536px+ | Rarely used |

### Critical Breakpoint: `lg:` (1024px)
The **`lg:`** breakpoint is our **primary mobile/desktop split**:
- **Below lg:** Mobile bottom navigation visible, header navigation hidden
- **Above lg:** Desktop header navigation, bottom nav hidden
- Content layout shifts from single-column to multi-column

---

## Layout Patterns

### Container Pattern
All pages use the same container pattern for consistency:

```tsx
// Standard Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
  {/* Content */}
</div>
```

**Breakdown:**
- `max-w-7xl` (1280px): Maximum content width
- `mx-auto`: Centered on large screens
- `px-4 sm:px-6`: Horizontal padding (16px mobile, 24px tablet+)
- `py-6`: Vertical padding (24px — compact marketplace spacing)

### Grid Patterns

#### 1. **Responsive Product Grid** (Most Common)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
  {/* Cards */}
</div>
```
- Mobile: 1 column
- Small tablets: 2 columns
- Desktop: 3 columns
- Wide desktop: 4 columns

#### 2. **Two-Column Layout** (Content + Sidebar)
```tsx
<div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
  <div className="lg:col-span-2">
    {/* Main content (2/3 width on desktop) */}
  </div>
  <div className="lg:col-span-1">
    {/* Sidebar (1/3 width on desktop) */}
  </div>
</div>
```

#### 3. **Equal Columns**
```tsx
<div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
  {/* Two equal columns on tablet+ */}
</div>
```

### Stack to Horizontal

```tsx
// Mobile: Stacked vertical
// Desktop: Horizontal flex
<div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
  <div className="flex-grow">{/* Content */}</div>
  <div className="flex-shrink-0">{/* Actions */}</div>
</div>
```

---

## Typography Scaling

Typography scales proportionally across breakpoints:

### Headings
```tsx
// Hero Heading
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">

// Page Heading
<h1 className="text-2xl sm:text-3xl font-bold">

// Section Heading
<h2 className="text-xl sm:text-2xl font-semibold">

// Subsection
<h3 className="text-lg sm:text-xl font-medium">
```

### Body Text
```tsx
// Primary Text
<p className="text-base">  // 16px (no scaling needed)

// Small Text
<p className="text-sm sm:text-base">  // 14px → 16px

// Caption / Helper Text
<p className="text-xs sm:text-sm">  // 12px → 14px
```

### Scale Ratios
- **Mobile:** Base size (optimized for readability on small screens)
- **Tablet (sm:):** +12.5% increase
- **Desktop (lg:):** +25% increase (for hero headings only)

---

## Spacing & Sizing

### Padding & Margins
Spacing increases proportionally on larger screens:

```tsx
// Standard Spacing Pattern
className="p-4 sm:p-6"         // Padding: 16px → 24px
className="py-3 sm:py-4"       // Vertical: 12px → 16px
className="gap-4 sm:gap-6"     // Gap: 16px → 24px
className="space-y-4 sm:space-y-6"  // Stack spacing

// Large Spacing
className="py-6 sm:py-8"       // Section padding: 24px → 32px
className="mt-8 sm:mt-12"      // Section margin: 32px → 48px
```

### Component Sizing
```tsx
// Buttons (height)
size="sm"   // 36px (min-h-[36px])
size="md"   // 44px (min-h-[44px])  ← Default
size="lg"   // 48px (min-h-[48px])

// Icons
Mobile: w-5 h-5  (20px)
Desktop (in larger components): w-6 h-6 (24px)

// Avatars
Mobile: w-8 h-8  (32px)
Desktop: w-10 h-10 (40px)
```

---

## Navigation Patterns

### Desktop Header Navigation (md:+ / 768px+)
```tsx
<nav className="hidden md:flex items-center gap-6">
  <Link href="/browse">Browse</Link>
  <Link href="/sell">Sell</Link>
  {/* ... */}
</nav>
```

### Mobile Bottom Navigation (< lg / < 1024px)
```tsx
<nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
  {/* Bottom nav with 5 icons */}
</nav>
```

### Visibility Utilities
```tsx
// Show only on mobile
<div className="md:hidden">Mobile only</div>

// Show only on desktop
<div className="hidden md:flex">Desktop only</div>

// Show below lg (mobile + tablet)
<div className="lg:hidden">Mobile & Tablet</div>

// Show above lg (desktop)
<div className="hidden lg:block">Desktop only</div>
```

### Safe Area for Bottom Nav
Add padding-bottom on mobile to account for bottom navigation:
```tsx
className="pb-20 lg:pb-0"  // 80px bottom padding on mobile
```

---

## Component Patterns

### Cards
```tsx
<div className="bg-snow-white border-2 border-border rounded-xl p-4 sm:p-6">
  {/* Card content with responsive padding */}
</div>
```

### Buttons
```tsx
// Full-width on mobile, auto on desktop
<Button fullWidth className="sm:w-auto">
  Submit
</Button>

// Stack on mobile, inline on desktop
<div className="flex flex-col sm:flex-row gap-3">
  <Button>Primary</Button>
  <Button variant="secondary">Secondary</Button>
</div>
```

### Form Fields
```tsx
<input className="
  w-full
  px-4 py-3 sm:py-3.5
  min-h-[48px]  // WCAG touch target
  rounded-lg
  border border-border
  focus:border-frost-ice focus:ring-2 focus:ring-frost-ice/20
"/>
```

### Modal / Slide Panel
```tsx
// Full-screen on mobile, centered modal on desktop
<div className="
  fixed inset-0 lg:inset-auto
  lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
  w-full lg:w-[600px]
  h-full lg:h-auto lg:max-h-[90vh]
  p-6 sm:p-8
">
  {/* Modal content */}
</div>
```

### Images
```tsx
// Responsive images
<img
  src={url}
  alt={description}
  className="w-full h-auto object-cover rounded-lg"
  loading="lazy"
/>

// Aspect ratio containers
<div className="aspect-square">  // 1:1 ratio
<div className="aspect-video">   // 16:9 ratio
```

---

## Mobile Optimization

### Content Prioritization
On mobile, prioritize essential content and actions:

1. **Above the fold:** Primary CTA, key info
2. **Collapsed sections:** Use accordions for secondary content
3. **Progressive disclosure:** Show details on demand
4. **Reduced chrome:** Minimal UI decoration

### Mobile-Specific Patterns

#### Compact List Item
```tsx
// Desktop: Horizontal layout with spacing
// Mobile: Compact vertical stack
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 sm:p-4">
  <div className="flex items-center gap-3">
    <img className="w-12 h-12 sm:w-16 sm:h-16" />
    <div>
      <h3 className="text-sm sm:text-base font-medium">Title</h3>
      <p className="text-xs sm:text-sm text-text-secondary">Subtitle</p>
    </div>
  </div>
  <div className="flex items-center justify-between sm:ml-auto">
    <span className="text-sm sm:text-base font-bold">€25.00</span>
    <Button size="sm">Buy</Button>
  </div>
</div>
```

#### Sticky Bottom CTA (Mobile)
```tsx
<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-snow-white border-t-2 border-border p-4 z-50">
  <Button variant="accent" fullWidth>
    Complete Purchase
  </Button>
</div>
```

#### Expandable Sections
```tsx
// Show summary on mobile, full content on desktop
<div className="lg:block">
  <button
    onClick={toggle}
    className="lg:hidden w-full text-left p-3 flex items-center justify-between"
  >
    <span>Show Details</span>
    <ChevronDown className={expanded ? 'rotate-180' : ''} />
  </button>
  <div className={`${expanded ? 'block' : 'hidden'} lg:block`}>
    {/* Detailed content */}
  </div>
</div>
```

---

## Touch Targets

### WCAG 2.5.5 Level AAA (Adopted for Checkout)
**Minimum touch target size: 48×48px** (with spacing)

### Implementation
```tsx
// Input fields
className="min-h-[48px]"

// Buttons
className="min-h-[44px] px-4"  // 44px height + padding

// Icon buttons
className="w-10 h-10 sm:w-12 sm:h-12 p-2"  // 40px-48px clickable area

// Radio buttons / Checkboxes
className="w-6 h-6"  // 24px base, surrounded by label padding

// Clickable cards
className="p-4 sm:p-5"  // Generous padding increases tap area
```

### Touch Target Spacing
Ensure 8px minimum spacing between interactive elements:
```tsx
className="gap-2"  // 8px minimum between buttons
```

---

## Testing Guidelines

### Breakpoint Testing
Test at these specific widths:
- **320px** - iPhone SE (smallest modern phone)
- **375px** - iPhone standard
- **390px** - iPhone Pro
- **768px** - iPad portrait (breakpoint boundary)
- **1024px** - Desktop threshold (critical breakpoint)
- **1280px** - Standard desktop
- **1440px** - Large desktop

### Browser DevTools
```
Chrome DevTools → Toggle Device Toolbar (Cmd+Shift+M / Ctrl+Shift+M)
- Test responsive breakpoints
- Check touch targets (Show paint flashing)
- Throttle network to simulate mobile
```

### Real Device Testing (Recommended)
- **iOS:** Safari on iPhone (different models)
- **Android:** Chrome on Samsung/Pixel
- **Tablet:** iPad Safari, Android Chrome
- **Desktop:** Chrome, Firefox, Safari, Edge

### Responsive Checklist
- [ ] All text is readable without horizontal scrolling
- [ ] Images scale appropriately
- [ ] Navigation is accessible on all screen sizes
- [ ] Forms are usable on mobile (no zoom required)
- [ ] Touch targets are minimum 44×44px (checkout: 48×48px)
- [ ] Content reflows logically (no overlap)
- [ ] CTAs are visible and accessible
- [ ] No horizontal scrollbar appears
- [ ] Spacing feels balanced at all sizes

---

## Common Patterns Cheat Sheet

```tsx
// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

// Responsive Grid (1 → 2 → 3 → 4 columns)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">

// Heading Hierarchy
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">  // Hero
<h1 className="text-2xl sm:text-3xl font-bold">               // Page
<h2 className="text-xl sm:text-2xl font-semibold">            // Section
<h3 className="text-lg font-medium">                          // Subsection

// Spacing (consistent scale)
<div className="p-4 sm:p-6">          // Padding
<div className="gap-4 sm:gap-6">      // Grid/flex gap
<div className="space-y-4 sm:space-y-6">  // Vertical stack

// Hide/Show by Breakpoint
<div className="md:hidden">Mobile only</div>
<div className="hidden md:block">Desktop only</div>
<div className="lg:hidden">Mobile + Tablet</div>
<div className="hidden lg:flex">Desktop only</div>

// Flex Direction
<div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

// Buttons
<Button fullWidth className="sm:w-auto">Responsive width</Button>

// Touch Target
<input className="min-h-[48px] px-4 py-3">

// Bottom Nav Clearance
<main className="pb-20 lg:pb-0">

// Icon Sizing
<Icon className="w-5 h-5 sm:w-6 sm:h-6" />
```

---

## Design System Integration

All responsive patterns are enforced through the design system:
- `@second-turn/design-system` exports responsive components
- Tailwind config extends with semantic color/spacing tokens
- Components handle responsive behavior internally

### Example: Button Component
```tsx
// Button automatically adjusts padding and height for mobile
<Button size="md">  // 44px height, 16px padding
```

---

## Resources

- **Tailwind Breakpoints:** https://tailwindcss.com/docs/responsive-design
- **Mobile-First CSS:** https://responsivedesign.is/articles/why-you-should-design-mobile-first/
- **Touch Target Sizing:** WCAG 2.5.5 (Level AAA)
- **Device Stats:** https://gs.statcounter.com/screen-resolution-stats

---

**Maintained by:** Second Turn Design Team
**Questions:** Reference this guide for all responsive design decisions
**Updates:** Document new patterns as they emerge
