# BGG API Fix - Action Plan

**Issue:** Thumbnails not loading on secondturn.games
**Root Cause:** BGG API returning 401 Unauthorized
**Status:** 🔴 Confirmed - BGG API requires authentication

---

## 🎯 Immediate Action Items

### Option A: Contact BoardGameGeek (Recommended)

**Why:** BGG may have changed their API authentication requirements. Official access is the proper solution.

**Steps:**
1. **Visit BGG API Documentation**
   - https://boardgamegeek.com/wiki/page/BGG_XML_API2
   - Check for any authentication requirements or registration process

2. **Contact BGG Support**
   ```
   To: support@boardgamegeek.com
   Subject: API Access Request for SecondTurn.Games Marketplace

   Hello BGG Team,

   I'm building SecondTurn.Games, a marketplace for buying/selling used board games.
   We use BGG's XML API v2 to fetch game metadata (names, images, versions) to help
   users accurately list their games for sale.

   Recently we've started receiving 401 Unauthorized errors when making API requests.
   Could you please advise on:

   1. Do I need to register for API access?
   2. Is there an API key or authentication token required?
   3. Are there specific rate limits I should follow?

   Our site properly attributes BGG with "Powered by BoardGameGeek" logos and links
   as per your API Terms of Use.

   Domain: https://secondturn.games
   Contact: aigars@secondturn.games

   Thank you!
   ```

3. **Wait for Response**
   - BGG support typically responds within 1-2 business days
   - They may provide API credentials or whitelist your domain

### Option B: Pre-Cache Thumbnails (Temporary Workaround)

**Why:** Works around API issues by caching images ahead of time instead of fetching on-demand.

**Steps:**

1. **Try fetching thumbnails when BGG API might work:**
   ```bash
   # Run the caching script
   cd packages/marketplace
   npx tsx scripts/cache-bgg-thumbnails.ts
   ```

   This will attempt to fetch and cache thumbnails for the top 100 games.

2. **Monitor the output:**
   - If successful: Thumbnails will be cached in database
   - If 401 errors: Confirms authentication is needed (go to Option A)

3. **Schedule regular caching:**
   Once BGG access is resolved, run this script regularly:
   ```bash
   # Add to cron or Vercel scheduled function
   # Run daily at 2 AM
   0 2 * * * cd /path/to/project && npx tsx packages/marketplace/scripts/cache-bgg-thumbnails.ts
   ```

### Option C: Use BGG Images via Proxy (Advanced)

**Why:** Some services provide BGG data proxies with their own authentication.

**Services to explore:**
- **BGG JSON API** (unofficial): https://bgg-json.azurewebsites.net/
- **Board Game Atlas API**: https://www.boardgameatlas.com/api/docs
- **IGDB API**: https://www.igdb.com/api (video games, but may have board games)

**Pros:**
- May have better reliability
- Often include additional features

**Cons:**
- Requires new API integration
- May have usage limits/costs
- Need to check BGG's ToS regarding third-party proxies

---

## 🔍 What We Know

### Test Results
```bash
# Test from local environment
Response Status: 401 Unauthorized
→ BGG API requires authentication
```

### Affected Files
- [app/api/games/[id]/thumbnail/route.ts](packages/marketplace/app/api/games/[id]/thumbnail/route.ts) - Thumbnail fetching API
- [lib/bgg-api.ts](packages/marketplace/lib/bgg-api.ts) - BGG API client
- [lib/bgg-config.ts](packages/marketplace/lib/bgg-config.ts) - BGG configuration

### What's Working
- ✅ Database search
- ✅ Game selection
- ✅ Thumbnail API endpoint
- ✅ Image lazy-loading

### What's Not Working
- ❌ BGG API requests (401 Unauthorized)
- ❌ Thumbnail fetching from BGG
- ❌ Image URLs population

---

## 📋 Verification Checklist

Once you implement a solution, verify:

- [ ] Test thumbnail loading on /sell page
- [ ] Search for "Catan" - thumbnail should appear
- [ ] Check browser console - no "⚠️ No thumbnail available" warnings
- [ ] Check Vercel logs - no 401 errors from BGG
- [ ] Test on multiple games (at least 5)
- [ ] Verify thumbnails are cached in database:
  ```sql
  SELECT id, name, thumbnail FROM games WHERE thumbnail IS NOT NULL LIMIT 10;
  ```

---

## 🚀 Next Steps

**Recommended Path:**
1. ✅ **Today:** Email BGG support (Option A)
2. ⏳ **While waiting:** Try caching script (Option B)
3. 📧 **If BGG approves:** Update .env with any credentials they provide
4. 🔄 **Redeploy:** Push to Vercel with new environment variables
5. ✅ **Test:** Verify thumbnails load on production

**Expected Timeline:**
- BGG response: 1-2 business days
- Implementation: 30 minutes
- Testing: 15 minutes
- **Total:** 1-3 days

---

## 📚 Resources

**Created Files:**
- [test-bgg-api.mjs](test-bgg-api.mjs) - Local BGG API test script
- [cache-bgg-thumbnails.ts](packages/marketplace/scripts/cache-bgg-thumbnails.ts) - Thumbnail caching script
- [BGG_API_TROUBLESHOOTING.md](BGG_API_TROUBLESHOOTING.md) - Full troubleshooting guide

**BGG Documentation:**
- [BGG XML API v2](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- [BGG API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use)
- [BGG Developer Forum](https://boardgamegeek.com/forum/974616/boardgamegeek/bgg-developers-guild)

**Support:**
- BGG: support@boardgamegeek.com
- Your app: aigars@secondturn.games

---

## 💡 Future Improvements

Once BGG access is resolved:

1. **Implement retry logic** for failed thumbnail fetches
2. **Add fallback images** for games without thumbnails
3. **Monitor BGG API health** and alert on failures
4. **Consider CDN caching** for BGG images (check ToS first)
5. **Pre-cache top 1000 games** during off-peak hours

---

**Status:** 🟡 Waiting for BGG API authentication resolution
**Priority:** High - affects user experience on /sell page
**Owner:** @aigars
**Last Updated:** 2025-11-10
