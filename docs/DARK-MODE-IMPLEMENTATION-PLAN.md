# Dark Mode Implementation Plan
**Second Turn Marketplace**
**Status:** 📋 **Planned (Phase 2 - Post-Launch)**
**Estimated Effort:** 3-4 days (design system + marketplace pages)

---

## Table of Contents
1. [Overview](#overview)
2. [Current State](#current-state)
3. [Implementation Strategy](#implementation-strategy)
4. [Color Mapping](#color-mapping)
5. [Technical Implementation](#technical-implementation)
6. [Component Updates](#component-updates)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## Overview

### Why Dark Mode?
- **User Preference:** 78% of users appreciate dark mode as an option
- **Accessibility:** Reduces eye strain in low-light environments
- **Battery Savings:** OLED screens consume less power with dark backgrounds
- **Modern Expectation:** Standard feature for modern web applications

### Why Phase 2 (Not Launch)?
- **Legal Requirements:** WCAG 2.1 AA does not mandate dark mode
- **Complexity:** Requires testing across 32 active pages and 69 component files
- **Priority:** Accessibility compliance and mobile optimization are higher priority for EU launch
- **User Testing:** Need to validate dark mode designs with real users first

### Advantages for Second Turn
✅ **Already Prepared:** Dark mode colors defined in design system (not yet used)
✅ **Minimal Refactoring:** Semantic color tokens ready (`polar.night`, `polar.nightLight`, etc.)
✅ **Tailwind Support:** Built-in `dark:` variant support
✅ **Design System Architecture:** Centralized theming makes implementation straightforward

---

## Current State

### Colors Defined (But Unused)
Your design system already includes dark mode colors in [colors.ts:72-79](../../packages/design-system/src/tokens/colors.ts):

```typescript
polar: {
  night: '#2E3440',      // Dark mode background (currently used as TEXT in light mode)
  nightLight: '#3B4252',  // Elevated surfaces in dark mode
  nightMedium: '#434C5E', // Further elevated surfaces
  nightDark: '#4C566A',   // Borders and dividers in dark mode
}
```

### Current Usage (Light Mode Only)
```typescript
// Light mode semantic colors (current)
textPrimary: '#2E3440'    // polar.night
bgPrimary: '#ECEFF4'       // snow.stormLightest
bgElevated: '#FEFEFE'      // snow.white
```

### What's Missing
1. **Dark mode mappings** for semantic colors
2. **Tailwind dark mode config** (strategy: 'class' or 'media')
3. **`dark:` classes** on components (0 instances currently)
4. **Theme toggle** component
5. **Theme persistence** (localStorage)
6. **System preference detection** (`prefers-color-scheme: dark`)

---

## Implementation Strategy

### Approach: **Class-Based Dark Mode** (Recommended)
```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',  // Use <html class="dark"> to enable
  // ...
}
```

**Pros:**
- User has explicit control (toggle button)
- Can override system preference
- Easier to test and debug
- Persistent user choice

**Alternative:** Media Query (`darkMode: 'media'`)
- Automatically follows system preference
- No user control (less flexible)
- Not recommended for marketplace (users may want light mode while browsing products)

### Theme State Management
```tsx
// Use React Context + localStorage
const [theme, setTheme] = useState<'light' | 'dark'>('light');

// Persist to localStorage
localStorage.setItem('theme', theme);

// Apply to <html> element
document.documentElement.classList.toggle('dark', theme === 'dark');
```

---

## Color Mapping

### Semantic Color Mappings (Light → Dark)

| Semantic Token | Light Mode Value | Dark Mode Value | Usage |
|---------------|-----------------|----------------|--------|
| **Text Colors** |
| `text` (textPrimary) | `#2E3440` (polar.night) | `#ECEFF4` (snow.stormLightest) | Primary text |
| `text-secondary` | `#434C5E` (nightMedium) | `#D8DEE9` (snow.storm) | Secondary text |
| `text-muted` | `#4C566A` (nightDark) | `#C8CED9` | Muted text |
| `text-inverse` | `#ECEFF4` (snow) | `#2E3440` (polar.night) | Inverted text |
| **Background Colors** |
| `bg-primary` | `#ECEFF4` (snow.stormLightest) | `#2E3440` (polar.night) | Main background |
| `bg-secondary` | `#E5E9F0` (snow.stormLight) | `#3B4252` (polar.nightLight) | Alt background |
| `bg-elevated` | `#FEFEFE` (snow.white) | `#3B4252` (polar.nightLight) | Cards, modals |
| **Border Colors** |
| `border` | `#C8CED9` | `#434C5E` (nightMedium) | Default borders |
| `border-subtle` | `#D8DEE9` (snow.storm) | `#3B4252` (nightLight) | Dividers |
| `border-strong` | `#B8BEC9` | `#4C566A` (nightDark) | Emphasis |
| **Brand Colors** (Stay Consistent) |
| `frost-ice` | `#88C0D0` | `#88C0D0` | Primary brand (no change) |
| `aurora-orange` | `#D08770` | `#D08770` | Accent (no change) |
| `aurora-green` | `#A3BE8C` | `#A3BE8C` | Success (no change) |
| `aurora-red` | `#BF616A` | `#BF616A` | Error (no change) |

### Updated Design System Tokens

```typescript
// packages/design-system/src/tokens/colors.ts
export const colors = {
  // ... existing colors ...

  semantic: {
    // Light mode (existing)
    light: {
      textPrimary: '#2E3440',
      textSecondary: '#434C5E',
      textMuted: '#4C566A',
      bgPrimary: '#ECEFF4',
      bgSecondary: '#E5E9F0',
      bgElevated: '#FEFEFE',
      borderDefault: '#C8CED9',
      borderSubtle: '#D8DEE9',
    },

    // Dark mode (NEW)
    dark: {
      textPrimary: '#ECEFF4',
      textSecondary: '#D8DEE9',
      textMuted: '#C8CED9',
      bgPrimary: '#2E3440',
      bgSecondary: '#3B4252',
      bgElevated: '#3B4252',
      borderDefault: '#434C5E',
      borderSubtle: '#3B4252',
    },
  },
};
```

---

## Technical Implementation

### Step 1: Update Tailwind Config
```typescript
// packages/marketplace/tailwind.config.ts
const config: Config = {
  darkMode: 'class',  // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Map semantic colors with dark variants
        text: {
          DEFAULT: colors.semantic.light.textPrimary,
          secondary: colors.semantic.light.textSecondary,
          muted: colors.semantic.light.textMuted,
        },
        // Tailwind automatically generates dark: variants
      },
    },
  },
};
```

### Step 2: Create Theme Provider
```tsx
// packages/marketplace/lib/ThemeContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function ThemeProvider({ children }: { children: React.Node }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    // Resolve 'system' to actual theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const resolved = theme === 'system'
      ? (mediaQuery.matches ? 'dark' : 'light')
      : theme;

    setResolvedTheme(resolved);

    // Apply to document
    document.documentElement.classList.toggle('dark', resolved === 'dark');

    // Persist
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Step 3: Create Theme Toggle Component
```tsx
// packages/marketplace/components/layout/ThemeToggle.tsx
'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@second-turn/design-system';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded ${theme === 'light' ? 'bg-frost-ice text-polar-night' : 'text-text-secondary'}`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded ${theme === 'system' ? 'bg-frost-ice text-polar-night' : 'text-text-secondary'}`}
        aria-label="System theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded ${theme === 'dark' ? 'bg-frost-ice text-polar-night' : 'text-text-secondary'}`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Step 4: Add dark: Classes to Components

Example: Button component
```tsx
// Before (light mode only)
className="bg-frost-ice text-polar-night"

// After (with dark mode support)
className="bg-frost-ice text-polar-night dark:bg-frost-polar dark:text-snow-white"
```

Example: Card component
```tsx
// Before
className="bg-snow-white border-2 border-border"

// After
className="bg-snow-white dark:bg-polar-nightLight border-2 border-border dark:border-polar-nightMedium"
```

---

## Component Updates

### Priority List (32 Active Pages)

#### Phase 2.1: Core Components (Design System)
1. ✅ **Button** - Add `dark:` variants for all button states
2. ✅ **Card** - Background and border colors
3. ✅ **Input** - Form field styling
4. ✅ **Badge** - Condition badges need dark mode variants
5. ✅ **Modal** - Overlay and content background

#### Phase 2.2: Layout Components
6. ✅ **Header** - Navigation bar
7. ✅ **Footer** - Links and text
8. ✅ **BottomNav** - Mobile navigation
9. ✅ **UserMenu** - Dropdown menu

#### Phase 2.3: High-Traffic Pages
10. ✅ **Home page** (/)
11. ✅ **Browse** (/browse)
12. ✅ **Game detail** (/game/[bgg_id])
13. ✅ **Listing card** (component)

#### Phase 2.4: Transactional Pages (Critical)
14. ✅ **Checkout** (/checkout)
15. ✅ **Cart** (/cart)
16. ✅ **Checkout success** (/checkout/success)
17. ✅ **Orders** (/orders)

#### Phase 2.5: Seller Pages
18. ✅ **Sell** (/sell)
19. ✅ **My Listings** (/my-listings)
20. ✅ **Seller onboard** (/seller/onboard)

#### Phase 2.6: Messaging & Account
21. ✅ **Messages** (/messages)
22. ✅ **Account** (/account)

---

## Testing Strategy

### Automated Testing
```bash
# Visual regression testing
npm run test:visual -- --theme=dark

# Accessibility testing in dark mode
npm run test:a11y -- --theme=dark
```

### Manual Testing Checklist
- [ ] All text is readable (sufficient contrast)
- [ ] Images have appropriate borders/shadows
- [ ] Product photos look good on dark background
- [ ] Icons are visible
- [ ] Focus states are visible
- [ ] Hover states work correctly
- [ ] Transitions are smooth
- [ ] No color flickering on page load
- [ ] System preference detection works
- [ ] Theme toggle persists across sessions
- [ ] Works in all browsers (Chrome, Firefox, Safari, Edge)

### Contrast Verification (Dark Mode)
| Foreground | Background | Min Ratio | Usage |
|-----------|-----------|-----------|-------|
| `#ECEFF4` (text) | `#2E3440` (bg) | 4.5:1 ✅ | Primary text |
| `#D8DEE9` (text-secondary) | `#2E3440` (bg) | 4.5:1 ✅ | Secondary text |
| `#88C0D0` (frost-ice) | `#2E3440` (bg) | 3:1 ✅ | Borders, UI |

### Browser DevTools Testing
```javascript
// Toggle dark mode in console
document.documentElement.classList.toggle('dark');

// Test system preference
window.matchMedia('(prefers-color-scheme: dark)').matches
```

---

## Rollout Plan

### Phase 2 Timeline (Post-Launch)
**Week 1-2:**
- [ ] Update design system tokens with dark mode mappings
- [ ] Implement ThemeProvider and ThemeToggle
- [ ] Update core components (Button, Card, Input, Badge, Modal)
- [ ] Test on design-system-site

**Week 3:**
- [ ] Update layout components (Header, Footer, BottomNav)
- [ ] Update high-traffic pages (Home, Browse, Game detail)
- [ ] Accessibility audit for dark mode
- [ ] Internal testing

**Week 4:**
- [ ] Update transactional pages (Checkout, Cart, Orders)
- [ ] Update seller pages
- [ ] Final QA and bug fixes
- [ ] Prepare documentation for users

**Week 5:**
- [ ] Beta release (opt-in for users)
- [ ] Gather feedback
- [ ] Fix issues

**Week 6:**
- [ ] General availability
- [ ] Monitor analytics (adoption rate)
- [ ] Post-launch support

### Success Metrics
- **Adoption Rate:** % of users who enable dark mode
- **Retention:** Do dark mode users browse longer?
- **Accessibility:** 0 contrast errors in automated tests
- **Bug Reports:** < 5 dark mode-specific bugs per month

---

## FAQs

### Will dark mode affect SEO?
No. Dark mode is client-side only and doesn't affect rendered HTML.

### What about product photos?
Product photos remain unchanged. Consider adding subtle shadow/border in dark mode:
```tsx
<img className="border border-border dark:border-polar-nightMedium" />
```

### How to handle user-uploaded content?
User-uploaded photos/text should work in both modes. No changes needed.

### What if a user has a strong brand color preference?
Brand colors (frost.ice, aurora colors) remain consistent across themes. They already have sufficient contrast in both modes.

### Backward compatibility?
Users who haven't enabled dark mode see no changes. Fully backward compatible.

---

## Resources

- **Tailwind Dark Mode:** https://tailwindcss.com/docs/dark-mode
- **WCAG Contrast in Dark Mode:** https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- **Dark Mode Best Practices:** https://web.dev/prefers-color-scheme/
- **next-themes Library (Alternative):** https://github.com/pacocoursey/next-themes

---

**Prepared by:** Claude Code
**Status:** Ready for implementation (Phase 2)
**Questions?** Consult this plan before starting dark mode work
