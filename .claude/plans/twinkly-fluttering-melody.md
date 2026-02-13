# Reduce CalendarTime Icon Repetition on Browse Cards

## Context
The AggregatedGameCard currently shows CalendarTime up to 3 times on auction-only cards:
1. Icon strip (listing type indicator) — redundant with countdown
2. Price section (decorative prefix) — redundant with color
3. AuctionCountdown component (functional: icon + time text)

User chose to keep only the countdown, removing from icon strip and price section. The countdown line alone communicates both "auctions exist" and "when they end."

## Changes

### 1. AggregatedGameCard — Remove CalendarTime from icon strip
**File:** `packages/marketplace/components/browse/AggregatedGameCard.tsx`

Remove the auction icon block from the icon strip (lines 111-118):
```tsx
// DELETE this block:
{hasAnyAuction && (
  <span
    title={tListings('auctionTooltip', { count: game.auction_count + game.auction_ended_count })}
    className={hasActiveAuction ? urgency.textColorClass : 'text-text-muted'}
  >
    <CalendarTime className="w-4 h-4" />
  </span>
)}
```

### 2. AggregatedGameCard — Remove CalendarTime from price section
**File:** `packages/marketplace/components/browse/AggregatedGameCard.tsx`

For auction-only active cards (lines 128-134), remove the icon — keep only the colored price:
```tsx
// Before:
{isAuctionOnly ? (
  <>
    <CalendarTime className={`w-4 h-4 self-center ${urgency.priceColorClass}`} />
    <span className={`text-2xl font-bold ${urgency.priceColorClass}`}>

// After:
{isAuctionOnly ? (
  <span className={`text-2xl font-bold ${urgency.priceColorClass}`}>
```

Same for auction-ended-only cards (lines 135-141):
```tsx
// Before:
) : isAuctionEndedOnly ? (
  <>
    <CalendarTime className="w-4 h-4 self-center text-text-muted" />
    <span className="text-2xl font-bold text-text-muted">

// After:
) : isAuctionEndedOnly ? (
  <span className="text-2xl font-bold text-text-muted">
```

### 3. Clean up unused import
**File:** `packages/marketplace/components/browse/AggregatedGameCard.tsx`

After removal, CalendarTime is no longer used in this file (it's used in AuctionCountdown instead). Remove from the import line.

## Result
- Auction-only card: 1 CalendarTime icon (in countdown row only)
- Mixed card: 1 CalendarTime icon (in countdown row only)
- No-auction card: 0 CalendarTime icons (unchanged)

The countdown line (e.g., "🕐 Ends in 2d 23h" or "🕐 Auction ended") is the single source of auction signaling. Purple/red color on the price text still differentiates auction pricing.

## Verification
- `pnpm type-check` — no unused import warnings
- Visual: auction-only cards show colored price + countdown line below, no icon clutter
- Visual: mixed cards show normal price + countdown line, auction signaled solely by countdown
