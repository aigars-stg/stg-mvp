# Hybrid BGG Search Setup Guide

## Architecture Overview

**Design Philosophy:** Minimal local database for instant search, BGG API for detailed metadata on-demand.

```
User searches → Supabase (170k games, <500ms) → Results displayed
User selects → BGG API (full metadata) → Cache in Supabase (30 days)
```

### **Why This Works:**

1. **Instant Search:** 170k games searchable in < 500ms (database index)
2. **Fresh Metadata:** Full BGG data fetched only when needed
3. **Smart Caching:** Metadata cached for 30 days, reduces BGG API calls by 95%+
4. **Lean Database:** Only 4 essential columns initially, grows as users select games

---

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project created ([supabase.com](https://supabase.com))
- ✅ `.env.local` with these variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- ✅ `boardgames_ranks.csv` in project root (170k games)
- ✅ Dependencies installed: `@supabase/supabase-js`, `csv-parser`, `tsx`

---

## Setup Instructions

### **Step 1: Create Database Schema**

**File:** [supabase/migrations/001_create_games_table.sql](supabase/migrations/001_create_games_table.sql)

**Action Required:**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the SQL from `001_create_games_table.sql`
5. Paste and click **Run**

**What This Creates:**
- `games` table with minimal columns: id, name, yearpublished, is_expansion
- Placeholder columns for BGG metadata (populated on-demand)
- Indexes for fast search (<500ms for 170k games)
- Trigram extension for fuzzy search
- Row-level security policy (public read access)

**Expected Output:**
```
Success. No rows returned
```

**Verify:**
- Go to **Table Editor** tab
- You should see the `games` table (empty, 0 rows)

---

### **Step 2: Import CSV Data**

**File:** [scripts/import-bgg-csv.ts](scripts/import-bgg-csv.ts)

**Run Import:**
```bash
cd packages/marketplace
npx tsx scripts/import-bgg-csv.ts
```

**Expected Output:**
```
🎲 Starting minimal BGG CSV import...
   Importing only: id, name, yearpublished, is_expansion

📂 Looking for CSV at: C:\Users\...\boardgames_ranks.csv

📊 Parsed 10,000 rows...
📊 Parsed 20,000 rows...
...
📊 Parsed 170,000 rows...

✅ CSV parsing complete:
   Total rows processed: 170,024
   Valid games: 170,024
   Parse errors: 0

📦 Inserting 171 batches into Supabase...
   (1,000 games per batch)

✅ Batch 10/171 (5.8%)
✅ Batch 20/171 (11.7%)
...
✅ Batch 171/171 (100.0%)

📊 Batch Insert Summary:
   Successful: 171/171
   Failed: 0/171

🔍 Verifying database...

🎉 Import Complete!

📊 Database Statistics:
   Total games: 170,024
   Base games: ~120,000
   Expansions: ~50,000

💡 Next Steps:
   1. Test search: Go to http://localhost:3002/sell
   2. Search for "Terra", "Wingspan", "Catan"
   3. Verify no expansions appear in results
   4. Click a game to test on-demand metadata fetching

✅ Script completed successfully
```

**If Import Fails:**

| Error | Solution |
|-------|----------|
| "CSV file not found" | Ensure `boardgames_ranks.csv` is in project root |
| "SUPABASE_SERVICE_ROLE_KEY not found" | Add to `.env.local` from Supabase Dashboard → Settings → API |
| "Batch X failed" | Check Supabase logs, may be rate limited (wait and retry) |
| "Error counting games" | Check RLS policies allow SELECT queries |

**Verify Import:**
1. Go to Supabase Dashboard → **Table Editor**
2. Click `games` table
3. Should see ~170,000 rows
4. Sample row should have: id, name, yearpublished, is_expansion
5. thumbnail, image, versions columns should be NULL (fetched on-demand)

---

### **Step 3: Test Search API**

**Endpoint:** `GET /api/games/search?q={query}&limit={limit}`

**Test in Browser:**
```
http://localhost:3002/api/games/search?q=terra&limit=10
```

**Expected Response:**
```json
{
  "games": [
    {
      "id": 120677,
      "name": "Terra Mystica",
      "yearpublished": 2012,
      "thumbnail": null
    },
    {
      "id": 167791,
      "name": "Terraforming Mars",
      "yearpublished": 2016,
      "thumbnail": null
    }
    // ... more results
  ],
  "count": 10,
  "query": "terra",
  "durationMs": 234
}
```

**Console Output:**
```
🔍 [Search API] Searching for: "terra"
✅ [Search API] Found 10 results in 234ms
```

**Verify:**
- ✅ Response in <500ms
- ✅ No expansions in results (is_expansion filtered)
- ✅ Results ordered alphabetically
- ✅ thumbnail is null (will be fetched on-demand)

---

### **Step 4: Test Game Details API**

**Endpoint:** `GET /api/games/[id]`

**Test in Browser:**
```
http://localhost:3002/api/games/174430
```
(Terra Mystica ID)

**Expected Response (First Call):**
```json
{
  "game": {
    "id": 174430,
    "name": "Terra Mystica",
    "yearpublished": 2012,
    "is_expansion": false,
    "thumbnail": "https://cf.geekdo-images.com/...",
    "image": "https://cf.geekdo-images.com/...",
    "metadata_fetched_at": "2025-01-15T10:30:00.000Z",
    "created_at": "2025-01-15T09:00:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Console Output:**
```
📡 [Game Details] Fetching game 174430
📡 [Game Details] Fetching fresh metadata from BGG...
📡 [BGG API] Fetching metadata for game 174430
✅ [Game Details] Cached metadata for Terra Mystica
```

**Expected Response (Second Call, <30 days later):**
```
💾 [Game Details] Using cached metadata for Terra Mystica
```

**Verify:**
- ✅ First call takes 2-5 seconds (BGG API fetch)
- ✅ Second call is instant (< 100ms, cached)
- ✅ Thumbnail and image URLs populated
- ✅ metadata_fetched_at timestamp set

---

## File Structure

```
packages/marketplace/
├── supabase/
│   └── migrations/
│       └── 001_create_games_table.sql    # Database schema
├── lib/
│   └── supabase/
│       └── client.ts                      # Supabase client wrapper
├── scripts/
│   └── import-bgg-csv.ts                  # CSV import script
├── app/
│   └── api/
│       └── games/
│           ├── search/
│           │   └── route.ts               # Search API
│           └── [id]/
│               └── route.ts               # Game details API
└── .env.local                             # Environment variables
```

---

## Environment Variables Reference

Create `.env.local` in `packages/marketplace/`:

```bash
# Supabase Configuration (from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (KEEP SECRET! For server-side only)
# Used by import script and admin operations
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to Find:**
1. Go to Supabase Dashboard
2. Click your project
3. Go to **Settings** → **API**
4. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Testing Checklist

### **Phase 1: Database Setup**
- [ ] SQL migration ran successfully
- [ ] `games` table exists in Supabase
- [ ] Table has correct columns and indexes

### **Phase 2: CSV Import**
- [ ] Import script completed without errors
- [ ] 170k+ games in database
- [ ] Base games count ~120k
- [ ] Expansions count ~50k
- [ ] Sample rows have correct data

### **Phase 3: Search API**
- [ ] Search "Terra" returns results
- [ ] Response time < 500ms
- [ ] No expansions in results
- [ ] Results ordered alphabetically
- [ ] Handles empty query gracefully

### **Phase 4: Game Details API**
- [ ] First call fetches from BGG (2-5s)
- [ ] Second call uses cache (< 100ms)
- [ ] Thumbnails populated correctly
- [ ] metadata_fetched_at timestamp set
- [ ] 30-day cache expiry works

### **Phase 5: Integration**
- [ ] GameSearch component uses database
- [ ] Instant search results appear
- [ ] Selecting game triggers metadata fetch
- [ ] Error handling works (network issues, etc.)

---

## Performance Benchmarks

### **Expected Performance:**

| Operation | First Time | Cached | Target |
|-----------|-----------|--------|--------|
| Search query | < 500ms | < 100ms | ✅ Instant |
| Game details (no metadata) | < 100ms | < 50ms | ✅ Instant |
| Game details (fetch metadata) | 2-5s | < 100ms | ✅ Acceptable |
| CSV import | ~5-10 min | N/A | ✅ One-time |

### **Why This Is Fast:**

1. **Database Indexes:**
   - `idx_games_name_lower` → Case-insensitive search
   - `idx_games_name_trgm` → Fuzzy matching (trigrams)
   - `idx_games_base_games` → Filters expansions instantly

2. **Smart Caching:**
   - Search results: In-memory (Next.js)
   - Game metadata: Supabase (30 days)
   - BGG API: Called only once per game per month

3. **Minimal Data Transfer:**
   - Search: Only 4 columns (id, name, year, thumbnail)
   - Details: Only when user selects game
   - No unnecessary BGG calls

---

## Troubleshooting

### **Issue: "CSV file not found"**

**Solution:**
1. Verify file location:
   ```bash
   ls C:\Users\aigar\Documents\Claude\stg-mvp\boardgames_ranks.csv
   ```
2. If missing, download from BGG or update path in `import-bgg-csv.ts`

---

### **Issue: "Missing Supabase environment variables"**

**Solution:**
1. Check `.env.local` exists in `packages/marketplace/`
2. Verify all 3 variables are set
3. Restart dev server: `npm run dev`

---

### **Issue: "Batch X failed" during import**

**Possible Causes:**
- Rate limiting (too many inserts too fast)
- Network timeout
- RLS policy blocking inserts

**Solution:**
1. Check Supabase Dashboard → Logs → API Logs
2. If rate limited, add delay in script:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 100));
   ```
3. If RLS issue, verify service role key is correct

---

### **Issue: Search returns 0 results**

**Check:**
1. Is CSV imported? (Check Table Editor)
2. Is query ≥ 2 characters?
3. Are expansions being filtered correctly?

**Debug:**
```typescript
// In route.ts, temporarily remove expansion filter:
// .eq('is_expansion', false)  // Comment this out

// Should now return all games including expansions
```

---

### **Issue: Game details always fetches from BGG**

**Check:**
1. Is `metadata_fetched_at` being set correctly?
2. Is cache expiry logic correct (30 days)?

**Debug:**
```typescript
// Check database:
const { data } = await supabase
  .from('games')
  .select('metadata_fetched_at')
  .eq('id', gameId)
  .single();

console.log('Last fetched:', data.metadata_fetched_at);
```

---

## Next Steps After Setup

1. **Update GameSearch Component**
   - Remove old BGG API calls
   - Use `/api/games/search` endpoint
   - Handle thumbnails (may be null initially)

2. **Update Version Selector**
   - Use `/api/games/[id]` for metadata
   - Parse versions from cached BGG data
   - Fall back to basic info if metadata unavailable

3. **Add Analytics**
   - Track search queries (popular games)
   - Monitor cache hit rates
   - Alert on BGG API failures

4. **Optimize Further**
   - Add full-text search (tsquery/tsvector)
   - Implement autocomplete
   - Pre-warm cache for popular games

---

## Success Criteria

Setup is complete when:

- [ ] CSV imported: 170k games in Supabase
- [ ] Search is instant (< 500ms)
- [ ] "Terra" shows 10-20 results
- [ ] No expansions shown (is_expansion filter works)
- [ ] Can select game and see details
- [ ] Metadata fetches from BGG on first selection
- [ ] Second selection uses cached metadata
- [ ] No console errors

---

## Summary

**What You've Built:**

✅ Minimal local database (170k games, 4 columns)
✅ Instant search API (< 500ms)
✅ On-demand BGG metadata fetching
✅ Smart 30-day caching (reduces API calls 95%+)
✅ Scalable architecture (grows as users select games)

**User Experience:**

1. User searches "Wingspan" → Instant results from database
2. User selects game → Metadata fetched from BGG (2-5s first time)
3. User searches "Wingspan" again → Instant, with thumbnail
4. Another user searches "Wingspan" → Instant, uses cached metadata

**Result:** Best of both worlds - instant search + fresh metadata! 🚀
