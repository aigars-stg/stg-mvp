-- Migration: Document RPC Functions
-- Purpose: Add comprehensive COMMENT statements to key RPC functions
-- Created: 2026-01-24

-- ============================================================================
-- CART FUNCTIONS DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_cart(UUID) IS
'Get cart contents for a buyer.

PARAM: p_buyer_id - UUID of the buyer

RETURNS: JSON with structure:
{
  "baskets": [
    {
      "basket_id": UUID,
      "seller_id": UUID,
      "seller_name": TEXT,
      "seller_country": TEXT,
      "items": [
        {
          "item_id": UUID,
          "listing_id": UUID,
          "game_name": TEXT,
          "bgg_game_id": INTEGER,
          "price": NUMERIC,
          "condition": TEXT,
          "photo_urls": TEXT[],
          "expires_at": TIMESTAMPTZ
        }
      ],
      "item_count": INTEGER,
      "subtotal": NUMERIC
    }
  ]
}

LOGIC:
1. Find all baskets for the buyer
2. For each basket, get seller info from user_profiles
3. Join basket_items with listings for item details
4. Aggregate into JSON structure

SECURITY: Caller must be authenticated. Function returns only data for the specified buyer_id.';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION add_to_cart(UUID, UUID) IS
'Add a listing to buyer''s cart with 30-minute reservation.

PARAMS:
- p_buyer_id: UUID of the buyer
- p_listing_id: UUID of the listing to add

RETURNS: JSON with structure:
{
  "success": BOOLEAN,
  "message": TEXT,
  "basket_id": UUID (if success),
  "item_id": UUID (if success)
}

LOGIC:
1. Validate listing exists and is active
2. Check listing is not buyer''s own listing
3. Check listing is not already reserved by another user
4. Enforce max 10 items per seller limit
5. Find or create basket for buyer-seller pair
6. Insert basket_item with 30-minute expiration
7. Update listing.reserved_by and listing.reserved_until

ERROR CONDITIONS:
- listing_not_found: Listing does not exist
- listing_not_active: Listing status is not ''active''
- own_listing: Cannot buy own listing (seller_id = buyer_id)
- already_reserved: Listing reserved by another user (reserved_until > NOW())
- max_items_reached: 10 items maximum per seller basket

RACE CONDITIONS: Uses SELECT FOR UPDATE on listings row to prevent concurrent reservations.

SECURITY: SECURITY DEFINER - runs as function owner. Validates buyer_id matches intent.';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION remove_from_cart(UUID, UUID) IS
'Remove a listing from buyer''s cart and release reservation.

PARAMS:
- p_buyer_id: UUID of the buyer
- p_listing_id: UUID of the listing to remove

RETURNS: JSON with structure:
{
  "success": BOOLEAN,
  "message": TEXT
}

LOGIC:
1. Find basket_item for the buyer/listing combination
2. Delete the basket_item
3. Clear listing.reserved_by and listing.reserved_until
4. Trigger: delete_empty_basket() removes basket if no items remain

ERROR CONDITIONS:
- item_not_found: Listing not in buyer''s cart

SECURITY: SECURITY DEFINER - validates buyer owns the basket item before removal.';

-- ============================================================================
-- MESSAGING FUNCTIONS DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_unread_message_count() IS
'Get total unread message count for authenticated user.

RETURNS: INTEGER - count of unread messages across all conversations

LOGIC:
1. Get auth.uid() for current user
2. Find all conversations where user is buyer or seller
3. For each conversation, get last_read_at from message_read_status
4. Count messages where:
   - created_at > last_read_at (or all if never read)
   - sender_id != current user (don''t count own messages)
   - deleted_at IS NULL (exclude soft-deleted messages)

OPTIMIZATION:
- Uses LEFT JOIN with COALESCE for conversations without read status
- Fallback date ''1970-01-01'' ensures all messages counted for new conversations
- Index on messages(conversation_id, created_at) optimizes the count

SECURITY: SECURITY DEFINER with auth.uid() - returns count only for authenticated user.';

-- ============================================================================
-- UTILITY FUNCTIONS DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION is_staff() IS
'Check if current user has staff/admin privileges.

RETURNS: BOOLEAN - true if user has is_staff = true in user_profiles

USAGE: Call in RLS policies or before admin-only operations:
  IF NOT is_staff() THEN
    RAISE EXCEPTION ''Staff access required'';
  END IF;

SECURITY: STABLE SECURITY DEFINER - safe to use in RLS policies.';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION is_user_blocked(UUID, UUID) IS
'Check if two users have blocked each other.

PARAMS:
- p_user_a: First user UUID
- p_user_b: Second user UUID

RETURNS: BOOLEAN - true if either user has blocked the other

USAGE: Check before allowing messaging or interactions:
  IF is_user_blocked(sender_id, recipient_id) THEN
    RAISE EXCEPTION ''Cannot message blocked user'';
  END IF;

LOGIC: Checks blocked_users table for either direction (a->b or b->a).';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB) IS
'Create an in-app notification for a user.

PARAMS:
- p_user_id: UUID of the user to notify
- p_type: Notification type (outbid, auction_won, wanted_match, etc.)
- p_title: Notification title
- p_body: Notification body text (optional)
- p_data: JSONB with additional context (listing_id, game_name, bid_amount, etc.)

RETURNS: UUID - ID of created notification

VALID TYPES:
- outbid: User was outbid on an auction
- auction_won: User won an auction
- auction_expired: Auction ended with no bids
- second_chance: Second-chance offer on auction
- payment_reminder: Payment deadline approaching
- auction_ending: Auction ending soon (watched)
- wanted_match: New listing matches wanted request

SECURITY: SECURITY DEFINER - can be called from triggers or edge functions.';

-- ============================================================================
-- CRON/SCHEDULED FUNCTIONS DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION cleanup_expired_cart_items() IS
'Cron job: Remove expired cart reservations and release listings.

SCHEDULE: Every 5 minutes via pg_cron

LOGIC:
1. Find all basket_items where expires_at < NOW()
2. Clear listing.reserved_by and listing.reserved_until for each
3. Delete the expired basket_items
4. Trigger delete_empty_basket() cleans up empty baskets

RETURNS: JSON with count of cleaned items

SECURITY: SECURITY DEFINER - runs as service role via cron.';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION cleanup_old_security_audit_logs() IS
'Cron job: Delete security audit logs older than retention period.

SCHEDULE: Weekly (Sunday 3 AM UTC) via pg_cron

RETENTION: 1 year (per PCI DSS 10.2 and GDPR requirements)

LOGIC: DELETE FROM security_audit_log WHERE created_at < NOW() - INTERVAL ''1 year''

SECURITY: SECURITY DEFINER - runs as service role via cron.';

-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION expire_wanted_listings() IS
'Cron job: Mark expired wanted listings as expired.

SCHEDULE: Daily via pg_cron

LOGIC:
1. Find wanted_listings where status = ''active'' AND expires_at < NOW()
2. Update status to ''expired''

SECURITY: SECURITY DEFINER - runs as service role via cron.';
