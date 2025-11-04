# Future Enhancements

## Search by Alternate Names (High Priority)

**Goal**: Allow users to search for games using localized/alternate names

**Problem**:
- User has a localized game "Mežā" (Latvian) but doesn't know it's called "Forest Shuffle" in English
- Search for "Mežā" returns no results
- User cannot list their game without knowing the English name

**Solution**:
1. Include `alternate_names` JSONB column in full-text search
2. Update search API to query both `name` and `alternate_names` fields
3. Populate common localized game names in database

**Implementation Steps**:

### 1. Update Search Query
```sql
-- Current search (simplified)
SELECT * FROM games
WHERE name ILIKE '%query%'

-- Enhanced search with alternate names
SELECT * FROM games
WHERE
  name ILIKE '%query%'
  OR alternate_names::text ILIKE '%query%'
```

### 2. Update FTS (Full-Text Search) Index
```sql
-- Create computed column for search
ALTER TABLE games
ADD COLUMN searchable_names tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple',
    name || ' ' ||
    COALESCE(array_to_string(alternate_names, ' '), '')
  )
) STORED;

-- Create GIN index for fast search
CREATE INDEX idx_games_searchable_names
ON games USING GIN (searchable_names);
```

### 3. Populate Localized Names

**Priority Games for Baltic Region**:
- Forest Shuffle → Mežā (Latvian)
- Sausage Sizzle → A.E.R.O (multiple regions)
- [Add more common localized games here]

**Data Source**:
- BGG API already provides alternate names
- Manual curation for most common games in target regions
- Community contributions

### 4. Update API
File: `app/api/games/search/route.ts`

```typescript
// Add alternate names to search
const { data: games } = await supabase
  .from('games')
  .select('*')
  .or(`name.ilike.%${query}%,alternate_names.cs.{${query}}`)
  .limit(limit);
```

**Benefits**:
- ✅ Better UX for non-English speakers
- ✅ Increased listing completion rate
- ✅ Broader game catalog coverage
- ✅ Reduced user frustration

**Complexity**: Medium (2-3 hours)
**Impact**: High (critical for localized markets)

---

## Other Enhancements

_Add other future enhancements here..._
