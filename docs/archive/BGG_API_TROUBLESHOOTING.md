# BGG API Troubleshooting Guide

## Issue: No Thumbnails Loading on Production

**Date:** 2025-11-10
**Site:** https://secondturn.games
**Status:** 🔴 BGG API not returning data

## Problem

Game search works, but thumbnails are not loading. Console shows:
```
⚠️ No thumbnail available for [game name]
```

## Root Cause

BGG API requests are failing. Based on code analysis:

1. **Search works** ✅ - Database query returns games
2. **Thumbnail API called** ✅ - `/api/games/[id]/thumbnail` is being invoked
3. **BGG API fails** ❌ - BoardGameGeek API not returning image data

## Diagnosis Steps

### 1. Check Vercel Environment Variables

Go to your Vercel dashboard → secondturn-games → Settings → Environment Variables

**Required Variables:**
- `BGG_API_TOKEN` - Set to your BGG API token (if you have one)
- `BGG_API_RATE_LIMIT_MS` - Set to `1000` (default)
- `NEXT_PUBLIC_VERCEL_URL` - Auto-set by Vercel

**Note:** BGG XML API v2 doesn't actually require tokens for most endpoints, but the code checks for it. If you don't have a token, you can:
1. Leave it empty/unset (the code will work without it)
2. Or set it to an empty string

### 2. Check Vercel Deployment Logs

```bash
# View recent logs
vercel logs secondturn.games --follow

# Look for these error patterns:
# ❌ [BGG API] Metadata error
# ⚠️ BGG API returned [status code]
# 401 Unauthorized
# 403 Forbidden
# 429 Too Many Requests
```

### 3. Test BGG API Locally

Run this command from your project root:

```bash
# Test BGG API from local environment
curl -H "User-Agent: SecondTurnGames/1.0 (+https://secondturn.games)" \
  "https://boardgamegeek.com/xmlapi2/thing?id=13"

# Should return XML with <thumbnail> and <image> tags
```

If this works locally but fails in production, it's likely:
- Vercel's outbound requests are being blocked by BGG
- Rate limiting (too many requests)
- IP blocklisting

### 4. Check Production API Response

Open browser console on https://secondturn.games/sell and search for a game:

```javascript
// In browser console, test the thumbnail API
fetch('/api/games/13/thumbnail')
  .then(r => r.json())
  .then(console.log)

// Should return:
// { thumbnail: "https://...", cached: false/true, gameId: 13 }
```

## Potential Issues & Solutions

### Issue 1: Missing BGG_API_TOKEN

**Symptoms:**
- All BGG requests fail
- Logs show 401 errors

**Solution:**
1. BGG XML API v2 is public and doesn't require tokens
2. Remove token requirement from code OR set token to empty string
3. Ensure User-Agent header is set (already in `bgg-config.ts`)

### Issue 2: Rate Limiting (429 Too Many Requests)

**Symptoms:**
- Some thumbnails load, others don't
- Logs show 429 errors
- Errors occur during high traffic

**Solution:**
```typescript
// In bgg-config.ts, increase rate limit delay
BGG_API_RATE_LIMIT_MS=2000  // Increase from 1000ms to 2000ms
```

### Issue 3: BGG API Blocking Vercel IPs

**Symptoms:**
- Works locally, fails in production
- Logs show timeouts or 403 errors

**Solution:**
1. Contact BGG support to whitelist your domain
2. Or implement BGG API proxy through a different service
3. Or cache thumbnails during development/import phase

### Issue 4: CORS Issues (Client-side)

**Symptoms:**
- Browser console shows CORS errors
- Server logs are clean

**Note:** This shouldn't be an issue since thumbnail fetching happens server-side via `/api/games/[id]/thumbnail`

### Issue 5: Database Permissions

**Symptoms:**
- Thumbnails fetch from BGG but don't save to database
- Same thumbnails re-fetch every time

**Solution:**
Check Supabase permissions:
```sql
-- Verify service role can update games table
SELECT * FROM games WHERE id = 13;
UPDATE games SET thumbnail = 'test' WHERE id = 13;
```

## Quick Fix: Pre-populate Thumbnails

If BGG API continues to fail in production, you can pre-populate thumbnails during the import:

```bash
# Run this script to fetch and cache thumbnails for top games
npx tsx packages/marketplace/scripts/cache-thumbnails.ts
```

**Create the script:**
```typescript
// packages/marketplace/scripts/cache-thumbnails.ts
import { createServiceClient } from '../lib/supabase/client';
import { fetchGameMetadata } from '../lib/bgg-api';

async function cacheThumbnails() {
  const supabase = createServiceClient();

  // Get top games without thumbnails
  const { data: games } = await supabase
    .from('games')
    .select('id, name')
    .is('thumbnail', null)
    .order('bayesaverage', { ascending: false })
    .limit(1000);

  for (const game of games || []) {
    const metadata = await fetchGameMetadata(game.id);
    if (metadata?.thumbnail) {
      await supabase
        .from('games')
        .update({
          thumbnail: metadata.thumbnail,
          image: metadata.image
        })
        .eq('id', game.id);

      console.log(`✅ Cached thumbnail for ${game.name}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}

cacheThumbnails();
```

## Architecture Context

**Current Design:**
- Games imported from CSV without thumbnails
- Thumbnails fetched on-demand when user views game card
- First user to view a game fetches from BGG, then cached in database
- Subsequent users get cached thumbnail

**Files Involved:**
- [bgg-api.ts](packages/marketplace/lib/bgg-api.ts) - BGG API client
- [bgg-config.ts](packages/marketplace/lib/bgg-config.ts) - BGG configuration & headers
- [app/api/games/[id]/thumbnail/route.ts](packages/marketplace/app/api/games/[id]/thumbnail/route.ts) - Thumbnail API endpoint
- [GameResultCard.tsx](packages/marketplace/components/sell/GameResultCard.tsx) - Lazy-loads thumbnails via Intersection Observer

## Next Steps

1. ✅ Verify Vercel environment variables
2. ✅ Check production logs for specific error codes
3. ✅ Test BGG API locally vs production
4. ⏳ Implement fix based on root cause
5. ⏳ Consider pre-caching thumbnails for top 1000 games

## References

- [BGG XML API v2 Documentation](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- [BGG API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use)
- [.env.example](packages/marketplace/.env.example)
- [DEPLOYMENT.md](packages/marketplace/DEPLOYMENT.md)
