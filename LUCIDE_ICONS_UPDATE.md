# Lucide Icons Update

## Overview

Replaced emoji icons with Lucide React icons colored in brand color (`frost-ice`).

## Changes

### Before (Emoji Icons)
```tsx
icon="🎲"  // Game
icon="📸"  // Photos
icon="⭐"  // Condition
icon="💶"  // Pricing
icon="💬"  // Additional
```

### After (Lucide Icons)
```tsx
icon={<Dices className="w-6 h-6 text-frost-ice" />}
icon={<Camera className="w-6 h-6 text-frost-ice" />}
icon={<ClipboardCheck className="w-6 h-6 text-frost-ice" />}
icon={<Euro className="w-6 h-6 text-frost-ice" />}
icon={<MessageSquare className="w-6 h-6 text-frost-ice" />}
```

## Icon Mapping

| Section | Old | New | Why |
|---------|-----|-----|-----|
| Find Your Game | 🎲 | `Dices` | Perfect for board games |
| Upload Photos | 📸 | `Camera` | Intuitive for photo upload |
| Condition & Details | ⭐ | `ClipboardCheck` | Suggests checklist/details |
| Pricing & Shipping | 💶 | `Euro` | Matches your currency |
| Additional Information | 💬 | `MessageSquare` | Indicates messaging/notes |

## Files Modified

1. **`components/sell/CollapsibleSection.tsx`**
   - Changed `icon` prop from `string` to `ReactNode`
   - Removed emoji text styling, now renders icon component

2. **`app/sell/page.tsx`**
   - Added Lucide icon imports
   - Replaced all 5 emoji icons with Lucide components
   - All icons use `w-6 h-6 text-frost-ice` styling

## Package Added

```bash
pnpm add lucide-react
```

- **Version**: ^0.548.0
- **Size**: Minimal (tree-shakeable)
- **Icons Used**: 5 icons (Dices, Camera, ClipboardCheck, Euro, MessageSquare)

## Brand Consistency

All icons now use your brand color:
- **Color**: `text-frost-ice` (your primary action color)
- **Size**: `w-6 h-6` (24px, good for section headers)
- **Style**: Outline icons (matches modern design)

## Benefits

✅ **Brand consistency** - Icons match your color palette
✅ **Scalability** - Vector icons scale perfectly
✅ **Customization** - Can easily change color/size
✅ **Accessibility** - Better contrast than emojis
✅ **Professional** - More polished than emojis
✅ **Future-proof** - Easy to swap icons if needed

## Future Usage

To add more Lucide icons:

```tsx
// 1. Import the icon
import { IconName } from 'lucide-react';

// 2. Use it anywhere
<IconName className="w-6 h-6 text-frost-ice" />

// 3. Available colors from your theme:
// text-frost-ice (primary)
// text-polar-night (dark)
// text-aurora-red (error)
// text-text (default)
// text-text-secondary (muted)
```

## Available Lucide Icons

Browse all 1000+ icons at: https://lucide.dev/icons/

Popular icons for marketplaces:
- `Package` - Shipping
- `TrendingUp` - Sales
- `Heart` - Favorites
- `ShoppingCart` - Cart
- `User` - Profile
- `Bell` - Notifications
- `Search` - Search
- `Filter` - Filters
- `Grid` - Grid view
- `List` - List view

All icons are tree-shakeable - only imported icons are bundled.
