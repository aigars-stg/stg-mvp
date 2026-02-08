# BGG Integration Reference (Extracted from V1)

> **Purpose**: Complete reference document for rebuilding BGG integration in V2
> **Source**: Second Turn Games V1 codebase (`/packages/marketplace`)
> **Extracted**: 2026-01-29

---

## 1. Executive Summary

### Architecture Overview
V1 uses a **hybrid data strategy**:
1. **CSV Seeding**: Bulk import 170k+ games from BGG CSV (id, name, year, rating, is_expansion)
2. **On-Demand API Fetching**: Rich metadata (images, versions, expansions) fetched from BGG XML API when users interact with games
3. **Database Caching**: Metadata cached in Supabase with 30-day TTL
4. **In-Memory Caching**: 24-hour cache for API responses to reduce BGG load

### Key Decisions & Patterns
| Decision | Implementation | Rationale |
|----------|----------------|-----------|
| XML Parser | `fast-xml-parser` v5.3.0 | Fast, handles BGG's XML structure well |
| HTML Entity Decoding | `he` library | BGG returns `&#039;`, `&amp;` in text |
| Expansion Detection | 3-step classification using inbound links | BGG search API misclassifies many expansions |
| Rate Limiting | 1000ms default (configurable), 15s timeout | BGG has aggressive rate limits |
| Caching | In-memory (24h) + Database (30d) | Balance freshness vs API load |
| Fallback Mode | Manual input when BGG data incomplete | Handles obscure games gracefully |

### Critical Files
```
lib/bgg-api.ts         # Core API integration (953 lines)
lib/bgg-types.ts       # TypeScript interfaces
lib/bgg-classifier.ts  # Expansion detection algorithm
lib/bgg-config.ts      # Configuration and headers
lib/bgg-errors.ts      # Structured error handling
lib/bgg-utils.ts       # HTML decoding, language mapping
scripts/import-bgg-csv.ts  # CSV seeding script
```

---

## 2. CSV Seeding Process

### Script Location
`packages/marketplace/scripts/import-bgg-csv.ts`

### CSV Source
`/boardgames_ranks.csv` - 170,217 games from BGG database dump

### CSV Columns Used
```typescript
interface CSVRow {
  id: string;           // BGG game ID
  name: string;         // Primary game title
  yearpublished: string;
  bayesaverage: string; // Bayesian average rating (more reliable than simple average)
  is_expansion: string; // "1" or "0"
}
```

### Import Process
```typescript
// 1. Parse CSV using csv-parser (CommonJS)
const csv = require('csv-parser');

// 2. Convert rows to database format
const game: Game = {
  id: parseInt(row.id),
  name: row.name,
  yearpublished: row.yearpublished ? parseInt(row.yearpublished) : null,
  bayesaverage: row.bayesaverage ? parseFloat(row.bayesaverage) : null,
  is_expansion: row.is_expansion === '1',
};

// 3. Batch insert with upsert (handles re-runs)
const BATCH_SIZE = 1000;
await supabase.from('games').upsert(batch, { onConflict: 'id' });
```

### Running the Script
```bash
cd packages/marketplace
npx tsx scripts/import-bgg-csv.ts
```

### Important Notes
- Requires `.env.local` with Supabase credentials
- Uses service role key (bypasses RLS)
- Safe to re-run (upsert on game ID)
- Progress logged every 10k rows

---

## 3. BGG XML API Endpoints

### Base URL
```typescript
const API_BASE_URL = 'https://boardgamegeek.com/xmlapi2';
```

### Endpoints Used

#### 1. Search Games
```
GET /xmlapi2/search?query={query}&type=boardgame[&exact=1]
```

**Parameters**:
- `query`: URL-encoded search string
- `type=boardgame`: Filter to board games only
- `exact=1`: (optional) Exact match mode

**Response XML**:
```xml
<items total="123">
  <item type="boardgame" id="12345">
    <name type="primary" value="Terra Mystica"/>
    <yearpublished value="2012"/>
  </item>
</items>
```

#### 2. Game Details with Stats
```
GET /xmlapi2/thing?id={gameId}&stats=1
```

**Parameters**:
- `id`: BGG game ID (can be comma-separated for batch)
- `stats=1`: Include ratings statistics

**Response XML** (key fields):
```xml
<items>
  <item type="boardgame" id="120677">
    <name type="primary" value="Terra Mystica"/>
    <name type="alternate" value="神秘大地"/>
    <yearpublished value="2012"/>
    <minplayers value="2"/>
    <maxplayers value="5"/>
    <minage value="12"/>
    <playingtime value="150"/>
    <thumbnail>https://cf.geekdo-images.com/...</thumbnail>
    <image>https://cf.geekdo-images.com/...</image>
    <description>...</description>

    <!-- Links are CRITICAL for expansion detection -->
    <link type="boardgamedesigner" id="4300" value="Helge Ostertag"/>
    <link type="boardgameexpansion" id="146021" value="Fire &amp; Ice" inbound="false"/>
    <link type="boardgameexpansion" id="120677" value="Terra Mystica" inbound="true"/>

    <statistics>
      <ratings>
        <average value="8.16"/>
        <bayesaverage value="7.94"/>  <!-- More reliable -->
      </ratings>
    </statistics>
  </item>
</items>
```

#### 3. Game Versions/Editions
```
GET /xmlapi2/thing?id={gameId}&versions=1
```

**Response XML** (version structure):
```xml
<versions>
  <item type="boardgameversion" id="123456">
    <name type="primary" value="English first edition"/>
    <yearpublished value="2012"/>
    <productcode value="ZMG71240"/>
    <thumbnail>https://cf.geekdo-images.com/...</thumbnail>
    <image>https://cf.geekdo-images.com/...</image>
    <link type="boardgamepublisher" id="538" value="Z-Man Games"/>
    <link type="language" id="2184" value="English"/>
  </item>
</versions>
```

#### 4. Batch Expansion Fetching
```
GET /xmlapi2/thing?id={id1},{id2},{id3}&versions=1
```
- Up to 20 IDs per request
- Returns full details for each expansion

---

## 4. XML Parsing Implementation

### Parser Setup
```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',  // Attributes become @_name, @_value, etc.
});

const parsed = parser.parse(xmlString) as BGGXMLResponse;
```

### Handling Arrays vs Single Items
BGG XML returns single items as objects, multiple as arrays. Must normalize:

```typescript
// Names can be single object or array
const names: BGGXMLName[] = item.name
  ? (Array.isArray(item.name) ? item.name : [item.name])
  : [];

// Same pattern for links, versions, etc.
const links: BGGXMLLink[] = item.link
  ? (Array.isArray(item.link) ? item.link : [item.link])
  : [];
```

### XML Type Interfaces
```typescript
interface BGGXMLName {
  '@_type'?: string;   // 'primary' or 'alternate'
  '@_value': string;
}

interface BGGXMLLink {
  '@_id': string;
  '@_type': string;    // 'boardgamedesigner', 'boardgameexpansion', etc.
  '@_value': string;
  '@_inbound'?: string; // 'true' if link points TO this game
}

interface BGGXMLVersion {
  '@_id': string;
  name?: BGGXMLName | BGGXMLName[];
  yearpublished?: { '@_value': string };
  productcode?: { '@_value': string };
  thumbnail?: string;
  image?: string;
  link?: BGGXMLLink | BGGXMLLink[];
}
```

### HTML Entity Decoding
BGG returns HTML entities that must be decoded:

```typescript
import { decode } from 'he';

export function decodeHTMLEntities(text: string | undefined | null): string {
  if (!text) return '';
  return decode(text);
}

// Examples:
// "Embosca&#039;t" → "Embosca't"
// "Zombies &amp; More" → "Zombies & More"
// "L&#x27;A&eacute;ropostale" → "L'Aéropostale"
```

---

## 5. Rate Limiting & Retry Strategy

### Configuration
```typescript
// lib/bgg-config.ts
export const BGG_CONFIG = {
  RATE_LIMIT_MS: parseInt(process.env.BGG_API_RATE_LIMIT_MS || '1000'),
  API_TOKEN: process.env.BGG_API_TOKEN,  // Optional auth token
  API_BASE_URL: 'https://boardgamegeek.com/xmlapi2',
};
```

### Request Headers
```typescript
export function createBGGHeaders(): HeadersInit {
  const domain = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'https://secondturn.games';

  const headers: HeadersInit = {
    'User-Agent': `SecondTurnGames/1.0 (${domain}; aigars@secondturn.games)`,
  };

  // Optional auth token (server-side only)
  const token = process.env.BGG_API_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
```

### Timeout Handling
```typescript
// 15-second timeout per request
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);

const response = await fetch(url, {
  signal: controller.signal,
  headers: createBGGHeaders(),
});

clearTimeout(timeoutId);
```

### Error Status Handling
```typescript
// Check response status
if (response.status === 429) {
  throw createRateLimitError(`game ${gameId}`, 5);
}

if (response.status >= 500) {
  throw createAPIUnavailableError(response.status, `game ${gameId}`);
}

if (response.status === 404) {
  return null; // Game not found - not an error
}
```

### Stale Cache Fallback
When errors occur, system checks if stale cached data can be used:

```typescript
export class BGGError extends Error {
  canUseStaleCacheFallback(): boolean {
    // These error types allow stale cache fallback
    return ['RATE_LIMIT', 'API_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT'].includes(this.code);
  }
}

// Usage in fetch functions:
if (bggError.canUseStaleCacheFallback()) {
  const stale = getStaleCache(metadataCache, gameId);
  if (stale) {
    console.warn(`Using ${stale.age}h old cached data (Reason: ${error.code})`);
    return stale.data;
  }
}
```

### Error Types
```typescript
type BGGErrorCode =
  | 'RATE_LIMIT'        // BGG 429 - too many requests
  | 'NETWORK_ERROR'     // Fetch failed, no internet
  | 'API_UNAVAILABLE'   // BGG server down (500, 502, 503)
  | 'PARSE_ERROR'       // Invalid XML response
  | 'TIMEOUT'           // Request took too long (15s)
  | 'UNKNOWN';
```

---

## 6. Caching Strategy

### In-Memory Caching (24 hours)
```typescript
// Four separate caches
const searchCache = new Map<string, { data: BGGGame[]; timestamp: number }>();
const gameDetailsCache = new Map<number, { data: BGGGame; timestamp: number }>();
const versionCache = new Map<number, { data: BGGVersion[]; timestamp: number }>();
const metadataCache = new Map<number, { data: BGGGameMetadata; timestamp: number }>();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}
```

### Database Caching (30 days)
```typescript
// Check if we have fresh metadata (< 30 days old)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const hasFreshMetadata =
  game.metadata_fetched_at && new Date(game.metadata_fetched_at) > thirtyDaysAgo;

if (hasFreshMetadata && game.versions) {
  // Use cached database data
  return { game, versions: game.versions };
}

// Otherwise fetch fresh from BGG API and update database
const { metadata, versions } = await fetchGameWithFallback(gameId);

await supabase.from('games').update({
  thumbnail: metadata.thumbnail,
  image: metadata.image,
  versions: versions,
  // ... other fields
  metadata_fetched_at: new Date().toISOString(),
}).eq('id', gameId);
```

### What Gets Cached Where

| Data | In-Memory (24h) | Database (30d) |
|------|-----------------|----------------|
| Search results | ✓ | - |
| Game metadata | ✓ | ✓ |
| Versions/editions | ✓ | ✓ |
| Alternate names | - | ✓ |
| Thumbnails/images | - | ✓ |
| Description | - | ✓ |
| Designers | - | ✓ |

---

## 7. Game Versions & Editions (CRITICAL)

### Why This Is Complex
The Baltic market needs version/edition tracking because:
- Games sold in Latvian/Lithuanian/Estonian languages
- Different publishers for different regions
- Version-specific box art
- Users need to match language when selling

### Version Type Definition
```typescript
export interface BGGVersion {
  id: number;
  name: string;
  publisher?: string;        // Primary publisher (backward compat)
  publishers?: string[];     // All publishers
  language?: string;         // Primary language (backward compat)
  languages?: string[];      // All languages (multilingual editions)
  languageId?: number;
  languageIds?: number[];
  yearPublished?: number;
  productCode?: string;
  thumbnail?: string;
  image?: string;
}
```

### Fetching Versions
```typescript
export async function getGameVersions(gameId: number): Promise<BGGVersion[]> {
  const response = await fetch(
    `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&versions=1`,
    { headers: createBGGHeaders() }
  );

  const xml = await response.text();
  const parsed = parser.parse(xml);

  const versionsArray = parsed.items?.item?.versions?.item || [];

  return versionsArray.map((version) => {
    const versionLinks = version.link ?
      (Array.isArray(version.link) ? version.link : [version.link]) : [];

    // Extract ALL publishers (some versions have multiple)
    const publisherLinks = versionLinks.filter((l) => l['@_type'] === 'boardgamepublisher');
    const publishers = publisherLinks.map((l) => decodeHTMLEntities(l['@_value']));

    // Extract ALL languages (multilingual versions exist)
    const languageLinks = versionLinks.filter((l) => l['@_type'] === 'language');
    const languages = languageLinks.map((l) => decodeHTMLEntities(l['@_value']));
    const languageIds = languageLinks.map((l) => parseInt(l['@_id']));

    return {
      id: parseInt(version['@_id']),
      name: decodeHTMLEntities(version.name?.['@_value']),
      publisher: publishers[0],
      publishers: publishers.length > 0 ? publishers : undefined,
      language: languages[0],
      languages: languages.length > 0 ? languages : undefined,
      languageId: languageIds[0],
      languageIds: languageIds.length > 0 ? languageIds : undefined,
      yearPublished: version.yearpublished?.['@_value'],
      thumbnail: version.thumbnail || item.thumbnail,  // Fallback to game image
      image: version.image || item.image,
    };
  });
}
```

### Language ID Mapping (Baltic Market Focus)
```typescript
const LANGUAGE_MAP: Record<number, { name: string; flag: string; code: string }> = {
  2184: { name: 'English', flag: '🇬🇧', code: 'en' },
  2475: { name: 'Latvian', flag: '🇱🇻', code: 'lv' },   // BALTIC
  2481: { name: 'Lithuanian', flag: '🇱🇹', code: 'lt' }, // BALTIC
  2474: { name: 'Estonian', flag: '🇪🇪', code: 'et' },   // BALTIC
  2219: { name: 'Russian', flag: '🇷🇺', code: 'ru' },    // Common in Baltics
  2165: { name: 'German', flag: '🇩🇪', code: 'de' },
  2480: { name: 'Polish', flag: '🇵🇱', code: 'pl' },
  2241: { name: 'French', flag: '🇫🇷', code: 'fr' },
  2274: { name: 'Spanish', flag: '🇪🇸', code: 'es' },
  2264: { name: 'Italian', flag: '🇮🇹', code: 'it' },
};

export function getLanguageInfo(languageId: number) {
  return LANGUAGE_MAP[languageId] || { name: 'Unknown', flag: '🌍', code: 'unknown' };
}
```

### Manual Version Fallback
When BGG has no version data (obscure games):
```typescript
export interface ManualVersion extends Omit<BGGVersion, 'id'> {
  id: 0;           // Sentinel value
  isManual: true;  // Type discrimination flag
  name: string;    // User-provided
  publisher?: string;
  language?: string;
  yearPublished?: number;
  thumbnail?: string;  // From user photos
  image?: string;
}

export type VersionSelection = BGGVersion | ManualVersion;

export function isManualVersion(version: VersionSelection | null): version is ManualVersion {
  return version !== null && 'isManual' in version && version.isManual === true;
}
```

---

## 8. Expansion Handling (CRITICAL)

### The Problem
BGG's search API often marks expansions as `type="boardgame"` instead of `type="boardgameexpansion"`. This causes expansions to appear in base game searches.

**Example**: "Catan: Cities & Knights" returns `type="boardgame"` but IS an expansion.

### The Solution: 3-Step Classification
```typescript
// lib/bgg-classifier.ts

export function isExpansion(metadata: BGGGameMetadata): boolean {
  // Step 1: Check explicit type (catches obvious cases)
  if (metadata.type === 'boardgameexpansion') {
    return true;
  }

  // Step 2: Check inbound expansion links (CRITICAL for false positives)
  // If other games have this game as their expansion, it's an expansion
  const hasExpansionLinks = metadata.inboundLinks.some(
    (link) =>
      link.type === 'boardgameexpansion' ||
      link.type === 'boardgameintegration'
  );

  if (hasExpansionLinks) {
    return true;
  }

  // Step 3: Check outbound links (this game expands another)
  const expandsAnotherGame = metadata.outboundLinks.some(
    (link) => link.type === 'boardgameexpansion'
  );

  return expandsAnotherGame;
}
```

### Understanding Inbound vs Outbound Links

**Inbound Link** (`inbound="true"`):
- Another game lists THIS game as an expansion
- If Terra Mystica has `inbound="true"` from Fire & Ice, it means Fire & Ice expands Terra Mystica
- Terra Mystica is the BASE game

**Outbound Link** (`inbound="false"` or no attribute):
- THIS game expands another game
- If Fire & Ice has `inbound="false"` to Terra Mystica, Fire & Ice IS the expansion

### Classification with Confidence
```typescript
export function classifyGame(metadata: BGGGameMetadata): {
  type: 'base' | 'expansion' | 'standalone-expansion' | 'compilation';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  // Compilation check first
  if (isCompilation(metadata)) {
    return {
      type: 'compilation',
      confidence: 'high',
      reason: 'Game is marked as a compilation',
    };
  }

  // Standalone expansion (can play without base)
  if (isStandaloneExpansion(metadata)) {
    return {
      type: 'standalone-expansion',
      confidence: 'high',
      reason: 'Can be played standalone but expands another game',
    };
  }

  // Regular expansion
  if (isExpansion(metadata)) {
    const expansionLinks = metadata.inboundLinks.filter(
      (link) => link.type === 'boardgameexpansion'
    );

    if (expansionLinks.length > 0) {
      return {
        type: 'expansion',
        confidence: 'high',
        reason: `Expands: ${expansionLinks.map((l) => l.value).join(', ')}`,
      };
    }

    return {
      type: 'expansion',
      confidence: 'medium',
      reason: 'Marked as expansion type',
    };
  }

  // Base game (default)
  return {
    type: 'base',
    confidence: metadata.inboundLinks.length === 0 ? 'high' : 'medium',
    reason: 'No expansion links found',
  };
}
```

### Fetching Expansions for a Base Game
```typescript
export async function fetchExpansionsForGame(gameId: number): Promise<BGGExpansionInfo[]> {
  // 1. Get base game metadata to find expansion IDs
  const metadata = await fetchGameMetadata(gameId);

  // 2. Filter outbound links to get expansion IDs
  const expansionLinks = (metadata.outboundLinks || []).filter(
    (link) => link.type === 'boardgameexpansion'
  );

  const expansionIds = expansionLinks.map((link) => parseInt(link.id));

  // 3. Batch fetch (up to 20 per request)
  const BATCH_SIZE = 20;
  const expansions: BGGExpansionInfo[] = [];

  for (let i = 0; i < expansionIds.length; i += BATCH_SIZE) {
    const batchIds = expansionIds.slice(i, i + BATCH_SIZE);
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${batchIds.join(',')}&versions=1`,
      { headers: createBGGHeaders() }
    );

    // Parse each expansion with versions and alternate names
    // ... (see full implementation in bgg-api.ts)
  }

  return expansions;
}
```

### Expansion Info Type
```typescript
export interface BGGExpansionInfo {
  bgg_id: number;
  name: string;
  year: number | null;
  thumbnail: string | null;
  image: string | null;
  versions: BGGVersion[];
  alternateNames?: string[];  // Localized names (e.g., "Spārnotie: Eiropas putni")
}
```

---

## 9. Search Implementation

### Dual-Layer Search Strategy

**Layer 1: Database Search (Primary)**
- Fast indexed search on local database
- Searches both `name` and `alternate_names` columns
- Relevance scoring for result ordering
- Called via `GET /api/games/search?q={query}`

**Layer 2: BGG API Search (Discovery)**
- Used for initial game discovery when creating listings
- Smart exact-then-fuzzy strategy
- Results enriched with metadata for expansion filtering

### Database Search Implementation
```typescript
// app/api/games/search/route.ts

// Relevance scoring algorithm
function calculateRelevance(
  gameName: string,
  query: string,
  alternateNames: string[] | null,
  matchedInAlternate: boolean
): number {
  const lowerName = gameName.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let score = 0;

  // Exact match (highest priority)
  if (lowerName === lowerQuery) score = 1000;
  // Starts with query
  else if (lowerName.startsWith(lowerQuery)) score = 900;
  // Word starts with query (e.g., "Terra" matches "Terra Mystica")
  else if (lowerName.split(/[:\s-]/).some((word) => word.startsWith(lowerQuery))) score = 800;
  // Contains as substring
  else score = 500;

  // 10% reduction for alternate name matches (prefer primary)
  if (matchedInAlternate && !lowerName.includes(lowerQuery)) {
    score = score * 0.9;
  }

  return score;
}
```

### Sorting Order
1. **Relevance score** (exact > starts with > word match > substring)
2. **Base games before expansions** (when base_games_only=true)
3. **Bayesian average rating** (higher rated games first)

### BGG API Smart Search
```typescript
// lib/bgg-api.ts

export async function searchGames(query: string): Promise<BGGGame[]> {
  // For queries >= 4 characters: exact-then-fuzzy strategy
  if (query.length >= 4) {
    // Try exact match first
    const exactResults = await performBGGSearch(query, true);

    if (exactResults.length >= 3) {
      // Good exact matches found
      searchResults = exactResults;
    } else {
      // Combine exact + fuzzy (deduplicated)
      const fuzzyResults = await performBGGSearch(query, false);
      const exactIds = new Set(exactResults.map((r) => r['@_id']));
      const additionalFuzzy = fuzzyResults.filter((r) => !exactIds.has(r['@_id']));
      searchResults = [...exactResults, ...additionalFuzzy];
    }
  } else {
    // Short query: fuzzy only (exact too restrictive)
    searchResults = await performBGGSearch(query, false);
  }

  // CRITICAL: Fetch metadata for top 20 to classify expansions
  const enrichedResults = await Promise.all(
    searchResults.slice(0, 20).map(async (result) => {
      const metadata = await fetchGameMetadata(result.id);
      const classification = classifyGame(metadata);
      return {
        ...result,
        isExpansion: classification.type === 'expansion' ||
                     classification.type === 'standalone-expansion',
      };
    })
  );

  // Filter to base games only
  return enrichedResults.filter((game) => !game.isExpansion);
}
```

---

## 10. Database Schema

### Games Table
```sql
CREATE TABLE games (
  id INTEGER PRIMARY KEY,                    -- BGG game ID (not auto-generated)
  name TEXT NOT NULL,                        -- Primary game title
  yearpublished INTEGER,                     -- Year of first publication
  is_expansion BOOLEAN DEFAULT FALSE,        -- True if this is an expansion
  thumbnail TEXT,                            -- BGG thumbnail URL
  image TEXT,                                -- BGG full image URL
  alternate_names JSONB,                     -- Array of alternate titles ["神秘大地", "Terra Mystica (PL)"]
  versions JSONB,                            -- Array of BGGVersion objects
  bayesaverage DECIMAL(5,2),                 -- BGG Bayesian average rating
  player_count TEXT,                         -- e.g., "2-4"
  min_age INTEGER,                           -- Minimum recommended age
  playing_time TEXT,                         -- e.g., "60-90"
  description TEXT,                          -- Full game description
  designers JSONB,                           -- Array of designer names
  metadata_fetched_at TIMESTAMP,             -- When metadata was last fetched from BGG
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
-- Case-insensitive name search
CREATE INDEX idx_games_name_lower ON games(LOWER(name));

-- Fuzzy search with trigrams (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_games_name_trgm ON games USING gin (name gin_trgm_ops);

-- Partial index for base games only (fast filtering)
CREATE INDEX idx_games_base_games ON games(id) WHERE is_expansion = FALSE;

-- Sort by year and rating
CREATE INDEX idx_games_year ON games(yearpublished DESC);
CREATE INDEX idx_games_bayesaverage ON games(bayesaverage DESC NULLS LAST);
```

### Row Level Security
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games are publicly readable" ON games
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Service role can modify games" ON games
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 11. TypeScript Types

### Complete Type Definitions
```typescript
// lib/bgg-types.ts

export interface BGGGame {
  id: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
  designers?: string[];
  playerCount?: string;
  minAge?: number;
  playingTime?: string;
  description?: string;
  rating?: number;
  isExpansion?: boolean;
  alternateNames?: string[];
  matchedAlternateName?: string;  // Set when found via alternate name search
  _isStaleCache?: boolean;        // Indicates stale cache was used
  _cacheAge?: number;             // Hours since cache was fresh
}

export interface BGGVersion {
  id: number;
  name: string;
  publisher?: string;
  publishers?: string[];
  language?: string;
  languages?: string[];
  languageId?: number;
  languageIds?: number[];
  yearPublished?: number;
  productCode?: string;
  thumbnail?: string;
  image?: string;
}

export interface BGGInboundLink {
  id: string;
  type: string;      // 'boardgameexpansion', 'boardgameintegration', etc.
  value: string;     // Game name
  inbound: boolean;  // Direction of relationship
}

export interface BGGGameMetadata {
  id: number;
  name: string;
  type: string;      // 'boardgame', 'boardgameexpansion'
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
  alternateNames?: string[];
  designers?: string[];
  playerCount?: string;
  minAge?: number;
  playingTime?: string;
  description?: string;
  rating?: number;
  bayesaverage?: number;
  inboundLinks: BGGInboundLink[];
  outboundLinks: BGGInboundLink[];
}
```

---

## 12. Fallback Mode

### When Fallback Triggers
```typescript
export async function fetchGameWithFallback(gameId: number): Promise<{
  metadata: BGGGameMetadata | null;
  versions: BGGVersion[];
  fallbackMode: boolean;
  reason?: string;
}> {
  const [metadata, versions] = await Promise.all([
    fetchGameMetadata(gameId),
    getGameVersions(gameId),
  ]);

  let fallbackMode = false;
  let reason: string | undefined;

  // Case 1: Metadata fetch completely failed
  if (!metadata) {
    fallbackMode = true;
    reason = 'BGG metadata unavailable';
  }
  // Case 2: No cover image
  else if (!metadata.image && !metadata.thumbnail) {
    fallbackMode = true;
    reason = 'Missing cover image';
  }
  // Case 3: No version data
  else if (!versions || versions.length === 0) {
    fallbackMode = true;
    reason = 'No version data available';
  }

  return { metadata, versions, fallbackMode, reason };
}
```

### Image Fallback for Versions
When versions don't have their own images, use the game's image:
```typescript
if (!fallbackMode && metadata && versions.length > 0) {
  versions = versions.map(version => {
    if (!version.thumbnail && !version.image) {
      return {
        ...version,
        thumbnail: metadata.thumbnail,
        image: metadata.image,
      };
    }
    return version;
  });
}
```

---

## 13. Environment Variables

```bash
# Required for BGG API
BGG_API_RATE_LIMIT_MS=1000  # Delay between requests (default: 1000)
BGG_API_TOKEN=              # Optional auth token from BGG

# Required for database
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For scripts

# Domain for User-Agent header
NEXT_PUBLIC_VERCEL_URL=your-deployment-url
```

---

## 14. Lessons Learned & Edge Cases

### Edge Case: HTML Entities in Names
**Problem**: BGG returns `&#039;` instead of `'`, `&amp;` instead of `&`
**Solution**: Use `he` library for decoding

### Edge Case: Expansions Misclassified as Base Games
**Problem**: BGG search API returns `type="boardgame"` for many expansions
**Solution**: 3-step classification using inbound links (see Section 8)

### Edge Case: Single Item vs Array in XML
**Problem**: BGG returns single items as objects, multiple as arrays
**Solution**: Always normalize with `Array.isArray(x) ? x : [x]`

### Edge Case: Games with No Versions
**Problem**: Obscure games have no version data
**Solution**: Fallback mode with manual input

### Edge Case: Multilingual Versions
**Problem**: Some editions have multiple languages (e.g., "English/German")
**Solution**: `languages[]` array instead of single `language`

### Edge Case: Rate Limiting
**Problem**: BGG aggressively rate limits (429 errors)
**Solution**: 1s delay + stale cache fallback + user-friendly error messages

---

## 15. Recommendations for V2

### Keep
1. **3-step expansion classification** - Essential for correct search results
2. **Hybrid data strategy** (CSV seed + on-demand API) - Good balance
3. **HTML entity decoding** with `he` library - Works perfectly
4. **Stale cache fallback** - Great UX during BGG outages
5. **Bayesian average** for ratings - More reliable than simple average

### Improve
1. **Consider Redis caching** instead of in-memory (for multi-instance deployments)
2. **Add request queue** for batch operations (instead of sequential delays)
3. **Cache expansion data** in database (currently only fetched on-demand)
4. **Background job for metadata refresh** (instead of on-demand 30-day check)

### Simplify
1. **Consolidate cache layers** - Current 2-layer system is complex
2. **Remove backward-compat fields** (`publisher` vs `publishers`)
3. **Standardize error handling** - Some functions throw, others return null

### New Considerations
1. **Consider BGG API v3** when available (currently in beta)
2. **Add webhook for BGG metadata updates** (if BGG ever supports it)
3. **Consider local image caching** to reduce BGG CDN load

---

## 16. API Route Summary

| Endpoint | Method | Purpose | BGG API Calls |
|----------|--------|---------|---------------|
| `/api/games/search` | GET | Search local DB | None |
| `/api/games/[id]` | GET | Game details + versions | `thing?stats=1`, `thing?versions=1` |
| `/api/games/[id]/versions` | GET | Just versions | `thing?versions=1` |
| `/api/games/[id]/thumbnail` | GET | Just thumbnail | `thing` (minimal) |

---

*This document was extracted from the Second Turn Games V1 codebase for reference during the V2 rebuild.*
