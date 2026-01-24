# Schema Consolidation Analysis

**Generated**: 2026-01-24
**Source**: [000_consolidated_schema.sql](../supabase/migrations/000_consolidated_schema.sql)

---

## 1. Tables with Significant Column Overlap

### 1.1 Listings Auction Fields

**Current State**: `listings` table has 12 auction-specific columns that are NULL for 95%+ of listings.

```sql
-- Auction fields in listings table (lines 194-202)
auction_start_price DECIMAL(10,2),
auction_current_bid DECIMAL(10,2),
auction_bid_count INTEGER DEFAULT 0,
auction_ends_at TIMESTAMPTZ,
auction_duration_days INTEGER,
auction_winner_id UUID,
auction_winner_notified_at TIMESTAMPTZ,
auction_payment_deadline TIMESTAMPTZ,
auction_anti_snipe_extended BOOLEAN DEFAULT FALSE,
```

**Trade-off Analysis**:

| Approach | Pros | Cons |
|----------|------|------|
| **Keep merged** (current) | Single query for listing details, simpler RLS | Wide table, NULL bloat, confusing schema |
| **Split to `listing_auctions`** | Cleaner schema, smaller row size | Extra JOIN for auction listings, more complex queries |

**Recommendation**: **Keep merged**.
- Auctions are a core feature, not a rare edge case
- PostgreSQL handles NULLs efficiently (no storage for NULL columns in TOAST)
- The `listings_with_details` view already abstracts this
- Splitting would complicate the checkout flow significantly

---

### 1.2 Orders Shipping Fields

**Current State**: `orders` table has ~15 shipping-specific fields for terminal-to-terminal (Unisend) shipping.

```sql
-- T2T shipping fields
destination_country, destination_terminal_id, destination_terminal_name,
destination_terminal_address, sender_country, receiver_name, receiver_phone,
receiver_email, unisend_parcel_id, unisend_request_id, barcode, tracking_url,
label_url, label_generated_at, label_error
```

**Trade-off Analysis**:

| Approach | Pros | Cons |
|----------|------|------|
| **Keep merged** (current) | All order data in one place, simple queries | Wide table |
| **Split to `order_shipments`** | Cleaner separation, reusable for multiple shipments | Extra JOIN, no real benefit for single-shipment orders |

**Recommendation**: **Keep merged**.
- Orders always have exactly one shipment
- Shipping data is always fetched with order details
- No multi-shipment requirement on roadmap

---

## 2. Single-Column Junction Tables

### 2.1 `saved_listings` (Wishlist)

**Current State**:
```sql
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  notes TEXT,                    -- User can add notes
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, listing_id)
);
```

**Alternative**: Store as `UUID[]` array on `user_profiles`.

**Trade-off Analysis**:

| Approach | Pros | Cons |
|----------|------|------|
| **Junction table** (current) | Notes per item, timestamps, FK integrity | Extra table, JOIN required |
| **Array column** | Simpler queries, no JOIN | No notes, no timestamps, max ~1000 items, no FK validation |

**Recommendation**: **Keep junction table**.
- The `notes` field provides genuine value (users annotate why they saved)
- FK constraints prevent orphaned references when listings are deleted
- Timestamps enable "recently saved" sorting

---

### 2.2 `blocked_users`

**Current State**:
```sql
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES user_profiles(id),
  blocked_id UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (blocker_id, blocked_id)
);
```

**Alternative**: Store as `blocked_user_ids UUID[]` on `user_profiles`.

**Recommendation**: **Keep junction table**.
- The `reason` field is important for moderation/support
- Block relationships are queried from both directions (is_user_blocked checks both ways)
- Array approach would require checking two arrays for every interaction

---

## 3. Denormalized Data Causing Update Anomalies

### 3.1 `listings.game_name` (PROBLEMATIC)

**Current State**:
```sql
-- listings table
bgg_game_id INTEGER NOT NULL REFERENCES games(id),
game_name TEXT NOT NULL,  -- Duplicates games.name
```

**Issue**: If `games.name` is corrected (typo fix, official name change), `listings.game_name` becomes stale.

**Trade-off Analysis**:

| Approach | Pros | Cons |
|----------|------|------|
| **Keep denormalized** (current) | Fast queries, no JOIN | Update anomaly, stale data |
| **Remove, JOIN to games** | Single source of truth | Extra JOIN on every listing query |
| **Materialized view** | Fast reads, refreshable | Complexity, refresh lag |

**Recommendation**: **Keep denormalized** but add update trigger.

The denormalization is intentional for performance (listings are queried far more than games are updated). Add a trigger to propagate name changes:

```sql
-- Migration: 105_sync_game_names_trigger.sql
CREATE OR REPLACE FUNCTION sync_game_name_to_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE listings SET game_name = NEW.name WHERE bgg_game_id = NEW.id;
    UPDATE wanted_listings SET game_name = NEW.name WHERE bgg_game_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_game_names
  AFTER UPDATE OF name ON games
  FOR EACH ROW
  EXECUTE FUNCTION sync_game_name_to_listings();
```

---

### 3.2 `listings.seller_country` (PROBLEMATIC)

**Current State**:
```sql
-- listings table
seller_id UUID NOT NULL REFERENCES user_profiles(id),
seller_country VARCHAR(2),  -- Duplicates user_profiles.country
```

**Issue**: If seller changes country in profile, listings show old country.

**Recommendation**: **Remove column, use view**.

The `listings_with_details` view already joins `user_profiles` for seller info. The denormalized column is redundant.

```sql
-- Migration: 106_remove_listings_seller_country.sql

-- Step 1: Verify view already has seller_country from join
-- (It does - line 1104: pp.country AS seller_country)

-- Step 2: Remove redundant column
ALTER TABLE listings DROP COLUMN IF EXISTS seller_country;

-- Step 3: Update any direct queries to use the view
-- (Search codebase for .select('seller_country') on listings table)
```

**Codebase Impact**: Search for direct `seller_country` usage:
- If queries go through `listings_with_details` view: No change needed
- If queries select directly from `listings`: Update to use view or JOIN

---

### 3.3 `order_items.game_name` (INTENTIONAL - DO NOT CHANGE)

```sql
-- order_items table
game_name TEXT NOT NULL,  -- Snapshot at purchase time
bgg_game_id INTEGER NOT NULL,
price DECIMAL(10,2) NOT NULL,
condition TEXT NOT NULL,
```

**This is NOT denormalization** - it's intentional snapshotting. Order history must preserve the exact data at purchase time for:
- Legal/tax records
- Dispute resolution
- Historical accuracy

**Recommendation**: **Keep as-is**. This is correct design.

---

## 4. Tables Replaceable with Postgres ENUM Types

### 4.1 Status Fields Using CHECK Constraints

**Current Pattern** (repeated across many tables):
```sql
status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'sold', 'removed'))
```

**ENUM Alternative**:
```sql
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'removed');
-- Then: status listing_status NOT NULL DEFAULT 'draft'
```

**Trade-off Analysis**:

| Aspect | CHECK Constraint | ENUM Type |
|--------|------------------|-----------|
| **Adding values** | Easy (ALTER TABLE) | Requires migration (ALTER TYPE ADD VALUE) |
| **Removing values** | Easy | Impossible without table recreation |
| **Renaming values** | Easy (UPDATE + ALTER) | Impossible |
| **Type safety** | Runtime only | Compile-time in some ORMs |
| **Storage** | Variable (TEXT) | 4 bytes (integer internally) |
| **Performance** | Slightly slower | Slightly faster |

**Recommendation**: **Keep CHECK constraints** (current approach).

Reasons:
1. **Flexibility**: Status values change as features evolve. ENUMs are notoriously painful to modify.
2. **Supabase compatibility**: Some Supabase tooling handles TEXT better than custom ENUMs.
3. **TypeScript generation**: The current approach generates proper union types.
4. **Minimal performance difference**: For our scale, TEXT vs ENUM is negligible.

**Exception - Consider ENUM for**:
- `condition` ('likeNew', 'veryGood', 'good', 'acceptable') - Truly stable, never changes
- `country` ('LV', 'EE', 'LT', 'OTHER') - ISO codes, stable

But the migration effort isn't worth the minimal benefit.

---

## 5. Soft-Delete Pattern Standardization

### Current State

| Table | Column | Pattern | RLS Filter |
|-------|--------|---------|------------|
| `user_profiles` | `deleted_at` | Full soft-delete with recovery | `deleted_at IS NULL` |
| `listing_questions` | `deleted_at` | Soft-delete, no recovery | `deleted_at IS NULL` |
| `messages` | `deleted_at` | Soft-delete, no recovery | `deleted_at IS NULL` |
| `newsletter_subscribers` | `unsubscribed_at` | Soft unsubscribe (different semantic) | `unsubscribed_at IS NULL` |

### Inconsistencies

1. **Column naming**: `deleted_at` vs `unsubscribed_at` (acceptable - different semantics)
2. **No `deleted_by`**: Who deleted the record isn't tracked
3. **No cleanup**: No automated hard-delete after retention period (except user_profiles)

### Recommendation: Create Standardized Soft-Delete Pattern

```sql
-- Migration: 107_standardize_soft_delete.sql

-- 1. Add deleted_by to tables that need audit trail
ALTER TABLE listing_questions ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 2. Create helper function for soft-delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.deleted_at = NOW();
  NEW.deleted_by = auth.uid();
  RETURN NEW;
END;
$$;

-- 3. Document the pattern
COMMENT ON COLUMN listing_questions.deleted_at IS
'Soft-delete timestamp. Records with deleted_at IS NOT NULL are hidden from normal queries via RLS.
Cleanup: No automatic hard-delete - preserved for thread integrity.';

COMMENT ON COLUMN messages.deleted_at IS
'Soft-delete timestamp. Records with deleted_at IS NOT NULL are hidden from normal queries via RLS.
Cleanup: No automatic hard-delete - preserved for conversation history.';

COMMENT ON COLUMN user_profiles.deleted_at IS
'GDPR soft-delete timestamp. Triggers 14-day recovery window, then 90-day retention before hard-delete.
See: cleanup_deleted_accounts() cron job.';
```

---

## Summary: Recommended Actions

| Priority | Issue | Action | Migration |
|----------|-------|--------|-----------|
| **High** | `listings.game_name` stale data | Add sync trigger | `105_sync_game_names_trigger.sql` |
| **Medium** | `listings.seller_country` redundant | Remove column | `106_remove_listings_seller_country.sql` |
| **Low** | Soft-delete inconsistency | Add `deleted_by`, document | `107_standardize_soft_delete.sql` |
| **None** | Auction fields in listings | Keep merged | N/A |
| **None** | Junction tables | Keep as tables | N/A |
| **None** | CHECK vs ENUM | Keep CHECK constraints | N/A |

---

## Migration SQL for High-Priority Item

### 105_sync_game_names_trigger.sql

```sql
-- ============================================================================
-- Migration: Sync Game Names to Listings
-- Purpose: Prevent stale game_name in listings when games.name is corrected
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_game_name_to_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run if name actually changed
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Update listings
    UPDATE listings
    SET game_name = NEW.name, updated_at = NOW()
    WHERE bgg_game_id = NEW.id;

    -- Update wanted_listings
    UPDATE wanted_listings
    SET game_name = NEW.name, updated_at = NOW()
    WHERE bgg_game_id = NEW.id;

    RAISE NOTICE 'Synced game name change: % -> % (BGG ID: %)',
      OLD.name, NEW.name, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_game_names ON games;
CREATE TRIGGER sync_game_names
  AFTER UPDATE OF name ON games
  FOR EACH ROW
  EXECUTE FUNCTION sync_game_name_to_listings();

COMMENT ON FUNCTION sync_game_name_to_listings() IS
'Propagates game name changes to listings and wanted_listings tables.
Prevents stale denormalized data when game names are corrected in the catalog.';
```
