# Foreign Key Cascade Behaviors

This document maps all foreign key constraints and their ON DELETE behaviors in the Second Turn Games database.

**Source**: [000_consolidated_schema.sql](../supabase/migrations/000_consolidated_schema.sql)

**Last Updated**: 2026-01-24

---

## Overview

The database uses a **defensive cascade strategy**:

- **RESTRICT** on financial entities (orders, payouts) to preserve audit trails
- **CASCADE** on user-generated content (listings, messages) for clean deletion
- **SET NULL** on audit/analytics tables to preserve records anonymously
- **Soft-delete** on user profiles for GDPR compliance (90-day recovery period)

---

## User Deletion Cascade Chain

When a user deletes their account via `/api/auth/delete-account`:

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| user_profiles | id | auth.users(id) | CASCADE | 74 | Profile deleted with auth user |
| seller_profiles | user_id | user_profiles(id) | CASCADE | 109 | Seller data deleted with profile |
| listings | seller_id | user_profiles(id) | CASCADE | 208 | All listings deleted |
| wanted_listings | buyer_id | user_profiles(id) | CASCADE | 282 | All wanted listings deleted |
| conversations | buyer_id | user_profiles(id) | CASCADE | 384 | Conversations deleted |
| conversations | seller_id | user_profiles(id) | CASCADE | 385 | Conversations deleted |
| messages | sender_id | user_profiles(id) | CASCADE | 405 | Messages deleted |
| wanted_listing_responses | seller_id | user_profiles(id) | CASCADE | 307 | Responses deleted |
| login_activity | user_id | auth.users(id) | CASCADE | 453 | Login history deleted |
| security_audit_log | user_id | auth.users(id) | **SET NULL** | 472 | Events preserved, user_id nulled |
| user_feedback | user_id | auth.users(id) | **SET NULL** | 757 | Feedback preserved anonymously |
| newsletter_subscribers | user_id | auth.users(id) | **SET NULL** | 778 | Subscription preserved |

### Blocking Constraints

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| **orders** | **buyer_id** | **auth.users(id)** | **RESTRICT** | 520 | **BLOCKS deletion if orders exist** |
| **orders** | **seller_id** | **auth.users(id)** | **RESTRICT** | 521 | **BLOCKS deletion if orders exist** |

**Important**: Users with active orders cannot be deleted. The account deletion flow must handle this by:
1. Checking for active orders before deletion
2. Requiring order completion/cancellation first
3. Or implementing order migration to an "anonymous" user

---

## Listing Deletion Cascade Chain

When a listing is deleted or removed:

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| conversations | listing_id | listings(id) | CASCADE | 383 | Conversations deleted |
| basket_items | listing_id | listings(id) | CASCADE | - | Cart items removed |
| saved_listings | listing_id | listings(id) | CASCADE | - | Saved items removed |
| bids | listing_id | listings(id) | CASCADE | 344 | All bids deleted |
| listing_questions | listing_id | listings(id) | CASCADE | - | Q&A deleted |

### Blocking Constraints

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| listings | bgg_game_id | games(id) | **RESTRICT** | 164 | Cannot delete games with listings |
| **order_items** | **listing_id** | **listings(id)** | **RESTRICT** | 603 | **BLOCKS if in order history** |

**Important**: Listings that have been purchased cannot be deleted. This preserves order history for:
- Financial auditing
- Dispute resolution
- Tax reporting (DAC7)

---

## Order Deletion Cascade Chain

When an order is deleted (rare - typically orders are never deleted):

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| order_items | order_id | orders(id) | CASCADE | 602 | Line items deleted |
| order_issues | order_id | orders(id) | CASCADE | 619 | Disputes deleted |
| tracking_events | order_id | orders(id) | CASCADE | 645 | Tracking history deleted |
| seller_reviews | order_id | orders(id) | CASCADE | 714 | Reviews deleted |
| conversations | order_id | orders(id) | **SET NULL** | 386 | Conversation preserved, order_id nulled |

### Blocking Constraints

| Table | FK Column | Target | ON DELETE | Line | Impact |
|-------|-----------|--------|-----------|------|--------|
| **payout_transactions** | **order_id** | **orders(id)** | **RESTRICT** | 664 | **BLOCKS if payouts exist** |

**Important**: Orders with payout records cannot be deleted. This ensures:
- Complete financial audit trail
- Stripe reconciliation capability
- Tax compliance

---

## Soft-Delete Tables

These tables use `deleted_at` timestamps instead of hard deletes:

| Table | Column | Line | Retention | Purpose |
|-------|--------|------|-----------|---------|
| user_profiles | deleted_at | 84 | 90 days | GDPR compliance, dispute resolution |
| listing_questions | deleted_at | 332 | Indefinite | Thread integrity |
| messages | deleted_at | 410 | Indefinite | Conversation history |

### User Profile Soft-Delete Flow

1. User requests deletion via `/api/auth/delete-account`
2. `deleted_at` set to current timestamp
3. `recovery_deadline` set to 14 days from now
4. Email anonymized in `auth.users`
5. `original_email` preserved for recovery
6. After 14 days: No recovery possible
7. After 90 days: Permanent deletion via cleanup cron

See [GDPR_ACCOUNT_DELETION.md](./GDPR_ACCOUNT_DELETION.md) for full details.

---

## Key Constraints Summary

### RESTRICT (Blocks Deletion)

These constraints **prevent deletion** to protect data integrity:

| Constraint | Reason |
|------------|--------|
| `orders.buyer_id` → auth.users | Preserve order history |
| `orders.seller_id` → auth.users | Preserve order history |
| `order_items.listing_id` → listings | Preserve purchase records |
| `payout_transactions.order_id` → orders | Preserve financial audit trail |
| `listings.bgg_game_id` → games | Protect game catalog integrity |
| `wanted_listings.bgg_game_id` → games | Protect game catalog integrity |

### SET NULL (Preserves Record, Clears Reference)

These constraints **preserve records** but clear the user reference:

| Constraint | Reason |
|------------|--------|
| `security_audit_log.user_id` | Audit events must be preserved |
| `user_feedback.user_id` | Feedback preserved anonymously |
| `newsletter_subscribers.user_id` | Subscription status preserved |
| `conversations.order_id` | Conversation preserved after order issues |
| `message_read_status.last_read_message_id` | Status preserved after message deletion |

### CASCADE (Deletes Dependent Records)

These constraints **delete dependent records** for clean removal:

| Scope | What Gets Deleted |
|-------|-------------------|
| User deletion | Listings, wanted_listings, conversations, messages, bids, login_activity |
| Listing deletion | Conversations, bids, saved_listings, basket_items, listing_questions |
| Order deletion | Order_items, order_issues, tracking_events, seller_reviews |

---

## Potential Issues & Recommendations

### 1. User Deletion with Active Orders

**Issue**: Users cannot be deleted if they have orders (RESTRICT constraint).

**Current Handling**: The deletion flow checks for active orders and blocks deletion if found.

**Recommendation**: Consider implementing order anonymization for completed orders older than N years, allowing eventual user deletion.

### 2. Conversation Preservation

**Issue**: When a listing is deleted, related conversations are cascade-deleted.

**Consideration**: If conversation history should be preserved for support purposes, change to SET NULL and handle orphaned conversations.

### 3. Review Preservation

**Issue**: Seller reviews are cascade-deleted when orders are deleted.

**Current State**: Orders are rarely/never deleted, so reviews are preserved.

**Recommendation**: If order deletion becomes a feature, change to SET NULL to preserve review history.

---

## Testing Cascade Behaviors

To verify cascade behaviors in development:

```sql
-- Check what would be affected by user deletion
SELECT
  'listings' as table_name, COUNT(*) as count
FROM listings WHERE seller_id = 'USER_UUID'
UNION ALL
SELECT 'orders (blocking)', COUNT(*)
FROM orders WHERE buyer_id = 'USER_UUID' OR seller_id = 'USER_UUID'
UNION ALL
SELECT 'conversations', COUNT(*)
FROM conversations WHERE buyer_id = 'USER_UUID' OR seller_id = 'USER_UUID';

-- Check what would be affected by listing deletion
SELECT
  'bids' as table_name, COUNT(*) as count
FROM bids WHERE listing_id = 'LISTING_UUID'
UNION ALL
SELECT 'order_items (blocking)', COUNT(*)
FROM order_items WHERE listing_id = 'LISTING_UUID'
UNION ALL
SELECT 'conversations', COUNT(*)
FROM conversations WHERE listing_id = 'LISTING_UUID';
```
