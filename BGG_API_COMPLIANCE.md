# BoardGameGeek API Compliance

## Overview

We use the BoardGameGeek (BGG) XML API to fetch game data including titles, versions, publishers, languages, and images. BGG's Terms of Use require proper attribution when using their API in public-facing applications.

## Terms of Use

From [BGG XML API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use):

> **Attribution Requirement:**
> Public-facing uses of the XML API must include a "Powered by BoardGameGeek" logo linked back to BoardGameGeek.

## Implementation

### Location: Step 1 "Game Selection"

We've added the attribution badge at the bottom of Step 1 where users search for and select games using BGG data.

**File:** [packages/marketplace/app/sell/page.tsx:290-319](packages/marketplace/app/sell/page.tsx#L290-L319)

### Visual Design

**Desktop:**
```
┌────────────────────────────────────────┐
│ [Game Search Section]                  │
│                                        │
│ [Version Selection Section]           │
│                                        │
├────────────────────────────────────────┤
│                    ┌──────────────────┐│
│                    │ Powered by       ││
│                    │ BoardGameGeek  ↗ ││
│                    └──────────────────┘│
└────────────────────────────────────────┘
```

**Mobile:**
```
┌────────────────────┐
│ [Game Search]      │
│                    │
│ [Version Select]   │
│                    │
├────────────────────┤
│ ┌────────────────┐ │
│ │ Powered by     │ │
│ │ BoardGameGeek↗│ │
│ └────────────────┘ │
└────────────────────┘
```

### Responsive Behavior

**Mobile (< 640px):**
- Centered alignment: `justify-center`
- Smaller text: `text-xs`
- Smaller icon: `w-3 h-3`

**Desktop (≥ 640px):**
- Right alignment: `sm:justify-end`
- Normal text: `sm:text-sm` and `sm:text-base`
- Normal icon: `sm:w-4 sm:h-4`

### Styling Details

```typescript
<a
  href="https://boardgamegeek.com/"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-elevated transition-all group"
  title="Game data provided by BoardGameGeek"
>
  <span className="text-xs sm:text-sm text-text-muted group-hover:text-text-secondary">
    Powered by
  </span>
  <span className="text-sm sm:text-base font-bold text-primary group-hover:text-frost-ice">
    BoardGameGeek
  </span>
  {/* External link icon */}
</a>
```

**Features:**
- ✅ Clickable link to BoardGameGeek.com
- ✅ Opens in new tab (`target="_blank"`)
- ✅ Accessible title attribute
- ✅ Hover effects on text and background
- ✅ External link icon
- ✅ Responsive sizing

## Where BGG API is Used

### 1. Game Search (`/sell` Step 1)
- **API Used:** `searchGames(query)`
- **Data:** Game titles, years, IDs
- **Attribution:** ✅ Added at bottom of Step 1

### 2. Version Selection (`/sell` Step 1)
- **API Used:** `getGameVersions(gameId)`
- **Data:** Publishers, languages, years, product codes
- **Attribution:** ✅ Covered by Step 1 attribution

### 3. Browse Page (`/browse`)
- **API Used:** Mock data currently, but will use BGG API
- **Attribution:** ⚠️ TODO - Add when implementing real API

### 4. Game Detail Page (`/games/[id]`)
- **API Used:** `getGameDetails(gameId)`, `fetchGameMetadata(gameId)`
- **Data:** Full game details, descriptions, ratings
- **Attribution:** ⚠️ TODO - Add attribution badge

## Future Considerations

### Additional Pages Needing Attribution

1. **Browse Page** - When we implement BGG API search
2. **Game Detail Pages** - Individual game pages
3. **User Profiles** - If showing BGG ratings/data

### Consistent Placement Strategy

**Recommendation:** Add attribution in footer or bottom-right of any page displaying BGG data.

**Component Approach:**
Consider creating a reusable `<BGGAttribution />` component:

```typescript
// components/BGGAttribution.tsx
export function BGGAttribution({
  placement = 'right'
}: {
  placement?: 'left' | 'center' | 'right'
}) {
  return (
    <div className={`flex justify-${placement}`}>
      <a href="https://boardgamegeek.com/" ...>
        Powered by BoardGameGeek
      </a>
    </div>
  );
}
```

## API Rate Limits

While not strictly part of attribution, be aware of BGG's rate limiting:
- Recommended: < 1 request per second
- Our implementation: Uses 24-hour cache to minimize requests
- Future: Consider implementing exponential backoff for 429 responses

## Testing Compliance

Checklist for each page using BGG API:
- [ ] Attribution badge visible
- [ ] Link to BoardGameGeek.com
- [ ] Opens in new tab
- [ ] Visible on mobile and desktop
- [ ] Doesn't obstruct main content

## Legal Considerations

From BGG Terms of Use:

> The data available via the XML API is provided "as is" without warranty of any kind.

**Our Responsibility:**
- ✅ Provide attribution
- ✅ Link back to BGG
- ✅ Cache data to reduce load
- ✅ Handle API errors gracefully
- ⚠️ Don't claim ownership of BGG data
- ⚠️ Don't redistribute raw API data

## Resources

- [BGG XML API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use)
- [BGG XML API Documentation](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- Our implementation: [lib/bgg-api.ts](packages/marketplace/lib/bgg-api.ts)
