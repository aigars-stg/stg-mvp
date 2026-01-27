# PRD: Preferred Terminal Feature

**Version**: 1.0
**Date**: January 2026
**Status**: Ready for Implementation
**Priority**: Medium (UX enhancement)

---

## Overview

Allow users to save a preferred parcel terminal in their account settings. This terminal will be:
- **For buyers**: Auto-selected during checkout (can be changed)
- **For sellers**: Shown as suggested drop-off location when viewing shipping codes

This reduces friction for repeat users and makes the shipping process faster.

---

## User Stories

### Buyer

> As a buyer, I want to save my preferred terminal so I don't have to search for it every time I checkout.

### Seller

> As a seller, I want to see my nearest terminal when I get a shipping code so I can quickly drop off packages.

---

## Technical Approach

### Reuse Existing Component

The terminal map/search component already exists in the checkout flow:
- Map view with terminal markers
- List view with search bar
- Filters by network (Unisend, Latvijas Pasts, uDrop)
- Data sourced from Unisend API (includes all three networks)

**Reuse this component** in Account Settings with minimal modifications.

### Database Changes

Add to user profile/preferences:

```sql
-- Option 1: Add column to existing profiles table
ALTER TABLE profiles ADD COLUMN preferred_terminal_id TEXT;
ALTER TABLE profiles ADD COLUMN preferred_terminal_name TEXT;
ALTER TABLE profiles ADD COLUMN preferred_terminal_network TEXT;

-- Option 2: Store as JSON in existing preferences column
-- { "preferred_terminal": { "id": "...", "name": "...", "network": "..." } }
```

Store:
- `terminal_id` — Unique identifier from Unisend API
- `terminal_name` — Human-readable name (for display without API call)
- `terminal_network` — Which network (Unisend, Latvijas Pasts, uDrop)

---

## UI Specifications

### Account Settings

**Location**: Account Settings → Shipping Preferences (or dedicated "Preferred Terminal" section)

**States**:

1. **No terminal set**
```
┌─────────────────────────────────────────────────────────────────┐
│ Preferred Terminal                                              │
│                                                                 │
│ Save your favorite terminal for faster checkout and shipping.   │
│                                                                 │
│ [Choose Terminal]                                               │
└─────────────────────────────────────────────────────────────────┘
```

2. **Terminal selected**
```
┌─────────────────────────────────────────────────────────────────┐
│ Preferred Terminal                                              │
│                                                                 │
│ 📍 Rimi Āgenskalns                                              │
│    Nometņu iela 62, Rīga                                        │
│    Unisend • Open 24/7                                          │
│                                                                 │
│ [Change]  [Remove]                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal Selector Modal**:
- Same UI as checkout terminal selection
- Map + list view
- Search by address/city/postal code
- Filter by network
- Click to select → saves and closes

### Checkout Flow (Buyer)

**Current behavior**: Buyer must search/select terminal every time

**New behavior**: 
1. If preferred terminal is set → auto-select it
2. Show "Using your preferred terminal" indicator
3. "Change" link to select different terminal
4. Selection for this order doesn't change saved preference

```
┌─────────────────────────────────────────────────────────────────┐
│ Delivery Terminal                                               │
│                                                                 │
│ 📍 Rimi Āgenskalns (your preferred terminal)                    │
│    Nometņu iela 62, Rīga                                        │
│                                                                 │
│ [Change for this order]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Seller Dashboard (Shipping Code View)

**Current behavior**: Shows shipping code only

**New behavior**: 
1. Show shipping code prominently
2. If preferred terminal is set → show it as suggested drop-off
3. Link to terminal finder for other options

```
┌─────────────────────────────────────────────────────────────────┐
│ Shipping Code                                                   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                      ABC123XY                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Enter this code at any Unisend, Latvijas Pasts, or uDrop       │
│ terminal to send your package.                                  │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ 📍 Suggested drop-off: Rimi Āgenskalns                         │
│    Nometņu iela 62, Rīga                                        │
│    [Get directions]                                             │
│                                                                 │
│ [Find other terminals]                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Preferred terminal no longer exists | Show message: "Your saved terminal is no longer available. Please select a new one." Clear preference. |
| User has no preferred terminal | Checkout shows terminal selector as today. Seller dashboard shows "Find a terminal" link. |
| User changes terminal during checkout | Use selected terminal for this order only. Don't update preference. |
| User wants to update preference from checkout | Add "Save as preferred" checkbox or link after selecting a different terminal. |

---

## Implementation Phases

### Phase 1: Account Settings (MVP)
- Add "Preferred Terminal" section to Account Settings
- Reuse terminal selector component
- Save/load from user profile
- Display saved terminal with change/remove options

### Phase 2: Checkout Integration
- Auto-select preferred terminal if set
- Show "your preferred terminal" indicator
- Allow one-time change without updating preference

### Phase 3: Seller Dashboard Integration
- Show preferred terminal as suggested drop-off
- "Get directions" link (opens maps app)
- Link to terminal finder for alternatives

### Phase 4: Enhancements (Optional)
- "Save as preferred" option when selecting different terminal in checkout
- Multiple saved terminals (home, work, etc.)
- Terminal availability indicators

---

## Success Metrics

| Metric | Target |
|--------|--------|
| % of users who set preferred terminal | >30% of active users within 3 months |
| Checkout completion time | Reduce by 15-20 seconds for users with preference |
| Repeat purchase rate | Monitor for increase (hypothesis: reduced friction → more purchases) |

---

## Dependencies

- Existing terminal selector component (map + list + search)
- Unisend API access (already integrated)
- User profile/preferences storage

---

## Not In Scope (Future Considerations)

- Terminal availability/capacity indicators
- "Recommend nearest terminal" based on user location
- Terminal favorites list (multiple saved terminals)
- Push notifications when package arrives at preferred terminal
- Terminal-specific features (locker size filtering, etc.)

---

## Related Documents

- [Shipping Guide](/help/shipping) — References preferred terminal feature
- Checkout flow documentation
- Unisend API integration docs
